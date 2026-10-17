/**
 * Google Identity Services wrapper. Google proves which email address signed in; the
 * dealership binding is still granted by a platform admin, so a successful Google sign-in
 * on an unknown account lands on the no-access page until that account is activated.
 */
const GIS_SRC = 'https://accounts.google.com/gsi/client';

/**
 * The Google OAuth web client this deployment belongs to. A client id is a public
 * identifier, not a secret, and it identifies the DealerOps application rather than any one
 * environment, so it is compiled in instead of being supplied per build. It must stay equal
 * to GoogleIdTokenVerifier.ClientId, which the backend checks the ID token audience against.
 */
export const googleClientId = '660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com';

interface CredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (options: { client_id: string; callback: (r: CredentialResponse) => void }) => void;
      renderButton: (target: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

let loader: Promise<void> | null = null;

/** Loads the Google script once per page, reusing the promise on later calls. */
function loadGoogleIdentity(): Promise<void> {
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Google script failed to load')));
      }
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      loader = null;
      reject(new Error('Google script failed to load'));
    };
    document.head.appendChild(script);
  });
  return loader;
}

/**
 * Renders Google's own sign-in button into `target` and reports the ID token it returns.
 * Rejects when the script cannot load, so the caller can keep password sign-in usable.
 */
export async function renderGoogleButton(
  target: HTMLElement,
  onCredential: (idToken: string) => void,
): Promise<void> {
  await loadGoogleIdentity();

  const api = (window as unknown as { google?: GoogleIdentityApi }).google;
  if (!api?.accounts?.id) throw new Error('Google Identity Services unavailable');

  api.accounts.id.initialize({
    client_id: googleClientId,
    callback: (response) => {
      if (response.credential) onCredential(response.credential);
    },
  });
  api.accounts.id.renderButton(target, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'center',
    // Google renders a fixed-width iframe; fit it to the slot so narrow phones do not scroll
    // sideways. Google accepts widths from 200 to 400 px.
    width: Math.max(200, Math.min(316, Math.floor(target.clientWidth) || 316)),
  });
}
