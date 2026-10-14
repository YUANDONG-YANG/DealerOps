/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GATEWAY_URL: string
  readonly VITE_PUBLISHED_AT?: string
}

declare const __WEB_BUILT_AT__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
