// Core domain types for Verbal Component.

export interface Sample {
  /** YouTube video id (real in live mode; a synthetic "demo:..." id in demo mode). */
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  /** Thumbnail URL, or "" when none is available (demo mode). */
  thumbnail: string;
  /** Exactly three auto-generated vibe keywords, shown before you listen. */
  keywords: [string, string, string];
  /** Length in seconds (from the YouTube API, or synthetic in demo mode). */
  durationSec: number;
  /** View count (from the YouTube API, or synthetic in demo mode). */
  viewCount: number;
  /** Which category search surfaced this sample. */
  category: string;
  source: "live" | "demo";
}

export interface Playlist {
  /** Local id. */
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
  /** The samples filed into this playlist, newest first. */
  items: Sample[];
  /** YouTube playlist id, once this playlist has been synced. */
  youtubeId?: string;
  /** Video ids already pushed to YouTube, so re-sync only sends new ones. */
  syncedVideoIds: string[];
}

export type DecisionKind = "yes" | "no" | "thinking" | "sorted";

export interface AppState {
  playlists: Playlist[];
  /** The playlist that a "Yes" swipe files into (usually the category playlist). */
  activePlaylistId: string | null;
  /** The "still thinking" queue — revisit these later. */
  thinking: Sample[];
  /** Video ids we've already shown, so the feed never repeats a card. */
  seen: string[];
  /** Video ids the user has acted on (yes/no/sorted), so they don't resurface. */
  decided: string[];
  /** The current category search term. */
  category: string;
}

/** Credentials + preferences, persisted separately from swipe state. */
export interface Settings {
  apiKey: string;
  oauthClientId: string;
  /** When true, a "Yes"/"Sort" immediately writes to YouTube (needs OAuth). */
  autoSync: boolean;
  /** Feed filters: only show tracks inside this length window and above this view floor. */
  minDurationSec: number;
  maxDurationSec: number;
  minViews: number;
  /** Include only tracks matching at least one of these keywords (empty = all). */
  tags: string[];
  /** Start playing the top card automatically when it lands. */
  autoplay: boolean;
  /** Playback volume, 0–100. */
  volume: number;
}
