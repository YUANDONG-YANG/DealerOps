import axios from 'axios';
import { accessToken, clearAccount } from '../auth/login';
import { useSessionStore } from '../store/session';
import { resolveGatewayUrl } from './gateway';

let clearing401 = false;
let gatewayReady: Promise<string> | null = null;

export const http = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

export function applyGatewayUrl(): Promise<string> {
  if (!gatewayReady) {
    gatewayReady = resolveGatewayUrl().then((url) => {
      http.defaults.baseURL = url;
      return url;
    });
  }
  return gatewayReady;
}

http.interceptors.request.use(async (config) => {
  const path = `${config.baseURL || ''}${config.url || ''}`;
  if (path.includes('/internal')) {
    return Promise.reject(new Error('Browser must not call /internal'));
  }
  config.baseURL = await applyGatewayUrl();
  config.headers = config.headers || {};
  const isPublicAuth = path.includes('/auth/login')
    || path.includes('/auth/register')
    || path.includes('/auth/firebase');
  const token = isPublicAuth ? '' : (accessToken() ?? '');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !clearing401) {
      clearing401 = true;
      useSessionStore.getState().clear();
      clearAccount();
      const target = '/login?notice=required';
      if (`${window.location.pathname}${window.location.search}` !== target) {
        window.location.assign(target);
      }
      clearing401 = false;
    }
    return Promise.reject(err);
  },
);

type PageResponse<T> = { data: { items?: T[]; totalElements?: number } };

/**
 * Loads every page of a newest-first list. A row created while the pages load pushes older
 * rows onto the next page, so rows already collected are skipped by id instead of repeated.
 */
export async function collectAllPages<T extends { id: number }>(
  loadPage: (page: number) => Promise<PageResponse<T>>,
): Promise<T[]> {
  const byId = new Map<number, T>();
  let fetched = 0;
  for (let page = 0; ; page++) {
    const { items = [], totalElements = 0 } = (await loadPage(page)).data;
    for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item);
    fetched += items.length;
    if (!items.length || fetched >= totalElements) return [...byId.values()];
  }
}

export type ApiErrorInfo = { status?: number; code?: string; message?: string };

type ApiErrorBody = { code?: string; message?: string };

function responseOf(error: unknown): { status?: number; data?: ApiErrorBody | Blob } | undefined {
  return (error as { response?: { status?: number; data?: ApiErrorBody | Blob } }).response;
}

function infoFrom(status: number | undefined, data: ApiErrorBody | Blob | undefined): ApiErrorInfo {
  if (data == null || data instanceof Blob) return { status };
  return { status, code: data.code, message: data.message };
}

export function apiError(error: unknown): ApiErrorInfo {
  const response = responseOf(error);
  return infoFrom(response?.status, response?.data);
}

export async function parseApiError(error: unknown): Promise<ApiErrorInfo> {
  const response = responseOf(error);
  let data = response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text()) as ApiErrorBody;
    } catch {
      data = undefined;
    }
  }
  return infoFrom(response?.status, data);
}

export function statusOf(error: unknown): number | undefined {
  return apiError(error).status;
}

export function codeOf(error: unknown): string | undefined {
  return apiError(error).code;
}

export function messageOf(error: unknown, fallback = 'Request failed.'): string {
  return apiError(error).message || fallback;
}

export function fieldErrorsOf(error: unknown): Record<string, string> {
  const fields = (responseOf(error)?.data as { fieldErrors?: unknown } | undefined)?.fieldErrors;
  const result: Record<string, string> = {};
  if (fields && typeof fields === 'object') {
    for (const [field, text] of Object.entries(fields as Record<string, unknown>)) {
      if (typeof text === 'string' && text.trim()) result[field] = text.trim();
    }
  }
  return result;
}
