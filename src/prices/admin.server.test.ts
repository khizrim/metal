import { beforeAll, describe, expect, it, vi } from 'vitest';

import { handleAdminRequest } from './admin.server';
import type { AdminConfig } from './admin.types';
import { createPasswordHash } from './auth.server';
import { initialPrices } from './initial-prices.server';
import { createPriceRepository } from './repository.server';
import { createMemoryStore } from './store.test-utils';

const path = '/control-test-123456789abcdef';
const origin = 'https://example.test';
let config: AdminConfig;

beforeAll(async () => {
  config = { path, passwordHash: await createPasswordHash('test-owner-password'), sessionSecret: 'secure-test-secret-with-more-than-32-characters', secureCookies: true };
});

const createBrowser = () => {
  const cookies = new Map<string, string>();
  const store = createMemoryStore();
  const request = async (fields?: Record<string, string>, overrides: RequestInit = {}, requestPath = path) => {
    const headers = new Headers(overrides.headers);
    headers.set('Cookie', Array.from(cookies, ([key, value]) => `${key}=${value}`).join('; '));
    if (fields && !headers.has('Origin')) headers.set('Origin', origin);
    const response = await handleAdminRequest(new Request(`${origin}${requestPath}`, {
      method: fields ? 'POST' : 'GET', ...overrides, headers,
      body: fields ? headers.get('Content-Type')?.startsWith('application/json') ? JSON.stringify(fields) : new URLSearchParams(fields) : undefined,
    }), { config, store, ip: 'test-ip' });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0] ?? '';
      const separator = pair.indexOf('=');
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
  const csrf = () => cookies.get('__Host-skuprum-csrf') ?? '';
  const login = async () => {
    await request();
    return request({ action: 'login', password: 'test-owner-password', csrf: csrf() });
  };
  const priceFields = async () => ({
    ...Object.fromEntries(Object.entries(initialPrices).map(([key, value]) => [key, String(value)])),
    action: 'save', csrf: csrf(), version: (await createPriceRepository(store).read()).version,
  });
  return { request, csrf, login, priceFields, store };
};

describe('owner cabinet HTTP flow', () => {
  it('hides the editor before login and disables indexing, caching and framing', async () => {
    const browser = createBrowser();
    const response = await browser.request();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('no-store');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    const html = await response.text();
    expect(html).toContain('autocomplete="current-password"');
    expect(html).not.toContain('name="copper"');
    expect(await browser.store.read('current')).toBeNull();
    expect((await browser.request(undefined, {}, '/prices-admin')).status).toBe(404);
  });

  it('publishes prices only after login, preserves decimals and supports logout', async () => {
    const browser = createBrowser();
    const login = await browser.login();
    expect(login.status).toBe(303);
    expect(login.headers.get('Set-Cookie')).toContain('Secure');
    const page = await browser.request();
    expect(await page.text()).toContain('name="copper"');
    const response = await browser.request({ ...await browser.priceFields(), copper: '1500', can: '99,50' });
    expect(response.status).toBe(303);
    const document = await createPriceRepository(browser.store).read();
    expect(document.prices.copper).toBe(1500);
    expect(document.prices.can).toBe(99.5);
    expect(document.previous).toEqual(initialPrices);
    await browser.request({ action: 'logout', csrf: browser.csrf() });
    expect(await (await browser.request()).text()).not.toContain('name="copper"');
  });

  it('rejects unauthenticated writes, missing CSRF and foreign origins', async () => {
    const browser = createBrowser();
    await browser.request();
    expect((await browser.request(await browser.priceFields())).status).toBe(401);
    await browser.login();
    const fields = await browser.priceFields();
    expect((await browser.request({ ...fields, csrf: '' })).status).toBe(403);
    expect((await browser.request(fields, { headers: { Origin: 'https://attacker.test' } })).status).toBe(403);
    expect((await browser.request(fields, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await createPriceRepository(browser.store).read()).prices).toEqual(initialPrices);
  });

  it('accepts an opaque origin only with a valid signed CSRF token', async () => {
    const browser = createBrowser();
    await browser.login();
    const fields = await browser.priceFields();
    const response = await browser.request(fields, { headers: { Origin: 'null', 'Content-Type': 'application/json' } });
    expect(response.status).toBe(303);
    expect((await createPriceRepository(browser.store).read()).prices.copper).toBe(999);
    expect((await browser.request({ ...fields, csrf: '' }, { headers: { Origin: 'null', 'Content-Type': 'application/json' } })).status).toBe(403);
  });

  it('keeps invalid input visible, escapes HTML and requires confirmation for restore', async () => {
    const browser = createBrowser();
    await browser.login();
    const fields = await browser.priceFields();
    const invalid = await browser.request({ ...fields, copper: '"><script>alert(1)</script>' });
    const html = await invalid.text();
    expect(invalid.status).toBe(409);
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    await browser.request({ ...fields, copper: '1500' });
    const document = await createPriceRepository(browser.store).read();
    const confirm = await browser.request({ action: 'confirm-restore', csrf: browser.csrf(), version: document.version });
    expect(await confirm.text()).toContain('Да, вернуть цены');
    expect((await createPriceRepository(browser.store).read()).prices.copper).toBe(1500);
    await browser.request({ action: 'restore', csrf: browser.csrf(), version: document.version });
    expect((await createPriceRepository(browser.store).read()).prices).toEqual(initialPrices);
  });

  it('fails closed when secrets are missing or the request is oversized', async () => {
    const response = await handleAdminRequest(new Request(`${origin}${path}`), {
      config: { ...config, sessionSecret: '' }, store: createMemoryStore(), ip: 'test',
    });
    expect(response.status).toBe(404);
    const browser = createBrowser();
    await browser.login();
    expect((await browser.request({ ...await browser.priceFields(), copper: '1'.repeat(9000) })).status).toBe(400);
  });

  it('preserves the draft and revision when storage fails during save', async () => {
    const browser = createBrowser();
    await browser.login();
    const fields = await browser.priceFields();
    vi.spyOn(browser.store, 'write').mockRejectedValueOnce(new Error('Storage unavailable'));
    const response = await browser.request({ ...fields, copper: '1500' });
    expect(response.status).toBe(503);
    const html = await response.text();
    expect(html).toContain('value=\"1500\"');
    expect(html).toContain(`value=\"${fields.version}\"`);
    expect(html).toContain('Изменения не подтверждены');
    expect((await createPriceRepository(browser.store).read()).prices.copper).toBe(999);
  });
});
