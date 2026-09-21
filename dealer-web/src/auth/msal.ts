import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser'
const tenant = import.meta.env.VITE_ENTRA_TENANT_ID || 'common'
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID || 'dealer-web-placeholder'
export const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE || 'api://dealer-api/access_as_user'
export const msal = new PublicClientApplication({
  auth:{clientId,authority:`https://login.microsoftonline.com/${tenant}`,redirectUri:`${window.location.origin}/login`,postLogoutRedirectUri:`${window.location.origin}/login`},
  cache:{cacheLocation:'sessionStorage',storeAuthStateInCookie:false}
})
let initialized = false
export async function initializeMsal():Promise<AuthenticationResult|null>{ if(!initialized){await msal.initialize(); initialized=true}; return msal.handleRedirectPromise() }
export function account():AccountInfo|undefined{return msal.getActiveAccount()||msal.getAllAccounts()[0]}
export async function signIn(){return msal.loginRedirect({scopes:[apiScope]})}
export async function signOut(){const a=account(); return msal.logoutRedirect({account:a,postLogoutRedirectUri:`${window.location.origin}/login`})}
export async function accessToken(){const a=account();if(!a) throw new Error('Sign in required'); try{return (await msal.acquireTokenSilent({scopes:[apiScope],account:a})).accessToken}catch{return (await msal.acquireTokenRedirect({scopes:[apiScope],account:a})).accessToken}}
