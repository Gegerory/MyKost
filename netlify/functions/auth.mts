import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import type { Context } from '@netlify/functions';
import { db } from '../../db/index.js';
import { accounts, sessions } from '../../db/schema.js';
import { json } from '../../server/access.js';
import { cookie, currentUser, rateAllowed, sameOrigin, sessionHash, startSession } from '../../server/session.js';
import { hashPassword, normalizeUsername, validRegistration, verifyPassword } from '../../server/password.js';
export default async (req: Request, context: Context) => {
 try {
 const action = new URL(req.url).pathname.split('/').pop();
 if (req.method === 'GET' && action === 'session') return json({ user: await currentUser(req) });
 if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
 if (!sameOrigin(req)) return json({ error: 'Invalid request origin.' }, 403);
 if (action === 'logout') {
 await db.delete(sessions).where(eq(sessions.hash, sessionHash(req)));
 const response = json({ ok: true }); response.headers.set('Set-Cookie', cookie(req, '', 0)); return response;
 }
 if (!['login', 'register'].includes(action ?? '')) return json({ error: 'Not found.' }, 404);
 if (!await rateAllowed(`ip:${context.ip ?? 'unknown'}`)) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
 const raw = await req.text(); if (raw.length > 4096) return json({ error: 'Form is too large.' }, 413);
 let data; try { data = JSON.parse(raw); } catch { return json({ error: 'Invalid form.' }, 400); }
 if (!data || typeof data.username !== 'string' || typeof data.password !== 'string' || data.password.length > 128) return json({ error: 'Enter a valid username and password.' }, 400);
 const username = normalizeUsername(data.username);
 if (!await rateAllowed(`username:${username}`)) return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
 let account;
 if (action === 'register') {
 if (!validRegistration(data)) return json({ error: 'Complete all fields. Use a username of 3–32 letters, numbers or underscores and a password of 12–128 characters.' }, 400);
 const [created] = await db.insert(accounts).values({ id: randomUUID(), username, passwordHash: await hashPassword(data.password), name: data.name.trim(), email: data.email.trim(), phone: data.phone.trim(), role: data.role }).onConflictDoNothing({ target: accounts.username }).returning({ id: accounts.id });
 if (!created) return json({ error: 'This username is already taken.' }, 409);
 account = created;
 } else {
 const [found] = await db.select().from(accounts).where(eq(accounts.username, username)).limit(1);
 // Derive a hash even for an unknown username to avoid a fast account-existence signal.
 const stored = found?.passwordHash ?? '00000000000000000000000000000000:' + '00'.repeat(64);
 const valid = await verifyPassword(data.password, stored);
 if (!found || !valid || !found.active) return json({ error: 'Username or password is incorrect.' }, 401);
 account = found;
 }
 const response = json({ ok: true }, action === 'register' ? 201 : 200);
 response.headers.set('Set-Cookie', await startSession(req, account.id)); return response;
 } catch { return json({ error: 'Account service is unavailable. Please try again shortly.' }, 503); }
};
export const config = { path: '/api/auth/:action' };
