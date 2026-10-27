type FailureShape = {
  response?: { status?: number; data?: unknown };
  config?: { method?: string; url?: string; baseURL?: string };
  code?: unknown;
};

const SAFE_CODE = /^[A-Za-z0-9_./:-]{1,80}$/;

function safeCode(value: unknown): string | undefined {
  return typeof value === 'string' && SAFE_CODE.test(value) ? value : undefined;
}

function pathOnly(value: string): string {
  const noQuery = value.split('?')[0].split('#')[0];
  if (!/^https?:\/\//i.test(noQuery)) return noQuery || 'unknown';
  try {
    return new URL(noQuery).pathname || '/';
  } catch {
    return 'unknown';
  }
}

function routeOf(error: FailureShape, route?: string): string {
  if (route) return route.split('?')[0].split('#')[0] || 'unknown';
  const method = (error.config?.method || 'GET').toUpperCase();
  const url = error.config?.url ?? '';
  const base = error.config?.baseURL ?? '';
  const combined = /^https?:\/\//i.test(url) ? url : `${base}${url}`;
  return `${method} ${pathOnly(combined)}`;
}

function bodyCode(data: unknown): string | undefined {
  if (data == null || typeof data !== 'object' || data instanceof Blob) return undefined;
  return safeCode((data as { code?: unknown }).code);
}

function writeFailure(route: string, status: string, code: string): void {
  const line = `api failure route=${route} status=${status} code=${code}`;
  const statusNumber = Number(status);
  // A 4xx or a Firebase auth code is a rejected caller. Other failures mean the call did not complete.
  const clientFault = (statusNumber >= 400 && statusNumber < 500) || code.startsWith('auth/');
  if (clientFault) console.warn(line);
  else console.error(line);
}

/**
 * One diagnostic line for a failed browser call: method and path, HTTP status, and error code.
 * Query strings, tokens, passwords, and response bodies are left out. A blob body is read only
 * to copy a short `code` field.
 *
 * @param error rejection from axios, fetch, or an identity provider
 * @param route method and path when the error has no request config
 */
export function logApiFailure(error: unknown, route?: string): void {
  try {
    const failure = (error ?? {}) as FailureShape;
    const resolvedRoute = routeOf(failure, route);
    const status = typeof failure.response?.status === 'number' ? String(failure.response.status) : 'none';
    const data = failure.response?.data;
    if (data instanceof Blob) {
      void data.text().then((text) => {
        let code = 'none';
        try {
          code = safeCode((JSON.parse(text) as { code?: unknown }).code) ?? 'none';
        } catch {
          code = 'none';
        }
        writeFailure(resolvedRoute, status, code);
      }).catch(() => writeFailure(resolvedRoute, status, 'none'));
      return;
    }
    writeFailure(resolvedRoute, status, bodyCode(data) ?? safeCode(failure.code) ?? 'none');
  } catch {
    console.error('api failure route=unknown status=none code=none');
  }
}
