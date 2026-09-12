import { describe, expect, it } from 'vitest';

import { createPasswordHash, createSession, verifyPassword, verifySession } from './auth.server';
import { allowLoginAttempt } from './rate-limit.server';
import { createMemoryStore } from './store.test-utils';

const secret = 'test-session-secret-with-at-least-32-characters';

describe('owner authentication', () => {
  it('verifies a salted password hash and rejects a wrong password', async () => {
    const hash = await createPasswordHash('test-password');
    expect(hash).not.toContain('test-password');
    expect(await verifyPassword('test-password', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
    expect(await verifyPassword('anything', 'broken')).toBe(false);
  });

  it('rejects forged, expired and wrong-purpose session tokens', async () => {
    const token = await createSession(secret, 'session', 1000);
    expect(await verifySession(token, secret, 'session', 1001)).toBe(true);
    expect(await verifySession(`${token}a`, secret, 'session', 1001)).toBe(false);
    expect(await verifySession(token, secret, 'csrf', 1001)).toBe(false);
    expect(await verifySession(token, secret, 'session', 1000 + 8 * 60 * 60 * 1000)).toBe(false);
    expect(await verifySession(token, `${secret}changed`, 'session', 1001)).toBe(false);
  });

  it('limits password attempts across instances and concurrent requests', async () => {
    const store = createMemoryStore();
    const allowed = await Promise.all(Array.from({ length: 12 }, () => allowLoginAttempt(store, 'client-ip', secret, 1000)));
    expect(allowed.filter(Boolean).length).toBeLessThanOrEqual(5);
    expect(await allowLoginAttempt(store, 'client-ip', secret, 1001)).toBe(false);
    expect(await allowLoginAttempt(store, 'another-ip', secret, 1001)).toBe(true);
    expect(await allowLoginAttempt(store, 'client-ip', secret, 1000 + 15 * 60 * 1000)).toBe(true);
  });
});
