import axios from 'axios'
import { accessToken, clearAccount } from '../auth/login'
import { useSessionStore } from '../stores/session'
import { resolveGatewayUrl } from './gateway'

let clearing401 = false
let gatewayReady: Promise<string> | null = null

export const http = axios.create({
  baseURL: '',
  headers: { 'Content-Type': 'application/json' },
})

export function applyGatewayUrl(): Promise<string> {
  if (!gatewayReady) {
    gatewayReady = resolveGatewayUrl().then((url) => {
      http.defaults.baseURL = url
      return url
    })
  }
  return gatewayReady
}

http.interceptors.request.use(async (config) => {
  const path = `${config.baseURL || ''}${config.url || ''}`
  if (path.includes('/internal')) {
    return Promise.reject(new Error('Browser must not call /internal'))
  }
  config.baseURL = await applyGatewayUrl()
  config.headers = config.headers || {}
  // Signed-out pages (landing VIN decode) call public endpoints without a token.
  const token = await accessToken().catch(() => '')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && !clearing401) {
      clearing401 = true
      useSessionStore().clear()
      void clearAccount().finally(() => {
        const target = '/login?notice=required'
        if (`${window.location.pathname}${window.location.search}` !== target) {
          window.location.assign(target)
        }
        clearing401 = false
      })
    }
    return Promise.reject(err)
  },
)

export type ApiErrorInfo = { status?: number; code?: string; message?: string }

type ApiErrorBody = { code?: string; message?: string }

function responseOf(error: unknown): { status?: number; data?: ApiErrorBody | Blob } | undefined {
  return (error as { response?: { status?: number; data?: ApiErrorBody | Blob } }).response
}

function infoFrom(status: number | undefined, data: ApiErrorBody | Blob | undefined): ApiErrorInfo {
  if (data == null || data instanceof Blob) return { status }
  return { status, code: data.code, message: data.message }
}

/** Sync snapshot. A blob body (export) exposes status only; parseApiError reads its JSON. */
export function apiError(error: unknown): ApiErrorInfo {
  const response = responseOf(error)
  return infoFrom(response?.status, response?.data)
}

export async function parseApiError(error: unknown): Promise<ApiErrorInfo> {
  const response = responseOf(error)
  let data = response?.data
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text()) as ApiErrorBody
    } catch {
      data = undefined
    }
  }
  return infoFrom(response?.status, data)
}

export function statusOf(error: unknown): number | undefined {
  return apiError(error).status
}

export function codeOf(error: unknown): string | undefined {
  return apiError(error).code
}

export function messageOf(error: unknown, fallback = 'Request failed.'): string {
  return apiError(error).message || fallback
}

/** Per-field messages from a `400 VALIDATION` body (`fieldErrors: { field: message }`). */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  const fields = (responseOf(error)?.data as { fieldErrors?: unknown } | undefined)?.fieldErrors
  const result: Record<string, string> = {}
  if (fields && typeof fields === 'object') {
    for (const [field, text] of Object.entries(fields)) {
      if (typeof text === 'string' && text.trim()) result[field] = text.trim()
    }
  }
  return result
}
