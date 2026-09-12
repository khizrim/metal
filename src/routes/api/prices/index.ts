import type { RequestHandler } from '@builder.io/qwik-city';

import { readPublicPrices } from '~/prices/netlify.server';

export const onGet: RequestHandler = async (event) => {
  event.headers.set('Cache-Control', 'no-store');
  event.headers.set('CDN-Cache-Control', 'no-store');
  event.headers.set('Netlify-CDN-Cache-Control', 'no-store');
  const prices = await readPublicPrices(event.platform.deploy);
  event.json(prices ? 200 : 503, prices ? { prices } : { error: 'Цены временно недоступны' });
};
