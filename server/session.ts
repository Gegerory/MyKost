import { randomBytes } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, sessions, authLimits } from '../db/schema.js';
import { digest } from './password.js';
export function sameOrigin(req: Request) { return req.headers.get('origin') === new URL(req.url).origin; }
export function sessionHash(req: Request) {
 const token = req.headers.get('cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith('mykost_session='))?.slice(15);
 return token ? digest(token) : '';
}
export async function currentUser(req: Request) {
 if (!sessionHash(req)) return null;
 const [record] = await db.select({ id: accounts.id, name: accounts.name, email: accounts.email, username: accounts.username, role: accounts.role })
 .from(sessions).innerJoin(accounts, eq(sessions.userId, accounts.id))
 .where(and(eq(sessions.hash, sessionHash(req)), gt(sessions.expiresAt, new Date()), eq(accounts.active, true))).limit(1);
 return record ? { ...record, roles: [record.role] } : null;
}
export async function startSession(req: Request, userId: string) {
 const token = randomBytes(32).toString('hex');
 await db.insert(sessions).values({ hash: digest(token), userId, expiresAt: new Date(Date.now() + 7 * 864e5) });
 return cookie(req, token, 7 * 86400);
}
export function cookie(req: Request, token: string, age: number) {
 return `mykost_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function rateAllowed(key: string) {
 const now = new Date();
 const [limit] = await db.insert(authLimits).values({ key: digest(key), count: 1, resetAt: new Date(Date.now() + 15 * 60e3) })
 .onConflictDoUpdate({ target: authLimits.key, set: {
 count: sql`CASE WHEN ${authLimits.resetAt} < ${now} THEN 1 ELSE ${authLimits.count} + 1 END`,
 resetAt: sql`CASE WHEN ${authLimits.resetAt} < ${now} THEN ${new Date(Date.now() + 15 * 60e3)} ELSE ${authLimits.resetAt} END`,
 } }).returning();
 return limit.count <= 20;
}
