import { metalIds } from './catalog';
import type { PriceDocument, Prices, Result } from './prices.types';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPrices = (value: unknown): value is Prices => {
  if (!isRecord(value) || Object.keys(value).length !== metalIds.length) return false;
  return metalIds.every((id) => {
    const price = value[id];
    return typeof price === 'number' && Number.isFinite(price) && price > 0 &&
      price <= 1000000 && Math.abs(price * 100 - Math.round(price * 100)) < 0.000001;
  });
};

export const parsePrices = (value: unknown): Result<Prices> =>
  isPrices(value)
    ? { ok: true, value }
    : { ok: false, message: 'Заполните все цены: от 0,01 до 1 000 000 ₽, не больше двух знаков после запятой.' };

export const isPriceDocument = (value: unknown): value is PriceDocument =>
  isRecord(value) && isPrices(value.prices) &&
  (value.previous === null || isPrices(value.previous)) &&
  typeof value.version === 'string' && value.version.length > 0 &&
  (value.updatedAt === null || (typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt))));
