/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: bake in a YouTube Data API key at build time. */
  readonly VITE_YT_API_KEY?: string;
  /** Optional: bake in a Google OAuth Client ID at build time. */
  readonly VITE_YT_OAUTH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
