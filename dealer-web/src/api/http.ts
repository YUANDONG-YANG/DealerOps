import axios from 'axios'
import { accessToken, clearAccount } from '../auth/msal'
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
  config.headers.Authorization = `Bearer ${await accessToken()}`
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

export function messageOf(error: unknown, fallback = 'Request failed.') {
  const e = error as { response?: { data?: { message?: string; code?: string } } }
  return e.response?.data?.message || fallback
}

export function statusOf(error: unknown) {
  return (error as { response?: { status?: number } }).response?.status
}

export function codeOf(error: unknown) {
  return (error as { response?: { data?: { code?: string } } }).response?.data?.code
}
