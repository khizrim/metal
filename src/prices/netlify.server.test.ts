import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPriceStore } from './netlify.server';
import { createPriceRepository } from './repository.server';

const records = new Map<string, { body: string; etag: string }>();

beforeEach(() => {
  records.clear();
  vi.stubEnv('NETLIFY_BLOBS_CONTEXT', Buffer.from(JSON.stringify({
    siteID: 'test-site', token: 'test-token', edgeURL: 'https://blobs.test', uncachedEdgeURL: 'https://blobs.test',
  })).toString('base64'));
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const body = request.method === 'PUT' ? await request.text() : '';
    const current = records.get(request.url);
    if (request.method === 'GET') return current
      ? new Response(current.body, { headers: { etag: current.etag } })
      : new Response(null, { status: 404 });
    if (request.method !== 'PUT') return new Response(null, { status: 405 });
    if ((request.headers.get('if-none-match') === '*' && current) ||
      (request.headers.has('if-match') && request.headers.get('if-match') !== current?.etag)) {
      return new Response(null, { status: 412 });
    }
    const etag = `\"${crypto.randomUUID()}\"`;
    records.set(request.url, { body, etag });
    return new Response(null, { headers: { etag } });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('Netlify SDK with a simulated HTTP transport', () => {
  it('initializes and publishes using conditional writes', async () => {
    const repository = createPriceRepository(getPriceStore(undefined));
    const document = await repository.read();
    expect(document.prices.copper).toBe(999);
    expect((await repository.save({ ...document.prices, copper: 1500 }, document.version)).ok).toBe(true);
    expect((await createPriceRepository(getPriceStore(undefined)).read()).prices.copper).toBe(1500);
    const [first, second] = await Promise.all([getPriceStore(undefined).read('current'), getPriceStore(undefined).read('current')]);
    if (!first || !second) throw new Error('Expected initialized prices');
    expect(await getPriceStore(undefined).write('current', first.data, first.etag)).toBe(true);
    expect(await getPriceStore(undefined).write('current', second.data, second.etag)).toBe(false);
  });

  it('separates preview prices from production prices', async () => {
    const production = createPriceRepository(getPriceStore({ context: 'production', published: true }));
    const preview = createPriceRepository(getPriceStore({ context: 'deploy-preview', id: 'preview-test', published: false }));
    const document = await preview.read();
    await preview.save({ ...document.prices, copper: 100 }, document.version);
    expect((await production.read()).prices.copper).toBe(999);
  });

  it('fails closed if the storage response omits its revision', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ prices: {} })));
    await expect(getPriceStore(undefined).read('current')).rejects.toThrow('did not return a revision');
  });

  it('does not report a failed conditional write as successful', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 500 })));
    await expect(getPriceStore(undefined).write('current', {}, 'revision')).resolves.toBe(false);
  });
});
