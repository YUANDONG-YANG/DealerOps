declare global {
  interface Window {
    __DEALER_GATEWAY_URL__?: string
  }
}

function normalize(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().replace(/\/$/, '')
  return trimmed || undefined
}

function isBrowserForbiddenOrigin(value: string): boolean {
  const lower = value.toLowerCase()
  return /:8081\b/.test(lower) || /:8082\b/.test(lower) || lower.includes('/internal')
}

function accept(value: unknown): string | undefined {
  const url = normalize(value)
  if (!url || isBrowserForbiddenOrigin(url)) return undefined
  return url
}

/**
 * Gateway origin for `/api/v1/**` only.
 * 1. Runtime window.__DEALER_GATEWAY_URL__ and/or public/config.json `gatewayUrl`
 * 2. Build-time `import.meta.env.VITE_GATEWAY_URL`
 * 3. Relative `''` (same-origin Gateway)
 */
export async function resolveGatewayUrl(): Promise<string> {
  const fromWindow = accept(window.__DEALER_GATEWAY_URL__)
  if (fromWindow) return fromWindow

  try {
    const response = await fetch('/config.json', { cache: 'no-store' })
    if (response.ok) {
      const body = (await response.json()) as { gatewayUrl?: string }
      const fromFile = accept(body.gatewayUrl)
      if (fromFile) return fromFile
    }
  } catch {
    /* missing config.json is allowed */
  }

  const fromEnv = accept(import.meta.env.VITE_GATEWAY_URL)
  if (fromEnv) return fromEnv

  return ''
}
