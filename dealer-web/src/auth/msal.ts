/**
 * Admin-issued username/password session (design/15-Data-Auth-and-Gateway.md S8, reversed from
 * Entra 2026-09-30). File kept at this path/name so router and test mocks do not need to change.
 */
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

export async function initializeMsal(): Promise<null> {
  return null
}

export function account(): LocalAccount | undefined {
  const token = readToken()
  return token ? { token } : undefined
}

/** Remember an in-app path across the login round-trip. */
export function rememberPostLoginRedirect(path: string | null | undefined) {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.startsWith('/login')) {
    return
  }
  try {
    sessionStorage.setItem(REDIRECT_KEY, path)
  } catch {
    /* ignore quota / private mode */
  }
}

export function takePostLoginRedirect(): string {
  try {
    const value = sessionStorage.getItem(REDIRECT_KEY) || ''
    sessionStorage.removeItem(REDIRECT_KEY)
    if (value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login')) {
      return value
    }
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
