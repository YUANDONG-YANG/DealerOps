import axios from 'axios';
import { accessToken, clearAccount } from '../auth/login';
import { useSessionStore } from '../store/session';
import { logApiFailure } from './apiFailure';
import { resolveGatewayUrl } from './gateway';

let clearing401 = false;
let gatewayReady: Promise<string> | null = null;

/**
 * Browser client for the gateway. A bearer token is attached except on public auth routes.
 * Each failed call is logged once from the response interceptor; screens still map the same error for the user.
 */
export const http = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Resolves the gateway origin once and stores it on {@link http}.
 *
 * @returns the origin, or an empty string when no allowed origin is configured
 */
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
  // The browser never calls core or the AI service. Record the blocked path, then reject before a token is attached.
  if (path.includes('/internal')) {
    const blocked = path.split('?')[0];
    logApiFailure({ code: 'CLIENT_BLOCKED' }, `BLOCKED ${blocked || 'unknown'}`);
    return Promise.reject(Object.assign(new Error('Browser must not call /internal'), { apiFailureLogged: true }));
  }
  config.baseURL = await applyGatewayUrl();
  config.headers = config.headers || {};
  // A FormData body must not keep the JSON content type, or the multipart boundary is lost.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
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
    // Single diagnostic line for every gateway failure, including callers that ignore the rejection.
    if (!(err as { apiFailureLogged?: boolean }).apiFailureLogged) logApiFailure(err);
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
 *
 * @param loadPage one page, numbered from 0
 * @returns the rows collected so far, keyed by id
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

/**
 * Status, server code, and server message from a failed call.
 * A blob body (file export) yields the status only; {@link parseApiError} reads its code.
 *
 * @param error rejection from this client or another axios call
 * @returns the parts that are present
 */
export function apiError(error: unknown): ApiErrorInfo {
  const response = responseOf(error);
  return infoFrom(response?.status, response?.data);
}

/**
 * Same fields as {@link apiError}, after reading a blob error body as JSON.
 *
 * @param error rejection whose body may be a blob
 * @returns status, code, and message when the blob is JSON; status alone when it is not
 */
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

/**
 * HTTP status of a failed call.
 *
 * @param error rejection from this client
 * @returns the status, or undefined when the server never answered
 */
export function statusOf(error: unknown): number | undefined {
  return apiError(error).status;
}

/**
 * Server error code of a failed call, such as `VERSION_CONFLICT`.
 *
 * @param error rejection from this client
 * @returns the code, or undefined when the body has none
 */
export function codeOf(error: unknown): string | undefined {
  return apiError(error).code;
}

/**
 * Server message of a failed call, or a fallback when the body has none.
 *
 * @param error rejection from this client
 * @param fallback text used when the server sent no message
 * @returns the server message or the fallback
 */
export function messageOf(error: unknown, fallback = 'Request failed.'): string {
  return apiError(error).message || fallback;
}

/**
 * Field messages from a `400 VALIDATION` body. Non-string entries are dropped.
 *
 * @param error rejection from this client
 * @returns field name to message; empty when the body has no field errors
 */
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
