import { sign } from './auth.server';
import { isRecord } from './prices';
import type { PriceStore } from './prices.types';

export const allowLoginAttempt = async (store: PriceStore, ip: string, secret: string, now = Date.now()): Promise<boolean> => {
  const key = `login/${await sign(ip, secret)}`;
  for (let retry = 0; retry < 8; retry++) {
    const record = await store.read(key);
    const value = record?.data;
    const active = isRecord(value) && typeof value.until === 'number' && typeof value.count === 'number' && value.until > now;
    const count = active ? value.count : 0;
    const until = active ? value.until : now + 15 * 60 * 1000;
    if (typeof count !== 'number' || count >= 5) return false;
    if (await store.write(key, { count: count + 1, until }, record?.etag ?? null)) return true;
  }
  return false;
};
