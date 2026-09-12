import { isDev } from '@builder.io/qwik';
import type { RequestHandler } from '@builder.io/qwik-city';

import { handleAdminRequest } from '~/prices/admin.server';
import { getPriceStore } from '~/prices/netlify.server';

export const onRequest: RequestHandler = async (event) => {
  const path = event.env.get('PRICE_ADMIN_PATH') ?? '';
  if (!path || event.url.pathname.replace(/\/$/, '') !== path) {
    event.headers.set('Cache-Control', 'no-store');
    event.headers.set('X-Robots-Tag', 'noindex, nofollow');
    event.send(404, 'Страница не найдена');
    return;
  }
  try {
    const response = await handleAdminRequest(event.request, {
      config: {
        path,
        passwordHash: event.env.get('PRICE_ADMIN_PASSWORD_HASH') ?? '',
        sessionSecret: event.env.get('PRICE_ADMIN_SESSION_SECRET') ?? '',
        secureCookies: !isDev,
      },
      store: getPriceStore(event.platform.deploy),
      ip: event.platform.ip ?? event.clientConn.ip ?? 'unknown',
    });
    for (const name of ['Cache-Control', 'CDN-Cache-Control', 'Netlify-CDN-Cache-Control', 'X-Robots-Tag', 'Referrer-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Content-Security-Policy', 'Content-Type', 'Location']) event.headers.delete(name);
    event.send(response);
  } catch {
    event.headers.set('Cache-Control', 'no-store');
    event.headers.set('X-Robots-Tag', 'noindex, nofollow');
    event.send(503, 'Кабинет временно недоступен. Попробуйте позже.');
  }
};
