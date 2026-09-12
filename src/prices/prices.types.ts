import type { metals } from './catalog';

export type MetalId = keyof typeof metals;
export type Prices = Record<MetalId, number>;
export type PriceDocument = {
  prices: Prices;
  previous: Prices | null;
  updatedAt: string | null;
  version: string;
};
export type Result<Value> = { ok: true; value: Value } | { ok: false; message: string };
export type StoredValue = { data: unknown; etag: string };
export type PriceStore = {
  read: (key: string) => Promise<StoredValue | null>;
  write: (key: string, data: unknown, etag: string | null) => Promise<boolean>;
};
export type PriceRepository = {
  read: () => Promise<PriceDocument>;
  save: (input: unknown, version: string) => Promise<Result<PriceDocument>>;
  restore: (version: string) => Promise<Result<PriceDocument>>;
};
