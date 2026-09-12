import type { AdminPage } from './admin.types';
import styles from './admin.module.css';
import css from './admin.module.css?inline';
import { metalIds, metals } from './catalog';

export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => {
  switch (character) {
    case '&': return '&amp;';
    case '<': return '&lt;';
    case '>': return '&gt;';
    case '"': return '&quot;';
    default: return '&#39;';
  }
});

export const renderAdminPage = (page: AdminPage): string => {
  const path = escapeHtml(page.path);
  const hidden = `<input type="hidden" name="csrf" value="${escapeHtml(page.csrf)}">`;
  const notice = page.message ? `<p role="${page.error ? 'alert' : 'status'}" class="${styles.notice} ${page.error ? styles.error : ''}">${escapeHtml(page.message)}</p>` : '';
  const document = page.document;
  const version = `<input type="hidden" name="version" value="${escapeHtml(page.version ?? document?.version ?? '')}">`;
  const logout = document ? `<form method="post" action="${path}">${hidden}<button class="${styles.secondary}" name="action" value="logout">Выйти</button></form>` : '';
  const login = `<h1 class="${styles.title}">Вход в кабинет</h1><p class="${styles.hint}">Здесь можно изменить цены на сайте.</p>${notice}<form method="post" action="${path}" class="${styles.login}">${hidden}<label for="password">Пароль</label><input class="${styles.field}" id="password" name="password" type="password" autocomplete="current-password" required maxlength="256"><button class="${styles.button}" name="action" value="login">Войти</button></form>`;
  const editor = document ? `<h1 class="${styles.title}">Цены на металл</h1><p class="${styles.hint}">Измените нужные цифры и сохраните. Все цены — в рублях за килограмм.</p><p class="${styles.updated}">${document.updatedAt ? `Обновлено ${escapeHtml(new Date(document.updatedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }))} (МСК)` : 'Начальный прайс. Сохраните изменения, когда будете готовы.'}</p>${notice}
    <form method="post" action="${path}">${hidden}${version}<div class="${styles.list}">${metalIds.map((id) => `<div class="${styles.row}"><label for="${id}">${metals[id].title}</label><input class="${styles.field}" id="${id}" name="${id}" aria-label="${metals[id].title}, рублей за килограмм" inputmode="decimal" autocomplete="off" type="text" maxlength="12" pattern="[0-9]+([.,][0-9]{1,2})?" required value="${escapeHtml(page.draft?.[id] ?? String(document.prices[id]).replace('.', ','))}"></div>`).join('')}<div class="${styles.bar}"><button class="${styles.button}" name="action" value="save">Сохранить цены</button></div></form>
    <div class="${styles.actions}"><a class="${styles.secondary}" href="${path}">Сбросить несохранённые изменения</a>${document.previous ? `<form method="post" action="${path}">${hidden}${version}<button class="${styles.secondary}" name="action" value="confirm-restore">Вернуть предыдущие цены</button></form>` : ''}</div>` : '';
  const restore = document ? `<h1 class="${styles.title}">Вернуть предыдущие цены?</h1><p class="${styles.hint}">Эти изменения появятся на сайте после подтверждения.</p><div class="${styles.list}">${metalIds.filter((id) => document.prices[id] !== document.previous?.[id]).map((id) => `<div class="${styles.row}"><span>${metals[id].title}</span><strong>${document.prices[id]} → ${document.previous?.[id]} ₽</strong></div>`).join('')}</div><form method="post" action="${path}">${hidden}${version}<div class="${styles.actions}"><button class="${styles.button}" name="action" value="restore">Да, вернуть цены</button><a class="${styles.secondary}" href="${path}">Отмена</a></div></form>` : '';
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow, noarchive"><title>Цены — Скупрум</title><style>${css}</style></head><body class="${styles.page}"><main class="${styles.shell}"><header class="${styles.header}"><span class="${styles.brand}">Скупрум</span>${logout}</header>${document ? page.confirmRestore ? restore : editor : login}</main><script src="/admin-form.js"></script></body></html>`;
};
