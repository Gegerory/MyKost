import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { rooms, bookings, complaints } from '../../db/schema.js';
import { currentUser, sameOrigin } from '../../server/session.js';
import { json } from '../../server/access.js';
const roomIds = ['r101','r102','r201','r202','r301','r302'];
const categories = ['Electricity','AC','Insects/Pests','Furniture','Laundry','Leak','Wall Paint','Wi-Fi','Pipes','Other'];
const states = ['Available','Reserved','Occupied','Maintenance'];
const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export default async (req: Request) => {
 try {
 const user = await currentUser(req); const manager = user?.role === 'Manager' || user?.role === 'SuperAdmin';
 if (req.method === 'GET') {
 const roomRows = await db.select().from(rooms);
 const bs = user ? await db.select().from(bookings).where(manager ? undefined : eq(bookings.userId, user.id)) : [];
 const cs = user ? await db.select().from(complaints).where(manager ? undefined : eq(complaints.userId, user.id)) : [];
 return json({ rooms: roomRows, bookings: bs.map(b => ({ ...b.details, id: b.id, status: b.status, submittedAt: b.createdAt.toISOString() })), complaints: cs.map(c => ({ ...c.details, id: c.id, userId: c.userId, status: c.status, createdAt: c.createdAt.toISOString() })) });
 }
 if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
 if (!sameOrigin(req)) return json({ error: 'Invalid request origin.' }, 403);
 if (!user) return json({ error: 'Sign in to MyKost first.' }, 401);
 const raw = await req.text(); if (raw.length > 8192) return json({ error: 'Form is too large.' }, 413);
 let data; try { data = JSON.parse(raw); } catch { return json({ error: 'Invalid form.' }, 400); }
 if (!data || typeof data !== 'object') return json({ error: 'Invalid form.' }, 400);
 if (data.action === 'booking') {
 if (!roomIds.includes(data.roomId) || !text(data.name,80) || !text(data.phone,30) || !text(data.email,254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !/^\d{4}-\d{2}-\d{2}$/.test(data.moveIn) || data.moveIn <= new Date().toISOString().slice(0,10) || !Number.isFinite(Date.parse(data.moveIn)) || data.rulesAccepted !== true) return json({ error: 'Complete the booking form and accept the rules.' }, 400);
 const [room] = await db.select().from(rooms).where(eq(rooms.id,data.roomId));
 if (room && room.status !== 'Available') return json({ error: 'Room is no longer available.' },409);
 await db.insert(bookings).values({ id: randomUUID(), userId: user.id, roomId: data.roomId, details: { roomId:data.roomId, roomNo:data.roomId.slice(1), name:data.name.trim(), email:data.email.trim(), phone:data.phone.trim(), moveIn:data.moveIn, rulesVersion:1, rulesAcceptedAt:new Date().toISOString() } });
 } else if (data.action === 'complaint') {
 if (!categories.includes(data.category) || typeof data.description !== 'string' || data.description.length > 500 || (data.roomNo && !roomIds.includes('r'+data.roomNo))) return json({error:'Invalid complaint.'},400);
 await db.insert(complaints).values({ id:randomUUID(), userId:user.id, details:{category:data.category,roomNo:data.roomNo || '',description:data.description.trim(),name:user.name} });
 } else {
 if (!manager) return json({ error: 'Manager access required.' },403);
 if (data.action === 'room') {
 if (!roomIds.includes(data.id) || !['Available','Maintenance'].includes(data.status)) return json({error:'Choose Available or Maintenance.'},400);
 const [updated] = await db.insert(rooms).values({id:data.id,status:data.status}).onConflictDoUpdate({ target:rooms.id, set:{status:data.status}, setWhere:sql`${rooms.status} IN ('Available', 'Maintenance')` }).returning();
 if (!updated) return json({error:'A reserved or occupied room cannot be changed here.'},409);
 } else if (data.action === 'approve') {
 // The room claim is a conditional atomic write: only one concurrent approval succeeds.
 const approved = await db.transaction(async tx => {
 const [booking] = await tx.select().from(bookings).where(and(eq(bookings.id,data.id),eq(bookings.status,'Pending'))).for('update');
 if (!booking) return false;
 const [claimed] = await tx.insert(rooms).values({id:booking.roomId,status:'Reserved'}).onConflictDoUpdate({target:rooms.id,set:{status:'Reserved'},setWhere:eq(rooms.status,'Available')}).returning();
 if (!claimed) return false;
 await tx.update(bookings).set({ status:'Approved', details:{...booking.details, approvedAt:new Date().toISOString(),deadline:new Date(Date.now()+864e5).toISOString()} }).where(eq(bookings.id,booking.id));
 return true;
 });
 if (!approved) return json({error:'Booking is no longer pending or the room is unavailable.'},409);
 } else if (data.action === 'reject') {
 if (!text(data.reason,500)) return json({error:'A rejection reason is required.'},400);
 const result = await db.update(bookings).set({status:'Rejected', details:sql`${bookings.details} || ${JSON.stringify({reason:data.reason.trim()})}::jsonb`}).where(and(eq(bookings.id,data.id),eq(bookings.status,'Pending'))).returning();
 if (!result.length) return json({error:'Booking is no longer pending.'},409);
 } else if (data.action === 'complaintStatus') {
 if (!['Pending','InProgress','Resolved'].includes(data.status)) return json({error:'Invalid status.'},400);
 await db.update(complaints).set({status:data.status}).where(eq(complaints.id,data.id));
 } else return json({error:'Unknown action.'},400);
 }
 return json({ok:true});
 } catch { return json({ error: 'Data service is unavailable. Please try again shortly.' },503); }
};
export const config = { path: '/api/catalog' };
