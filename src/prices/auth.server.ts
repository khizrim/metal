const encoder = new TextEncoder();
const sessionLifetime = 8 * 60 * 60 * 1000;

const toHex = (value: ArrayBuffer): string =>
  Array.from(new Uint8Array(value), (byte) => byte.toString(16).padStart(2, '0')).join('');

const fromHex = (value: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));

const derivePassword = async (password: string, salt: string): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(salt), iterations: 600000 }, key, 256));
};

export const createPasswordHash = async (password: string): Promise<string> => {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  return `pbkdf2-sha256$600000$${salt}$${await derivePassword(password, salt)}`;
};

export const isPasswordHash = (value: string): boolean =>
  /^pbkdf2-sha256\$600000\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(value);

export const sign = async (value: string, secret: string): Promise<string> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
};

export const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  if (!isPasswordHash(encoded) || password.length > 256) return false;
  const parts = encoded.split('$');
  const salt = parts[2];
  const expected = parts[3];
  if (!salt || !expected) return false;
  const actual = await derivePassword(password, salt);
  let difference = 0;
  for (let index = 0; index < expected.length; index++) difference |= expected.charCodeAt(index) ^ actual.charCodeAt(index);
  return difference === 0;
};

export const createSession = async (secret: string, purpose: string, now = Date.now()): Promise<string> => {
  const payload = `${now + sessionLifetime}.${crypto.randomUUID()}`;
  return `${payload}.${await sign(`${purpose}:${payload}`, secret)}`;
};

export const verifySession = async (token: string, secret: string, purpose: string, now = Date.now()): Promise<boolean> => {
  const match = /^(\d{1,15})\.([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const [, expires, nonce, signature] = match;
  if (!expires || !nonce || !signature || Number(expires) <= now || Number(expires) > now + sessionLifetime) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  return crypto.subtle.verify('HMAC', key, fromHex(signature), encoder.encode(`${purpose}:${expires}.${nonce}`));
};
