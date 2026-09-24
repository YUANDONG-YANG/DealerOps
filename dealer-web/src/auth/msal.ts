import {
  PublicClientApplication,
  type AccountInfo,
  type AuthenticationResult,
} from '@azure/msal-browser'

const tenant = import.meta.env.VITE_ENTRA_TENANT_ID || 'common'
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || 'dealer-web-placeholder'
export const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE || 'api://dealer-api/access_as_user'

const REDIRECT_KEY = 'dealerops.postLoginRedirect'

export const msal = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenant}`,
    redirectUri: `${window.location.origin}/login`,
    postLogoutRedirectUri: `${window.location.origin}/login`,
  },
  cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
})

let initialized = false

function setActiveFrom(result: AuthenticationResult | null | undefined) {
  if (result?.account) {
    msal.setActiveAccount(result.account)
    return
  }
  if (!msal.getActiveAccount()) {
    const first = msal.getAllAccounts()[0]
    if (first) msal.setActiveAccount(first)
  }
}

export async function initializeMsal(): Promise<AuthenticationResult | null> {
  if (!initialized) {
    await msal.initialize()
    initialized = true
  }
  const result = await msal.handleRedirectPromise()
  setActiveFrom(result)
  return result
}

export function account(): AccountInfo | undefined {
  return msal.getActiveAccount() || msal.getAllAccounts()[0]
}

/** Remember an in-app path across the Entra redirect round-trip (query string is lost). */
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

export async function signIn() {
  return msal.loginRedirect({ scopes: [apiScope] })
}

export async function signOut() {
  return msal.logoutRedirect({
    account: account(),
    postLogoutRedirectUri: `${window.location.origin}/login`,
  })
}

export async function clearAccount() {
  msal.setActiveAccount(null)
  try {
    await msal.clearCache()
  } catch {
    /* ignore */
  }
}

export async function accessToken(): Promise<string> {
  const a = account()
  if (!a) throw new Error('Sign in required')
  try {
    return (await msal.acquireTokenSilent({ scopes: [apiScope], account: a })).accessToken
  } catch {
    await msal.acquireTokenRedirect({ scopes: [apiScope] })
    throw new Error('Redirecting to sign in')
  }
}
