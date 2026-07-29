import { useState } from "react";
import type { Playlist } from "../types";

interface Props {
  playlists: Playlist[];
  activePlaylistId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}

/**
 * A rail beside the deck for picking the active "Yes" target inline — no page
 * switching, no Sort tap for the common case.
 */
export default function PlaylistRail({ playlists, activePlaylistId, onSelect, onCreate }: Props) {
  const [newName, setNewName] = useState("");

  return (
    <aside className="rail" aria-label="Playlists">
      <div className="rail__title">Filing into</div>
      <div className="rail__list">
        {playlists.length === 0 && (
          <p className="rail__empty">No playlists yet — make one to start filing tracks.</p>
        )}
        {playlists.map((p) => (
          <button
            key={p.id}
            className={`rail__item ${p.id === activePlaylistId ? "rail__item--active" : ""}`}
            onClick={() => onSelect(p.id)}
            title={p.name}
          >
            <span className="rail__emoji">{p.emoji}</span>
            <span className="rail__name">{p.name}</span>
            <span className="rail__count">{p.items.length}</span>
          </button>
        ))}
      </div>
      <form
        className="rail__create"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newName.trim();
          if (name) {
            onCreate(name);
            setNewName("");
          }
        }}
      >
        <input
          className="rail__input"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New playlist…"
          aria-label="New playlist name"
        />
        <button className="rail__add" type="submit" disabled={!newName.trim()} aria-label="Create playlist">
          ＋
        </button>
      </form>
    </aside>
  );
}
