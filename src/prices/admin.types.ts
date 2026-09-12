import type { PriceDocument, PriceStore } from './prices.types';

export type AdminConfig = { path: string; passwordHash: string; sessionSecret: string; secureCookies: boolean };
export type AdminPage = {
  path: string;
  csrf: string;
  document?: PriceDocument;
  message?: string;
  error?: boolean;
  draft?: Record<string, string>;
  version?: string;
  confirmRestore?: boolean;
};
export type AdminDependencies = { config: AdminConfig; store: PriceStore; ip: string };
