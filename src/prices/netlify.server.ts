import { getStore } from '@netlify/blobs';

import type { Prices, PriceStore } from './prices.types';
import { createPriceRepository } from './repository.server';

export const getPriceStore = (deploy: QwikCityPlatform['deploy']): PriceStore => {
  const name = deploy?.context === 'production'
    ? 'metal-prices'
    : `metal-prices-preview-${deploy?.id ?? 'local'}`;
  const store = getStore({ name, consistency: 'strong' });
  return {
    read: async (key) => {
      const result = await store.getWithMetadata(key, { type: 'json' });
      if (!result) return null;
      if (!result.etag) throw new Error('Price storage did not return a revision');
      const data: unknown = result.data;
      return { data, etag: result.etag };
    },
    write: async (key, data, etag) => {
      const result = await store.setJSON(key, data, etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag });
      return result.modified && Boolean(result.etag);
    },
  };
};

export const readPublicPrices = async (deploy: QwikCityPlatform['deploy']): Promise<Prices | null> => {
  try {
    return (await createPriceRepository(getPriceStore(deploy)).read()).prices;
  } catch {
    console.error('Price storage read failed');
    return null;
  }
};
