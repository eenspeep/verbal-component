import { useEffect, useState } from "react";
import type { Playlist, Sample } from "../types";
import SwipeCard, { type SwipeDir } from "./SwipeCard";
import ActionBar from "./ActionBar";
import SortMenu from "./SortMenu";

interface Props {
  buffer: Sample[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  category: string;
  error: string | null;
  exhausted: boolean;
  onRetry: () => void;
  onDecide: (dir: SwipeDir, sample: Sample) => void;
  onSortInto: (sample: Sample, playlistId: string) => void;
  onSortToNew: (sample: Sample, name: string) => void;
}

const VISIBLE = 3;

export default function CardDeck({
  buffer,
  playlists,
  activePlaylistId,
  category,
  error,
  exhausted,
  onRetry,
  onDecide,
  onSortInto,
  onSortToNew,
}: Props) {
  const [trigger, setTrigger] = useState<SwipeDir | null>(null);
  const [sortOpen, setSortOpen] = useState(false);

  const top = buffer[0] ?? null;
  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) ?? null;

  // Keyboard shortcuts for the top card.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sortOpen || !top) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") setTrigger("yes");
      else if (e.key === "ArrowLeft") setTrigger("no");
      else if (e.key === "ArrowUp") setTrigger("thinking");
      else if (e.key.toLowerCase() === "s") setSortOpen(true);
      else return;
      // Stop the key from also scrolling the page or leaking into the
      // sort sheet's auto-focused input.
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [top, sortOpen]);

  function handleSwipe(dir: SwipeDir, sample: Sample) {
    setTrigger(null);
    onDecide(dir, sample);
  }

  if (!category.trim()) {
    return (
      <div className="deck-empty">
        <div className="deck-empty__art">🎴</div>
        <h2>Pick a vibe to start</h2>
        <p>Search a category above — like <em>pokemon</em>, <em>medieval</em>, or <em>relaxed</em> — and start swiping tracks into playlists.</p>
      </div>
    );
  }

  return (
    <div className="deck-wrap">
      <div className="deck">
        {buffer.slice(0, VISIBLE).map((sample, i) => (
          <SwipeCard
            key={sample.videoId}
            sample={sample}
            active={i === 0}
            depth={i}
            trigger={i === 0 ? trigger : null}
            onSwipe={handleSwipe}
          />
        )).reverse()}

        {!top && (
          <div className="deck-status">
            {error ? (
              <>
                <div className="deck-status__art">⚠️</div>
                <p className="deck-status__msg">{error}</p>
                <button className="btn" onClick={onRetry}>Try again</button>
              </>
            ) : exhausted ? (
              <>
                <div className="deck-status__art">🏁</div>
                <p className="deck-status__msg">
                  That’s every fresh track we could dig up for “{category}” right now.
                </p>
                <p className="deck-status__hint">Try a new category, or come back tomorrow for more.</p>
              </>
            ) : (
              <>
                <div className="deck-status__spinner" />
                <p className="deck-status__msg">Digging up “{category}” tracks…</p>
              </>
            )}
          </div>
        )}
      </div>

      {top && (
        <ActionBar
          onNo={() => setTrigger("no")}
          onThinking={() => setTrigger("thinking")}
          onSort={() => setSortOpen(true)}
          onYes={() => setTrigger("yes")}
          activePlaylistName={activePlaylist?.name ?? null}
        />
      )}

      {sortOpen && top && (
        <SortMenu
          sample={top}
          playlists={playlists}
          activePlaylistId={activePlaylistId}
          onPick={(playlistId) => {
            setSortOpen(false);
            onSortInto(top, playlistId);
          }}
          onCreate={(name) => {
            setSortOpen(false);
            onSortToNew(top, name);
          }}
          onClose={() => setSortOpen(false)}
        />
      )}
    </div>
  );
}
