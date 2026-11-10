import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export function validRegistration(data: Record<string, unknown>) {
 return typeof data.username === 'string' && /^[a-z0-9_]{3,32}$/.test(normalizeUsername(data.username)) &&
 typeof data.password === 'string' && data.password.length >= 12 && data.password.length <= 128 &&
 typeof data.name === 'string' && data.name.trim().length > 0 && data.name.length <= 80 &&
 typeof data.email === 'string' && data.email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
 typeof data.phone === 'string' && data.phone.trim().length >= 5 && data.phone.length <= 30 && ['Tenant', 'Manager'].includes(String(data.role));
}
export async function hashPassword(password: string) {
 const salt = randomBytes(16).toString('hex');
 const key = await derive(password, salt, 64) as Buffer;
 return `${salt}:${key.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
 const [salt, hex] = stored.split(':');
 const key = await derive(password, salt, 64) as Buffer;
 const expected = Buffer.from(hex, 'hex');
 return expected.length === key.length && timingSafeEqual(key, expected);
}
