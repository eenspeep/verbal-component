import { useState } from "react";
import type { Playlist } from "../types";

interface Props {
  playlists: Playlist[];
  activePlaylistId: string | null;
  live: boolean;
  onSetActive: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onRemoveItem: (playlistId: string, videoId: string) => void;
  onCreate: (name: string) => void;
  onSync: (playlist: Playlist) => Promise<void>;
}

export default function PlaylistPanel({
  playlists,
  activePlaylistId,
  live,
  onSetActive,
  onRename,
  onDelete,
  onRemoveItem,
  onCreate,
  onSync,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(activePlaylistId);
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");

  async function handleSync(p: Playlist) {
    setSyncing((s) => new Set(s).add(p.id));
    try {
      await onSync(p);
    } finally {
      setSyncing((s) => {
        const next = new Set(s);
        next.delete(p.id);
        return next;
      });
    }
  }

  if (playlists.length === 0) {
    return (
      <div className="panel">
        <div className="panel-empty">
          <div className="panel-empty__art">📜</div>
          <h2>No playlists yet</h2>
          <p>Swipe some tracks right, or create a playlist to sort into.</p>
          <CreateRow value={newName} setValue={setNewName} onCreate={onCreate} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Your playlists</h2>
        <CreateRow value={newName} setValue={setNewName} onCreate={onCreate} />
      </div>

      <div className="pl-list">
        {playlists.map((p) => {
          const isOpen = expanded === p.id;
          const isSyncing = syncing.has(p.id);
          const unsynced = p.items.filter((i) => !p.syncedVideoIds.includes(i.videoId)).length;
          return (
            <div className={`pl ${p.id === activePlaylistId ? "pl--active" : ""}`} key={p.id}>
              <div className="pl__row">
                <button
                  className="pl__main"
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                >
                  <span className="pl__emoji">{p.emoji}</span>
                  <span className="pl__name">{p.name}</span>
                  <span className="pl__count">{p.items.length} track{p.items.length === 1 ? "" : "s"}</span>
                  {p.youtubeId && <span className="pl__badge">synced</span>}
                </button>
              </div>

              <div className="pl__actions">
                {p.id === activePlaylistId ? (
                  <span className="pl__activeflag">● Active target</span>
                ) : (
                  <button className="linkbtn" onClick={() => onSetActive(p.id)}>
                    Make active
                  </button>
                )}
                <button
                  className="linkbtn"
                  onClick={() => {
                    const name = prompt("Rename playlist", p.name);
                    if (name) onRename(p.id, name);
                  }}
                >
                  Rename
                </button>
                <button
                  className="linkbtn linkbtn--danger"
                  onClick={() => {
                    if (confirm(`Delete “${p.name}”? This won't touch any YouTube playlist you already synced.`)) {
                      onDelete(p.id);
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  className="pl__sync"
                  disabled={!live || isSyncing || p.items.length === 0}
                  onClick={() => handleSync(p)}
                  title={
                    live
                      ? "Create/update this playlist on your YouTube account"
                      : "Connect Google in Settings to sync"
                  }
                >
                  {isSyncing
                    ? "Syncing…"
                    : p.youtubeId
                    ? unsynced > 0
                      ? `Sync ${unsynced} new →`
                      : "Synced ✓"
                    : "Sync to YouTube Music →"}
                </button>
              </div>

              {isOpen && (
                <ul className="pl__items">
                  {p.items.length === 0 && <li className="pl__itemempty">Empty — swipe some tracks in.</li>}
                  {p.items.map((it) => (
                    <li className="pl__item" key={it.videoId}>
                      <div className="pl__itemtitle">{it.title}</div>
                      <div className="pl__itemmeta">
                        {it.keywords.join(" · ")}
                      </div>
                      <div className="pl__itemtools">
                        <a
                          className="linkbtn"
                          href={
                            it.source === "live"
                              ? `https://music.youtube.com/watch?v=${it.videoId}`
                              : `https://music.youtube.com/search?q=${encodeURIComponent(it.title)}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open ↗
                        </a>
                        <button
                          className="linkbtn linkbtn--danger"
                          onClick={() => onRemoveItem(p.id, it.videoId)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateRow({
  value,
  setValue,
  onCreate,
}: {
  value: string;
  setValue: (v: string) => void;
  onCreate: (name: string) => void;
}) {
  return (
    <form
      className="createrow"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onCreate(value.trim());
          setValue("");
        }
      }}
    >
      <input
        className="createrow__input"
        placeholder="New playlist…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="createrow__btn" type="submit" disabled={!value.trim()}>
        + Create
      </button>
    </form>
  );
}
