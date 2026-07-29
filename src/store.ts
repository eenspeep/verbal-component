import type { AppState, Playlist, Sample } from "./types";

// A single reducer owns all persisted swipe state: playlists, the active
// "Yes" target, the still-thinking queue, and the seen/decided sets that keep
// the feed from repeating cards.

const SEEN_CAP = 3000;

export type Action =
  | { type: "setCategory"; category: string }
  | { type: "decide"; kind: "yes" | "no"; sample: Sample }
  | { type: "sort"; sample: Sample; playlistId: string }
  | { type: "sortToNew"; sample: Sample; name: string }
  | { type: "think"; sample: Sample }
  | { type: "createPlaylist"; name: string; emoji?: string; activate?: boolean }
  | { type: "setActivePlaylist"; playlistId: string }
  | { type: "removeFromPlaylist"; playlistId: string; videoId: string }
  | { type: "deletePlaylist"; playlistId: string }
  | { type: "renamePlaylist"; playlistId: string; name: string }
  | { type: "removeFromThinking"; videoId: string }
  | { type: "markSynced"; playlistId: string; youtubeId: string; videoIds: string[] }
  | { type: "reset" }
  | { type: "hydrate"; state: AppState };

function cap(list: string[]): string[] {
  return list.length > SEEN_CAP ? list.slice(list.length - SEEN_CAP) : list;
}

function withSeen(state: AppState, videoId: string): string[] {
  return state.seen.includes(videoId) ? state.seen : cap([...state.seen, videoId]);
}

function withDecided(state: AppState, videoId: string): string[] {
  return state.decided.includes(videoId) ? state.decided : cap([...state.decided, videoId]);
}

function addItem(playlist: Playlist, sample: Sample): Playlist {
  if (playlist.items.some((i) => i.videoId === sample.videoId)) return playlist;
  return { ...playlist, items: [sample, ...playlist.items] };
}

const EMOJI_MAP: Array<[RegExp, string]> = [
  [/pokemon|poke/i, "🔴"],
  [/medieval|knight|castle|tavern/i, "🏰"],
  [/relax|calm|chill|peace|sleep/i, "🌙"],
  [/battle|combat|boss|fight|war/i, "⚔️"],
  [/forest|wood|nature|grove/i, "🌲"],
  [/space|sci.?fi|cyber|future/i, "🚀"],
  [/horror|dark|spooky|haunt|crypt/i, "💀"],
  [/ocean|sea|water|pirate|ship/i, "🌊"],
  [/desert|sand/i, "🏜️"],
  [/snow|ice|winter|frozen/i, "❄️"],
  [/dragon/i, "🐉"],
  [/city|town|market/i, "🏙️"],
  [/magic|wizard|arcane|spell/i, "✨"],
];

export function emojiForCategory(name: string): string {
  for (const [re, emoji] of EMOJI_MAP) if (re.test(name)) return emoji;
  return "🎵";
}

let idCounter = 0;
function newId(): string {
  idCounter += 1;
  return `pl_${Date.now().toString(36)}_${idCounter}`;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "hydrate":
      return action.state;

    case "reset":
      return {
        playlists: [],
        activePlaylistId: null,
        thinking: [],
        seen: [],
        decided: [],
        category: "",
      };

    case "setCategory":
      // Searching only changes the feed. Playlists are created/selected
      // explicitly via the playlist rail, so we no longer spawn one per search.
      return { ...state, category: action.category.trim() };

    case "decide": {
      const { sample, kind } = action;
      let playlists = state.playlists;
      if (kind === "yes" && state.activePlaylistId) {
        playlists = playlists.map((p) =>
          p.id === state.activePlaylistId ? addItem(p, sample) : p,
        );
      }
      return {
        ...state,
        playlists,
        seen: withSeen(state, sample.videoId),
        decided: withDecided(state, sample.videoId),
        thinking: state.thinking.filter((t) => t.videoId !== sample.videoId),
      };
    }

    case "sort": {
      const { sample, playlistId } = action;
      const playlists = state.playlists.map((p) =>
        p.id === playlistId ? addItem(p, sample) : p,
      );
      return {
        ...state,
        playlists,
        seen: withSeen(state, sample.videoId),
        decided: withDecided(state, sample.videoId),
        thinking: state.thinking.filter((t) => t.videoId !== sample.videoId),
      };
    }

    case "sortToNew": {
      const { sample, name } = action;
      const playlist: Playlist = {
        id: newId(),
        name: name.trim() || "New Playlist",
        emoji: emojiForCategory(name),
        createdAt: Date.now(),
        items: [sample],
        syncedVideoIds: [],
      };
      return {
        ...state,
        playlists: [...state.playlists, playlist],
        // A freshly made playlist becomes the active "Yes" target.
        activePlaylistId: playlist.id,
        seen: withSeen(state, sample.videoId),
        decided: withDecided(state, sample.videoId),
        thinking: state.thinking.filter((t) => t.videoId !== sample.videoId),
      };
    }

    case "think": {
      const { sample } = action;
      const already = state.thinking.some((t) => t.videoId === sample.videoId);
      return {
        ...state,
        seen: withSeen(state, sample.videoId),
        thinking: already ? state.thinking : [sample, ...state.thinking],
      };
    }

    case "removeFromThinking":
      return {
        ...state,
        thinking: state.thinking.filter((t) => t.videoId !== action.videoId),
      };

    case "createPlaylist": {
      const playlist: Playlist = {
        id: newId(),
        name: action.name.trim() || "New Playlist",
        emoji: action.emoji || emojiForCategory(action.name),
        createdAt: Date.now(),
        items: [],
        syncedVideoIds: [],
      };
      return {
        ...state,
        playlists: [...state.playlists, playlist],
        activePlaylistId: action.activate ? playlist.id : state.activePlaylistId,
      };
    }

    case "setActivePlaylist":
      return { ...state, activePlaylistId: action.playlistId };

    case "renamePlaylist":
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.playlistId ? { ...p, name: action.name.trim() || p.name } : p,
        ),
      };

    case "removeFromPlaylist":
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.playlistId
            ? { ...p, items: p.items.filter((i) => i.videoId !== action.videoId) }
            : p,
        ),
      };

    case "deletePlaylist": {
      const playlists = state.playlists.filter((p) => p.id !== action.playlistId);
      return {
        ...state,
        playlists,
        activePlaylistId:
          state.activePlaylistId === action.playlistId
            ? playlists[0]?.id ?? null
            : state.activePlaylistId,
      };
    }

    case "markSynced":
      return {
        ...state,
        playlists: state.playlists.map((p) =>
          p.id === action.playlistId
            ? {
                ...p,
                youtubeId: action.youtubeId,
                syncedVideoIds: Array.from(
                  new Set([...p.syncedVideoIds, ...action.videoIds]),
                ),
              }
            : p,
        ),
      };

    default:
      return state;
  }
}
