import axios from 'axios';
import { resolveGatewayUrl } from '../api/gateway';
import { firebaseSignIn, firebaseSignOut } from './firebase';

const TOKEN_KEY = 'dealerops.accessToken';
const REDIRECT_KEY = 'dealerops.postLoginRedirect';

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// /profile is cross-role, so it is added to both allowlists; safeRedirect uses role to pick.
const ADMIN_PATHS = ['/admin', '/profile'];
const DEALER_PATHS = ['/dashboard', '/dms', '/crm', '/leads', '/ads', '/team', '/profile'];

/** Landing route for a signed-in user, by role (UI-02). */
export function roleHome(role: string | null | undefined): string {
  return role === 'Platform.Admin' ? '/admin' : '/dms';
}

/** Internal pages the role may open; every internal page when the role is unknown. */
function allowedPaths(role: string | null | undefined): string[] {
  if (!role) return [...ADMIN_PATHS, ...DEALER_PATHS];
  return role === 'Platform.Admin' ? ADMIN_PATHS : DEALER_PATHS;
}

function safeRedirect(path: string | null | undefined, role?: string | null): string {
  if (!path || !path.startsWith('/')) return '';
  try {
    const url = new URL(path, window.location.origin);
    if (url.origin !== window.location.origin || !allowedPaths(role).includes(url.pathname)) return '';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '';
  }
}

export function rememberPostLoginRedirect(path: string | null | undefined) {
  const value = safeRedirect(path);
  if (!value) return;
  try {
    sessionStorage.setItem(REDIRECT_KEY, value);
  } catch { /* ignore */ }
}

/** Saved path, but only when the signed-in role may actually open it (UI-02). */
export function takePostLoginRedirect(role: string | null | undefined): string {
  try {
    const value = sessionStorage.getItem(REDIRECT_KEY);
    sessionStorage.removeItem(REDIRECT_KEY);
    return safeRedirect(value, role);
  } catch { /* ignore */ }
  return '';
}

type LoginResponse = { accessToken: string; role: string; displayName: string };

/**
 * Google sign-in always starts a session. An account with no dealership lands on the no-access
 * page, where it can ask one dealership to approve it (AUTH-25).
 */
export type GoogleSignInResult = { status: 'ok'; login: LoginResponse };

async function postAuth(path: string, body: object) {
  const baseURL = await resolveGatewayUrl();
  const { data } = await axios.post<LoginResponse>(`${baseURL}/api/v1/auth/${path}`, body);
  try {
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
  } catch { /* ignore */ }
  return data;
}

export function signIn(identifier: string, password: string) {
  return postAuth('login', { identifier, password });
}

export async function signInWithFirebase(email: string, password: string) {
  const credential = await firebaseSignIn(email, password);
  const idToken = await credential.user.getIdToken();
  return postAuth('firebase', { idToken });
}

/**
 * Exchanges a Google ID token for this application's session. An unbound account is signed in
 * and lands on the no-access screen, where it can request one dealership.
 */
export async function signInWithGoogle(idToken: string): Promise<GoogleSignInResult> {
  const baseURL = await resolveGatewayUrl();
  const { data } = await axios.post<GoogleSignInResult>(`${baseURL}/api/v1/auth/google`, { idToken });
  try { sessionStorage.setItem(TOKEN_KEY, data.login.accessToken); } catch { /* ignore */ }
  return data;
}

export function register(
  username: string, displayName: string,
  email: string, phone: string, password: string,
) {
  return postAuth('register', {
    username, displayName,
    email: email || null, phone: phone || null, password,
  });
}

export async function signOut() {
  await firebaseSignOut().catch(() => undefined);
  clearAccount();
  window.location.assign('/');
}

export function clearAccount() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function accessToken(): string | null {
  return readToken();
}
