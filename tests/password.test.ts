import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, normalizeUsername, validRegistration, digest } from '../server/password.ts';
import { cookie, sameOrigin } from '../server/session.ts';
test('password hashes use unique salts and reject the wrong password', async () => {
 const original = 'test-only-passphrase';
 const first = await hashPassword(original); const second = await hashPassword(original);
 assert.notEqual(first, second); assert.ok(!first.includes(original));
 assert.equal(await verifyPassword(original, first), true);
 assert.equal(await verifyPassword('incorrect', first), false);
});
test('registration permits tenants and direct managers, rejects elevated roles and invalid fields', () => {
 const base = { username: 'new_user', password: 'test-only-passphrase', name: 'Test User', email: 'test@example.test', phone: '08123456', role: 'Tenant' };
 assert.ok(validRegistration(base)); assert.ok(validRegistration({...base,role:'Manager'}));
 for (const extra of [{role:'SuperAdmin'},{password:'short'},{username:'bad space'},{email:'invalid'},{name:''},{phone:''}]) assert.equal(validRegistration({...base,...extra}),false);
 assert.equal(normalizeUsername('  New_USER '),'new_user');
});
test('session cookies are private and mutations require same origin', () => {
 const req = new Request('https://example.test/api/auth/login', {headers:{origin:'https://example.test'}});
 assert.ok(sameOrigin(req)); assert.equal(sameOrigin(new Request(req,{headers:{origin:'https://elsewhere.test'}})),false);
 const header = cookie(req,'test-only-token',100);
 for (const value of ['HttpOnly','Secure','SameSite=Lax','Path=/','Max-Age=100']) assert.ok(header.includes(value));
 assert.equal(digest('test-only-token').length,64);
});
