import { describe, expect, it } from 'vitest';

import { initialPrices } from './initial-prices.server';
import { parsePrices } from './prices';
import { createPriceRepository } from './repository.server';
import { createMemoryStore } from './store.test-utils';

describe('price validation', () => {
  it('accepts the complete approved price list, including decimals', () => {
    expect(parsePrices(initialPrices)).toEqual({ ok: true, value: initialPrices });
    expect(initialPrices.copper).toBe(999);
    expect(initialPrices.tungsten).toBe(8888);
  });

  it.each([null, [], {}, { ...initialPrices, extra: 1 }, { ...initialPrices, copper: '999' },
    { ...initialPrices, copper: -1 }, { ...initialPrices, copper: Infinity },
    { ...initialPrices, copper: 0 }, { ...initialPrices, copper: 1.234 },
    { ...initialPrices, copper: 1000001 }])('rejects incomplete or invalid prices: %j', (input) => {
    expect(parsePrices(input).ok).toBe(false);
  });
});

describe('persistent prices', () => {
  it('initializes once and keeps published prices across repository instances', async () => {
    const store = createMemoryStore();
    const repository = createPriceRepository(store);
    const before = await repository.read();
    const result = await repository.save({ ...initialPrices, copper: 1234 }, before.version);
    expect(result.ok).toBe(true);
    expect((await createPriceRepository(store).read()).prices.copper).toBe(1234);
  });

  it('restores the previous list in one write', async () => {
    const repository = createPriceRepository(createMemoryStore());
    const before = await repository.read();
    await repository.save({ ...initialPrices, copper: 1234 }, before.version);
    const current = await repository.read();
    expect(current.previous).toEqual(initialPrices);
    expect((await repository.restore(current.version)).ok).toBe(true);
    expect((await repository.read()).prices).toEqual(initialPrices);
  });

  it('does not overwrite a newer price list from a stale form or a concurrent request', async () => {
    const repository = createPriceRepository(createMemoryStore());
    const before = await repository.read();
    const results = await Promise.all([
      repository.save({ ...initialPrices, copper: 1234 }, before.version),
      repository.save({ ...initialPrices, copper: 2000 }, before.version),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toHaveLength(1);
    expect((await repository.save(initialPrices, before.version)).ok).toBe(false);
  });

  it('rejects invalid writes and does not reset corrupt data to defaults', async () => {
    const store = createMemoryStore();
    const repository = createPriceRepository(store);
    const before = await repository.read();
    expect((await repository.save({}, before.version)).ok).toBe(false);
    const stored = await store.read('current');
    await store.write('current', { broken: true }, stored?.etag ?? null);
    await expect(repository.read()).rejects.toThrow();
  });
});
