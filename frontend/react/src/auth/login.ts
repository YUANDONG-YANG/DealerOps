import axios from 'axios';
import { resolveGatewayUrl } from '../api/gateway';

const TOKEN_KEY = 'dealerops.accessToken';
const REDIRECT_KEY = 'dealerops.postLoginRedirect';

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

const ADMIN_PATHS = ['/admin'];
const DEALER_PATHS = ['/dms', '/crm', '/leads', '/ads'];

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
 * Google sign-in is three-way: an already-bound account signs straight in; a brand-new Google
 * account first lands on 'needs_dealer' so the user can pick a dealership; after the pick, it
 * sits at 'pending_approval' until a member of that dealership approves the join request.
 */
export type GoogleSignInResult =
  | { status: 'ok'; login: LoginResponse }
  | { status: 'needs_dealer' }
  | { status: 'pending_approval' };

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

/**
 * Exchanges a Google ID token for this application's own session token. Pass dealerId on the
 * second call, after the user picks a dealership on the 'needs_dealer' screen; omit it on the
 * first call so the server can report which branch to take.
 */
export async function signInWithGoogle(idToken: string, dealerId?: number): Promise<GoogleSignInResult> {
  const baseURL = await resolveGatewayUrl();
  const body: Record<string, unknown> = { idToken };
  if (dealerId != null) body.dealerId = dealerId;
  const { data } = await axios.post<GoogleSignInResult>(`${baseURL}/api/v1/auth/google`, body);
  if (data.status === 'ok') {
    try { sessionStorage.setItem(TOKEN_KEY, data.login.accessToken); } catch { /* ignore */ }
  }
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

export function signOut() {
  clearAccount();
  window.location.assign('/login');
}

export function clearAccount() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function accessToken(): string | null {
  return readToken();
}
