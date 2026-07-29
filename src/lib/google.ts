// Thin wrapper around Google Identity Services (GIS) for a browser-only OAuth
// token flow. We only ever request a YouTube scope so the user can create and
// add to their own playlists (which surface inside YouTube Music).

const GIS_SRC = "https://accounts.google.com/gsi/client";
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

// Minimal shape of the bits of the GIS global we use.
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
  callback: (resp: TokenResponse) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services")));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
  return gisPromise;
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenClient: TokenClient | null = null;
let clientIdInUse = "";

/**
 * Return a valid OAuth access token, prompting the user to sign in the first
 * time (or when the cached token has expired). Requires an OAuth client id
 * whose Authorized JavaScript origins include this app's origin.
 */
export async function getAccessToken(clientId: string): Promise<string> {
  if (!clientId) throw new Error("Missing OAuth Client ID (add it in Settings).");
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  await loadGis();
  const oauth2 = window.google!.accounts.oauth2;

  if (!tokenClient || clientIdInUse !== clientId) {
    tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: YOUTUBE_SCOPE,
      callback: () => {}, // replaced per-request below
    });
    clientIdInUse = clientId;
  }

  return new Promise<string>((resolve, reject) => {
    tokenClient!.callback = (resp: TokenResponse) => {
      if (resp.error) {
        reject(new Error(resp.error_description || resp.error));
        return;
      }
      cachedToken = {
        value: resp.access_token,
        expiresAt: Date.now() + resp.expires_in * 1000,
      };
      resolve(resp.access_token);
    };
    try {
      tokenClient!.requestAccessToken({ prompt: cachedToken ? "" : "consent" });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export function signOutGoogle(): void {
  cachedToken = null;
}

export function isSignedIn(): boolean {
  return !!cachedToken && cachedToken.expiresAt > Date.now();
}
