import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Playlist, Sample, Settings } from "./types";
import { reducer } from "./store";
import { loadState, saveState, loadSettings, saveSettings } from "./lib/storage";
import { useFeed } from "./hooks/useFeed";
import { getAccessToken, isSignedIn } from "./lib/google";
import { addVideoToPlaylist, createYoutubePlaylist } from "./lib/youtube";
import type { SwipeDir } from "./components/SwipeCard";

import TopBar, { type View } from "./components/TopBar";
import CategoryBar from "./components/CategoryBar";
import CardDeck from "./components/CardDeck";
import PlaylistPanel from "./components/PlaylistPanel";
import ThinkingPanel from "./components/ThinkingPanel";
import SettingsPanel from "./components/SettingsPanel";

interface Toast {
  text: string;
  kind: "ok" | "error";
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [view, setView] = useState<View>("swipe");
  const [toast, setToast] = useState<Toast | null>(null);
  const [googleConnected, setGoogleConnected] = useState(isSignedIn());

  const stateRef = useRef(state);
  stateRef.current = state;
  const toastTimer = useRef<number | undefined>(undefined);

  const live = settings.apiKey.trim().length > 0;
  const mode: "live" | "demo" = live ? "live" : "demo";

  // Persist.
  useEffect(() => saveState(state), [state]);
  useEffect(() => saveSettings(settings), [settings]);

  const showToast = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    setToast({ text, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const isSeen = useCallback((id: string) => state.seen.includes(id), [state.seen]);

  const feed = useFeed({
    category: state.category,
    mode,
    apiKey: settings.apiKey,
    isSeen,
    filters: {
      minDurationSec: settings.minDurationSec,
      maxDurationSec: settings.maxDurationSec,
      minViews: settings.minViews,
    },
  });

  const activePlaylist = useMemo(
    () => state.playlists.find((p) => p.id === state.activePlaylistId) ?? null,
    [state.playlists, state.activePlaylistId],
  );

  // ---- YouTube sync helpers ----------------------------------------------

  const syncPlaylist = useCallback(
    async (p: Playlist) => {
      if (!settings.oauthClientId) {
        showToast("Add an OAuth Client ID in Settings to sync.", "error");
        setView("settings");
        return;
      }
      const liveItems = p.items.filter((i) => i.source === "live");
      if (liveItems.length === 0) {
        showToast("These are demo tracks — add an API key and swipe real tracks to sync.", "error");
        return;
      }
      try {
        let ytId = p.youtubeId;
        if (!ytId) {
          ytId = await createYoutubePlaylist(
            settings.oauthClientId,
            p.name,
            `Curated with Verbal Component — ${p.name}`,
          );
        }
        const pending = liveItems.filter((i) => !p.syncedVideoIds.includes(i.videoId));
        const done: string[] = [];
        for (const it of pending) {
          await addVideoToPlaylist(settings.oauthClientId, ytId, it.videoId);
          done.push(it.videoId);
        }
        dispatch({ type: "markSynced", playlistId: p.id, youtubeId: ytId, videoIds: done });
        setGoogleConnected(true);
        showToast(
          done.length > 0
            ? `Synced ${done.length} track${done.length === 1 ? "" : "s"} to “${p.name}” on YouTube Music.`
            : `“${p.name}” is already up to date.`,
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : String(err), "error");
      }
    },
    [settings.oauthClientId, showToast],
  );

  const autoSync = useCallback(
    async (playlistId: string, sample: Sample) => {
      if (!settings.autoSync || !live || sample.source !== "live" || !settings.oauthClientId) return;
      const p = stateRef.current.playlists.find((x) => x.id === playlistId);
      if (!p) return;
      try {
        let ytId = p.youtubeId;
        if (!ytId) ytId = await createYoutubePlaylist(settings.oauthClientId, p.name);
        await addVideoToPlaylist(settings.oauthClientId, ytId, sample.videoId);
        dispatch({ type: "markSynced", playlistId, youtubeId: ytId, videoIds: [sample.videoId] });
        setGoogleConnected(true);
      } catch (err) {
        showToast(err instanceof Error ? err.message : String(err), "error");
      }
    },
    [settings.autoSync, settings.oauthClientId, live, showToast],
  );

  // ---- Decision handlers --------------------------------------------------

  const handleDecide = useCallback(
    (dir: SwipeDir, sample: Sample) => {
      if (dir === "thinking") {
        dispatch({ type: "think", sample });
      } else {
        dispatch({ type: "decide", kind: dir, sample });
        if (dir === "yes" && state.activePlaylistId) {
          void autoSync(state.activePlaylistId, sample);
        }
      }
      feed.advance(sample.videoId);
    },
    [feed, state.activePlaylistId, autoSync],
  );

  const handleSortInto = useCallback(
    (sample: Sample, playlistId: string) => {
      dispatch({ type: "sort", sample, playlistId });
      feed.advance(sample.videoId);
      void autoSync(playlistId, sample);
    },
    [feed, autoSync],
  );

  const handleSortToNew = useCallback(
    (sample: Sample, name: string) => {
      dispatch({ type: "sortToNew", sample, name });
      feed.advance(sample.videoId);
    },
    [feed],
  );

  const connectGoogle = useCallback(async () => {
    await getAccessToken(settings.oauthClientId);
    setGoogleConnected(true);
    showToast("Connected to Google.");
  }, [settings.oauthClientId, showToast]);

  const onSearch = useCallback((category: string) => {
    dispatch({ type: "setCategory", category });
    setView("swipe");
  }, []);

  return (
    <div className="app">
      <TopBar
        view={view}
        setView={setView}
        playlistCount={state.playlists.length}
        thinkingCount={state.thinking.length}
        live={live}
      />

      <main className="main">
        {view === "swipe" && (
          <>
            <CategoryBar category={state.category} onSearch={onSearch} />
            <CardDeck
              buffer={feed.buffer}
              playlists={state.playlists}
              activePlaylistId={state.activePlaylistId}
              category={state.category}
              error={feed.error}
              exhausted={feed.exhausted}
              onRetry={feed.retry}
              onDecide={handleDecide}
              onSortInto={handleSortInto}
              onSortToNew={handleSortToNew}
            />
          </>
        )}

        {view === "playlists" && (
          <PlaylistPanel
            playlists={state.playlists}
            activePlaylistId={state.activePlaylistId}
            live={live}
            onSetActive={(id) => dispatch({ type: "setActivePlaylist", playlistId: id })}
            onRename={(id, name) => dispatch({ type: "renamePlaylist", playlistId: id, name })}
            onDelete={(id) => dispatch({ type: "deletePlaylist", playlistId: id })}
            onRemoveItem={(pid, vid) =>
              dispatch({ type: "removeFromPlaylist", playlistId: pid, videoId: vid })
            }
            onCreate={(name) => dispatch({ type: "createPlaylist", name })}
            onSync={syncPlaylist}
          />
        )}

        {view === "thinking" && (
          <ThinkingPanel
            thinking={state.thinking}
            playlists={state.playlists}
            activePlaylistName={activePlaylist?.name ?? null}
            onYes={(s) => handleDecide("yes", s)}
            onNo={(s) => handleDecide("no", s)}
            onSortInto={handleSortInto}
            onSortToNew={handleSortToNew}
          />
        )}

        {view === "settings" && (
          <SettingsPanel
            settings={settings}
            onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
            onConnectGoogle={connectGoogle}
            onReset={() => {
              dispatch({ type: "reset" });
              showToast("Local data cleared.");
            }}
            live={live}
            googleConnected={googleConnected}
          />
        )}
      </main>

      {toast && <div className={`toast toast--${toast.kind}`}>{toast.text}</div>}

      {view === "swipe" && (
        <footer className="hintbar">
          <span>← Nope</span>
          <span>→ Yes</span>
          <span>↑ Thinking</span>
          <span>S Sort</span>
        </footer>
      )}
    </div>
  );
}
