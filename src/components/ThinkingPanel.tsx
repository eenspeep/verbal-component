import { useState } from "react";
import type { Playlist, Sample } from "../types";
import KeywordChips from "./KeywordChips";
import { demoListenUrl } from "../lib/demoData";

interface Props {
  thinking: Sample[];
  playlists: Playlist[];
  activePlaylistName: string | null;
  onYes: (sample: Sample) => void;
  onNo: (sample: Sample) => void;
  onSortInto: (sample: Sample, playlistId: string) => void;
  onSortToNew: (sample: Sample, name: string) => void;
}

export default function ThinkingPanel({
  thinking,
  playlists,
  activePlaylistName,
  onYes,
  onNo,
  onSortInto,
  onSortToNew,
}: Props) {
  const [previewing, setPreviewing] = useState<string | null>(null);

  if (thinking.length === 0) {
    return (
      <div className="panel">
        <div className="panel-empty">
          <div className="panel-empty__art">🤔</div>
          <h2>Nothing on the maybe pile</h2>
          <p>Swipe a card up (or tap 🤔 Thinking) to park tracks here and decide later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel__head">
        <h2>Still thinking <span className="panel__count">{thinking.length}</span></h2>
        <p className="panel__sub">Revisit these and send each one somewhere.</p>
      </div>

      <ul className="think-list">
        {thinking.map((s) => {
          const isPreview = previewing === s.videoId;
          const playable = s.source === "live";
          return (
            <li className="think" key={s.videoId}>
              <div className="think__media">
                {isPreview && playable ? (
                  <iframe
                    className="think__player"
                    src={`https://www.youtube.com/embed/${s.videoId}?rel=0&autoplay=1`}
                    title={s.title}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                ) : (
                  <button
                    className="think__play"
                    onClick={() => {
                      if (playable) setPreviewing(s.videoId);
                      else window.open(demoListenUrl(s), "_blank", "noopener");
                    }}
                  >
                    ▶ {playable ? "Preview" : "Listen ↗"}
                  </button>
                )}
              </div>

              <div className="think__body">
                <KeywordChips keywords={s.keywords} />
                <div className="think__title">{s.title}</div>
                <div className="think__channel">{s.channelTitle}</div>

                <div className="think__actions">
                  <button className="chipbtn chipbtn--yes" onClick={() => onYes(s)}>
                    ♥ {activePlaylistName ? `Add to ${activePlaylistName}` : "Yes"}
                  </button>
                  <select
                    className="chipbtn chipbtn--sort"
                    value=""
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      if (v === "__new__") {
                        const name = prompt("New playlist name");
                        if (name) onSortToNew(s, name);
                      } else {
                        onSortInto(s, v);
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="">↗ Sort into…</option>
                    {playlists.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.emoji} {p.name}
                      </option>
                    ))}
                    <option value="__new__">+ New playlist…</option>
                  </select>
                  <button className="chipbtn chipbtn--no" onClick={() => onNo(s)}>
                    ✕ Drop
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
