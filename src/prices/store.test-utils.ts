import type { PriceStore, StoredValue } from './prices.types';

export const createMemoryStore = (): PriceStore => {
  const records = new Map<string, StoredValue>();
  return {
    read: async (key) => structuredClone(records.get(key) ?? null),
    write: async (key, data, etag) => {
      if ((records.get(key)?.etag ?? null) !== etag) return false;
      records.set(key, { data: structuredClone(data), etag: crypto.randomUUID() });
      return true;
    },
  };
};
