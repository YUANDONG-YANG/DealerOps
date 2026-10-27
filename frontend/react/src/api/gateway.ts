import { logApiFailure } from './apiFailure';

declare global {
  interface Window {
    __DEALER_GATEWAY_URL__?: string;
  }
}

function normalize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\/$/, '');
  return trimmed || undefined;
}

function isBrowserForbiddenOrigin(value: string): boolean {
  const lower = value.toLowerCase();
  return /:8081\b/.test(lower) || /:8082\b/.test(lower) || lower.includes('/internal');
}

function accept(value: unknown): string | undefined {
  const url = normalize(value);
  if (!url || isBrowserForbiddenOrigin(url)) return undefined;
  return url;
}

type RuntimeConfig = { gatewayUrl?: string };

let runtimeConfig: Promise<RuntimeConfig> | undefined;

function loadRuntimeConfig(): Promise<RuntimeConfig> {
  runtimeConfig ??= fetch('/config.json', { cache: 'no-store' })
    .then((response) => {
      if (response.ok) return response.json() as Promise<RuntimeConfig>;
      // A missing file is the normal local fallback. Any other status is a broken deploy.
      if (response.status !== 404) {
        logApiFailure(
          { response: { status: response.status }, config: { method: 'get', url: '/config.json' } },
          'GET /config.json',
        );
      }
      return {};
    })
    .catch((error: unknown) => {
      logApiFailure(error, 'GET /config.json');
      return {};
    });
  return runtimeConfig;
}

/**
 * Gateway origin for browser calls. The first allowed source wins: the host page, `/config.json`,
 * then the build-time environment variable. Core and AI origins (ports 8081 and 8082) and `/internal` are rejected.
 *
 * @returns origin without a trailing slash, or an empty string when none is configured
 */
export async function resolveGatewayUrl(): Promise<string> {
  const fromWindow = accept(window.__DEALER_GATEWAY_URL__);
  if (fromWindow) return fromWindow;

  const fromFile = accept((await loadRuntimeConfig()).gatewayUrl);
  if (fromFile) return fromFile;

  const fromEnv = accept(import.meta.env.VITE_GATEWAY_URL);
  if (fromEnv) return fromEnv;

  return '';
}
