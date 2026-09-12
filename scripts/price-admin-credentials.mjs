import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = randomBytes(18).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = pbkdf2Sync(password, Buffer.from(salt, 'hex'), 600000, 32, 'sha256').toString('hex');

console.log('Set these server-only values in Netlify for the intended deploy context. Do not commit them.');
console.log(`PRICE_ADMIN_PATH=/control-${randomBytes(16).toString('hex')}`);
console.log(`PRICE_ADMIN_PASSWORD_HASH=pbkdf2-sha256$600000$${salt}$${hash}`);
console.log(`PRICE_ADMIN_SESSION_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`\nOwner password (save in a password manager): ${password}`);
