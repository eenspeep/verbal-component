import { useState } from "react";
import type { Playlist, Sample } from "../types";

interface Props {
  sample: Sample;
  playlists: Playlist[];
  activePlaylistId: string | null;
  onPick: (playlistId: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

/** Bottom-sheet menu to file a sample into any existing or new playlist. */
export default function SortMenu({
  sample,
  playlists,
  activePlaylistId,
  onPick,
  onCreate,
  onClose,
}: Props) {
  const [newName, setNewName] = useState("");

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__grip" />
        <h3 className="sheet__title">Sort “{sample.title}”</h3>
        <p className="sheet__sub">Pick a playlist to file it into.</p>

        <div className="sheet__list">
          {playlists.length === 0 && (
            <p className="sheet__empty">No playlists yet — create one below.</p>
          )}
          {playlists.map((p) => (
            <button
              key={p.id}
              className={`sheet__item ${p.id === activePlaylistId ? "sheet__item--active" : ""}`}
              onClick={() => onPick(p.id)}
            >
              <span className="sheet__emoji">{p.emoji}</span>
              <span className="sheet__name">{p.name}</span>
              <span className="sheet__count">{p.items.length}</span>
            </button>
          ))}
        </div>

        <form
          className="sheet__create"
          onSubmit={(e) => {
            e.preventDefault();
            if (newName.trim()) {
              onCreate(newName.trim());
              setNewName("");
            }
          }}
        >
          <input
            className="sheet__input"
            placeholder="New playlist name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button className="sheet__add" type="submit" disabled={!newName.trim()}>
            Create & add
          </button>
        </form>

        <button className="sheet__cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
