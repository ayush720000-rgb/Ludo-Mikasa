import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  validateTelegramInitData,
  createTelegramSessionToken,
  validateTelegramSessionToken,
} from '../server/telegramAuth';

const TOKEN = '123456:TEST_TOKEN_abcdefghijklmnopqrstuvwxyz';

function signInitData(fields: Record<string, string>, token = TOKEN): string {
  const params = new URLSearchParams(fields);
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

const fresh = () => Math.floor(Date.now() / 1000) - 30;
const user = (id = 7) => JSON.stringify({ id, first_name: 'Lia' });

test('accepts correctly signed initData and returns the user', () => {
  const result = validateTelegramInitData(signInitData({ auth_date: String(fresh()), user: user() }), TOKEN);
  assert.equal(result.valid, true);
  assert.equal(result.user?.id, 7);
});

test('rejects initData signed with a different token', () => {
  const result = validateTelegramInitData(signInitData({ auth_date: String(fresh()), user: user() }, 'x:yyyyyyyyyyyyyyyyyyyyyyyyy'), TOKEN);
  assert.equal(result.valid, false);
});

test('rejects tampered initData', () => {
  const signed = signInitData({ auth_date: String(fresh()), user: user(7) });
  assert.equal(validateTelegramInitData(signed.replace('id%22%3A7', 'id%22%3A8'), TOKEN).valid, false);
});

test('rejects empty initData', () => {
  assert.equal(validateTelegramInitData('', TOKEN).valid, false);
});

test('session tokens round-trip for the right user and fail for a wrong token', () => {
  const session = createTelegramSessionToken(99, TOKEN);
  assert.deepEqual(validateTelegramSessionToken(session, TOKEN), { valid: true, userId: 99 });
  assert.equal(validateTelegramSessionToken(session, 'other:token_zzzzzzzzzzzzzzzzzzzzzzzz').valid, false);
});

test('expired session tokens are rejected', () => {
  const expired = createTelegramSessionToken(5, TOKEN, -10);
  assert.equal(validateTelegramSessionToken(expired, TOKEN).valid, false);
});
