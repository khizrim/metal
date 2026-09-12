import { initialPrices } from './initial-prices.server';
import { isPriceDocument, parsePrices } from './prices';
import type { PriceDocument, PriceRepository, PriceStore, Prices, Result } from './prices.types';

const conflict = (): Result<PriceDocument> => ({ ok: false, message: 'Цены уже изменились в другом окне. Обновите страницу и повторите изменение.' });

export const createPriceRepository = (store: PriceStore): PriceRepository => {
  const load = async () => {
    let record = await store.read('current');
    if (record === null) {
      await store.write('current', {
        prices: initialPrices, previous: null, updatedAt: null, version: crypto.randomUUID(),
      }, null);
      record = await store.read('current');
    }
    if (!record || !isPriceDocument(record.data)) throw new Error('Price storage is unavailable or invalid');
    return { document: record.data, etag: record.etag };
  };

  const update = async (prices: Prices | null, version: string): Promise<Result<PriceDocument>> => {
    const { document, etag } = await load();
    if (document.version !== version) return conflict();
    const nextPrices = prices ?? document.previous;
    if (!nextPrices) return { ok: false, message: 'Предыдущих цен пока нет.' };
    const next: PriceDocument = {
      prices: nextPrices, previous: document.prices,
      updatedAt: new Date().toISOString(), version: crypto.randomUUID(),
    };
    if (!await store.write('current', next, etag)) return conflict();
    return { ok: true, value: next };
  };

  return {
    read: async () => (await load()).document,
    save: async (input, version) => {
      const result = parsePrices(input);
      return result.ok ? update(result.value, version) : result;
    },
    restore: async (version) => update(null, version),
  };
};
