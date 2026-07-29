import type { AppState, Settings } from "../types";
import { DEFAULT_FILTERS } from "./filters";

const STATE_KEY = "verbal-component.state.v1";
const SETTINGS_KEY = "verbal-component.settings.v1";

export const emptyState: AppState = {
  playlists: [],
  activePlaylistId: null,
  thinking: [],
  seen: [],
  decided: [],
  category: "",
};

// Optional build-time defaults, so a self-hosted deploy can bake in credentials
// via a .env file instead of typing them into Settings each time.
export const defaultSettings: Settings = {
  apiKey: import.meta.env.VITE_YT_API_KEY ?? "",
  oauthClientId: import.meta.env.VITE_YT_OAUTH_CLIENT_ID ?? "",
  autoSync: false,
  ...DEFAULT_FILTERS,
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...emptyState, ...parsed };
  } catch {
    return emptyState;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — fail quietly; the app still works in-memory.
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...defaultSettings, ...parsed };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}
