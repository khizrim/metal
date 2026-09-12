import { renderAdminPage } from './admin-page.server';
import type { AdminDependencies, AdminPage } from './admin.types';
import { createSession, isPasswordHash, verifyPassword, verifySession } from './auth.server';
import { metalIds } from './catalog';
import { isRecord } from './prices';
import { allowLoginAttempt } from './rate-limit.server';
import { createPriceRepository } from './repository.server';
import type { PriceDocument } from './prices.types';

const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

const readForm = async (request: Request): Promise<URLSearchParams | null> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('application/x-www-form-urlencoded') && !contentType.startsWith('application/json')) return null;
  if (Number(request.headers.get('content-length')) > 8192) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let text = '';
  let size = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > 8192) { await reader.cancel(); return null; }
    text += decoder.decode(chunk.value, { stream: true });
  }
  text += decoder.decode();
  if (contentType.startsWith('application/json')) {
    try {
      const value: unknown = JSON.parse(text);
      if (!isRecord(value)) return null;
      const form = new URLSearchParams();
      for (const [key, entry] of Object.entries(value)) {
        if (typeof entry !== 'string') return null;
        form.append(key, entry);
      }
      return form;
    } catch {
      return null;
    }
  }
  const form = new URLSearchParams(text);
  if (Array.from(form.keys()).some((key) => form.getAll(key).length !== 1)) return null;
  return form;
};

export const handleAdminRequest = async (request: Request, dependencies: AdminDependencies): Promise<Response> => {
  const { config, store, ip } = dependencies;
  const url = new URL(request.url);
  const headers = new Headers(privateHeaders);
  const text = (message: string, status: number) => new Response(message, { status, headers });
  if (!/^\/[a-z0-9-]{24,100}$/.test(config.path) || url.pathname.replace(/\/$/, '') !== config.path ||
    !isPasswordHash(config.passwordHash) || config.sessionSecret.length < 32 ||
    (config.secureCookies && url.protocol !== 'https:')) return text('Страница не найдена', 404);
  const prefix = config.secureCookies ? '__Host-skuprum-' : 'skuprum-dev-';
  const cookies = new Map((request.headers.get('cookie') ?? '').split(';').map((entry) => {
    const separator = entry.indexOf('=');
    return [entry.slice(0, separator).trim(), entry.slice(separator + 1)];
  }));
  const setCookie = (name: string, value: string, maxAge = 28800) =>
    headers.append('Set-Cookie', `${prefix}${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secureCookies ? '; Secure' : ''}`);
  let csrf = cookies.get(`${prefix}csrf`) ?? '';
  const csrfValid = await verifySession(csrf, config.sessionSecret, 'csrf');
  if (!csrfValid) { csrf = await createSession(config.sessionSecret, 'csrf'); setCookie('csrf', csrf); }
  const session = cookies.get(`${prefix}session`) ?? '';
  const authenticated = await verifySession(session, config.sessionSecret, `session:${config.passwordHash}`);
  const repository = createPriceRepository(store);
  let draft: Record<string, string> | undefined;
  let version = '';
  let currentDocument: PriceDocument | undefined;
  const page = (values: Omit<AdminPage, 'path' | 'csrf'>, status = 200) => {
    headers.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(renderAdminPage({ ...values, path: config.path, csrf }), { status, headers });
  };
  const redirect = (message = '') => {
    headers.set('Location', `${config.path}${message ? `?${message}=1` : ''}`);
    return new Response(null, { status: 303, headers });
  };
  try {
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (!authenticated) return page({});
      currentDocument = await repository.read();
      return page({ document: currentDocument, message: url.searchParams.has('saved') ? 'Цены сохранены и опубликованы.' : url.searchParams.has('restored') ? 'Предыдущие цены возвращены.' : undefined });
    }
    if (request.method !== 'POST') { headers.set('Allow', 'GET, HEAD, POST'); return text('Метод не поддерживается', 405); }
    const origin = request.headers.get('origin');
    if ((origin !== null && origin !== 'null' && origin !== url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return text('Недопустимый источник запроса', 403);
    const form = await readForm(request);
    if (!form) return text('Неверный формат запроса', 400);
    if (!csrfValid || form.get('csrf') !== csrf) return page({ message: 'Сессия формы истекла. Откройте кабинет заново.', error: true }, 403);
    const action = form.get('action');
    if (action === 'login') {
      if (!await allowLoginAttempt(store, ip || 'unknown', config.sessionSecret)) {
        headers.set('Retry-After', '900');
        return page({ message: 'Слишком много попыток. Попробуйте через 15 минут.', error: true }, 429);
      }
      if (!await verifyPassword(form.get('password') ?? '', config.passwordHash)) return page({ message: 'Неверный пароль. Попробуйте ещё раз.', error: true }, 401);
      setCookie('session', await createSession(config.sessionSecret, `session:${config.passwordHash}`));
      setCookie('csrf', await createSession(config.sessionSecret, 'csrf'));
      return redirect();
    }
    if (!authenticated) return page({ message: 'Войдите, чтобы изменить цены.', error: true }, 401);
    if (action === 'logout') { setCookie('session', '', 0); setCookie('csrf', '', 0); return redirect(); }
    version = form.get('version') ?? '';
    if (action === 'confirm-restore') {
      const document = await repository.read();
      if (version !== document.version) return page({ document, message: 'Цены изменились. Проверьте текущий прайс.', error: true }, 409);
      return page({ document, confirmRestore: true });
    }
    const allowedKeys = new Set(['csrf', 'action', 'version', ...(action === 'save' ? metalIds : [])]);
    if (Array.from(form.keys()).some((key) => !allowedKeys.has(key))) return text('Лишние поля в запросе', 400);
    if (action !== 'save' && action !== 'restore') return text('Неизвестное действие', 400);
    draft = Object.fromEntries(metalIds.map((id) => [id, form.get(id) ?? '']));
    const input = Object.fromEntries(metalIds.map((id) => {
      const raw = (form.get(id) ?? '').trim().replace(',', '.');
      return [id, /^\d+(?:\.\d{1,2})?$/.test(raw) ? Number(raw) : NaN];
    }));
    currentDocument = await repository.read();
    const result = action === 'save' ? await repository.save(input, version) : await repository.restore(version);
    if (!result.ok) return page({ document: await repository.read(), draft: action === 'save' ? draft : undefined, version, message: result.message, error: true }, 409);
    return redirect(action === 'save' ? 'saved' : 'restored');
  } catch {
    console.error('Price admin request failed');
    return page({ document: currentDocument, draft, version, message: 'Не удалось связаться с хранилищем. Изменения не подтверждены. Проверьте актуальные цены перед повторным сохранением.', error: true }, 503);
  }
};
