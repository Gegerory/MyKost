import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Context } from '@netlify/functions';
import auth from '../netlify/functions/auth.mts';
import me from '../netlify/functions/me.mts';
import dashboard from '../netlify/functions/dashboard.mts';
const context = {} as Context;
test('session endpoint returns no account without a session cookie', async () => {
 const result = await auth(new Request('https://example.test/api/auth/session'),context);
 assert.equal(result.status,200); assert.deepEqual(await result.json(),{user:null});
});
test('cross-origin login and registration are rejected before database access', async () => {
 for (const action of ['login','register','logout']) {
 const response = await auth(new Request('https://example.test/api/auth/'+action,{method:'POST',headers:{origin:'https://elsewhere.test'}}),context);
 assert.equal(response.status,403);
 }
});
test('private manager routes reject visitors without a session', async () => {
 for (const handler of [me,dashboard]) assert.equal((await handler(new Request('https://example.test/api/me'))).status,401);
});
