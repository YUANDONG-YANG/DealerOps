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
    .then((r) => (r.ok ? (r.json() as Promise<RuntimeConfig>) : {}))
    .catch(() => ({}));
  return runtimeConfig;
}

export async function resolveGatewayUrl(): Promise<string> {
  const fromWindow = accept(window.__DEALER_GATEWAY_URL__);
  if (fromWindow) return fromWindow;

  const fromFile = accept((await loadRuntimeConfig()).gatewayUrl);
  if (fromFile) return fromFile;

  const fromEnv = accept(import.meta.env.VITE_GATEWAY_URL);
  if (fromEnv) return fromEnv;

  return '';
}
