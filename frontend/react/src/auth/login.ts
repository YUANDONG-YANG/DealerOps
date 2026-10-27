import axios from 'axios';
import { logApiFailure } from '../api/apiFailure';
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

/**
 * Landing route for a signed-in user, by role (UI-02).
 *
 * @param role platform admin or dealership user
 * @returns `/admin` for a platform admin, otherwise `/dms`
 */
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

/**
 * Stores a same-origin in-app path to open after sign-in. External and disallowed paths are ignored.
 *
 * @param path location the user wanted before they were sent to sign in
 */
export function rememberPostLoginRedirect(path: string | null | undefined) {
  const value = safeRedirect(path);
  if (!value) return;
  try {
    sessionStorage.setItem(REDIRECT_KEY, value);
  } catch { /* ignore */ }
}

/**
 * Saved path, but only when the signed-in role may actually open it (UI-02).
 *
 * @param role role used to check the saved path
 * @returns the saved path, or an empty string when none is allowed
 */
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

// Password and ID-token bodies stay out of the log; the line is only the auth route, status, and code.
async function postAuth(path: string, body: object) {
  const route = `POST /api/v1/auth/${path}`;
  try {
    const baseURL = await resolveGatewayUrl();
    const { data } = await axios.post<LoginResponse>(`${baseURL}/api/v1/auth/${path}`, body);
    try {
      sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    } catch { /* ignore */ }
    return data;
  } catch (error) {
    logApiFailure(error, route);
    throw error;
  }
}

/**
 * Signs in with an email, username, or phone plus a password.
 * The password is sent to the gateway and is never written to the log.
 *
 * @param identifier email, username, or phone
 * @param password account password
 * @returns access token, role, and display name
 */
export function signIn(identifier: string, password: string) {
  return postAuth('login', { identifier, password });
}

/**
 * Signs in with Firebase email and password, then exchanges the Firebase ID token for a DealerOps session.
 * The email, password, and ID token are never logged.
 *
 * @param email Firebase account email
 * @param password Firebase account password
 * @returns access token, role, and display name
 */
export async function signInWithFirebase(email: string, password: string) {
  let idToken: string;
  try {
    const credential = await firebaseSignIn(email, password);
    idToken = await credential.user.getIdToken();
  } catch (error) {
    logApiFailure(error, 'POST /auth/firebase-identity');
    throw error;
  }
  return postAuth('firebase', { idToken });
}

/**
 * Exchanges a Google ID token for this application's session. An unbound account is signed in
 * and lands on the no-access screen, where it can request one dealership.
 * The ID token is never logged.
 *
 * @param idToken Google Identity Services credential
 * @returns the session payload; `status` is `ok` when the gateway accepts the token
 */
export async function signInWithGoogle(idToken: string): Promise<GoogleSignInResult> {
  const route = 'POST /api/v1/auth/google';
  try {
    const baseURL = await resolveGatewayUrl();
    const { data } = await axios.post<GoogleSignInResult>(`${baseURL}/api/v1/auth/google`, { idToken });
    try { sessionStorage.setItem(TOKEN_KEY, data.login.accessToken); } catch { /* ignore */ }
    return data;
  } catch (error) {
    logApiFailure(error, route);
    throw error;
  }
}

/**
 * Creates a password account and stores the session token.
 * An empty email or phone is sent as null. The password is never logged.
 *
 * @param username sign-in name
 * @param displayName name shown in the app
 * @param email optional email
 * @param phone optional phone
 * @param password new password
 * @returns access token, role, and display name
 */
export function register(
  username: string, displayName: string,
  email: string, phone: string, password: string,
) {
  return postAuth('register', {
    username, displayName,
    email: email || null, phone: phone || null, password,
  });
}

/**
 * Ends the Firebase session when one exists, clears the local token, and returns to the landing page.
 * A Firebase sign-out failure is logged, then the local token is cleared.
 */
export async function signOut() {
  await firebaseSignOut().catch((error: unknown) => {
    logApiFailure(error, 'POST /auth/firebase-sign-out');
  });
  clearAccount();
  window.location.assign('/');
}

/**
 * Removes the stored access token. A storage failure is ignored so sign-out can still leave the page.
 */
export function clearAccount() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

/**
 * Access token for the current tab.
 *
 * @returns the bearer token, or null when there is none or storage is blocked
 */
export function accessToken(): string | null {
  return readToken();
}
