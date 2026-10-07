/** Admin-issued username/password session (design/15-Data-Auth-and-Gateway.md S8). */
import axios from 'axios'
import { resolveGatewayUrl } from '../api/gateway'

export type LocalAccount = { token: string }

const TOKEN_KEY = 'dealerops.accessToken'
const REDIRECT_KEY = 'dealerops.postLoginRedirect'

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function account(): LocalAccount | undefined {
  const token = readToken()
  return token ? { token } : undefined
}

/** Business routes a post-login redirect may target (design/13-Frontend-Engineering.md S2). */
const REDIRECT_PATHS = ['/admin', '/dms', '/crm', '/ads', '/assistant']

/**
 * Same-origin business route (path + query) or '' when the value is not one. Parsing with URL
 * rejects values such as `/\evil.com` that the browser would resolve to another origin.
 */
export function safeRedirect(path: string | null | undefined): string {
  if (!path || !path.startsWith('/')) return ''
  try {
    const url = new URL(path, window.location.origin)
    if (url.origin !== window.location.origin || !REDIRECT_PATHS.includes(url.pathname)) return ''
    return `${url.pathname}${url.search}`
  } catch {
    return ''
  }
}

/** Remember an in-app path across the login round-trip. */
export function rememberPostLoginRedirect(path: string | null | undefined) {
  const value = safeRedirect(path)
  if (!value) return
  try {
    sessionStorage.setItem(REDIRECT_KEY, value)
  } catch {
    /* ignore quota / private mode */
  }
}

export function takePostLoginRedirect(): string {
  try {
    const value = sessionStorage.getItem(REDIRECT_KEY)
    sessionStorage.removeItem(REDIRECT_KEY)
    return safeRedirect(value)
  } catch {
    /* ignore */
  }
  return ''
}

type LoginResponse = { accessToken: string; role: string; displayName: string }

export async function signIn(username: string, password: string) {
  const baseURL = await resolveGatewayUrl()
  const { data } = await axios.post<LoginResponse>(`${baseURL}/api/v1/auth/login`, {
    username,
    password,
  })
  try {
    sessionStorage.setItem(TOKEN_KEY, data.accessToken)
  } catch {
    /* ignore quota / private mode */
  }
  return data
}

export async function signOut() {
  await clearAccount()
  window.location.assign('/login')
}

export async function clearAccount() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignore */
  }
}

export async function accessToken(): Promise<string> {
  const token = readToken()
  if (!token) throw new Error('Sign in required')
  return token
}
