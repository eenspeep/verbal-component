import { useEffect, useRef, useState } from "react";
import type { Sample } from "../types";
import KeywordChips from "./KeywordChips";
import CoverArt from "./CoverArt";
import CardPlayer from "./CardPlayer";
import { demoListenUrl } from "../lib/demoData";
import { formatDuration, formatViews } from "../lib/filters";

export type SwipeDir = "yes" | "no" | "thinking";

interface Props {
  sample: Sample;
  active: boolean;
  /** Stacking depth (0 = top card). */
  depth: number;
  /** Set by buttons/keyboard to fly the top card out programmatically. */
  trigger?: SwipeDir | null;
  /** When true, the top card starts playing as soon as it lands. */
  autoplay: boolean;
  /** Playback volume, 0–100. */
  volume: number;
  /** Whether a "Yes" has a playlist to file into. If not, a right-swipe defers. */
  yesEnabled: boolean;
  /** Called when a "Yes" is attempted with no active playlist. */
  onNeedTarget: () => void;
  onSwipe: (dir: SwipeDir, sample: Sample) => void;
}

const THRESH_X = 110;
const THRESH_Y = 120;

function dirFrom(x: number, y: number): SwipeDir | null {
  if (Math.abs(x) > Math.abs(y)) {
    if (x > THRESH_X) return "yes";
    if (x < -THRESH_X) return "no";
  } else if (y < -THRESH_Y) {
    return "thinking";
  }
  return null;
}

export default function SwipeCard({
  sample,
  active,
  depth,
  trigger,
  autoplay,
  volume,
  yesEnabled,
  onNeedTarget,
  onSwipe,
}: Props) {
  const playable = sample.source === "live";
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [playing, setPlaying] = useState(active && autoplay && playable);
  const exitingRef = useRef<SwipeDir | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // A new top card should start fresh; autoplay starts it the moment it lands.
  useEffect(() => {
    if (!active) setPlaying(false);
    else if (autoplay && playable) setPlaying(true);
  }, [active, autoplay, playable]);

  // Buttons and keyboard shortcuts fly the top card out via `trigger`.
  useEffect(() => {
    if (active && trigger && !exitingRef.current) flyOut(trigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, active]);

  function onPointerDown(e: React.PointerEvent) {
    if (!active || exitingRef.current) return;
    // Don't start a drag from interactive elements (player, buttons, links).
    if ((e.target as HTMLElement).closest("[data-nodrag]")) return;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !startRef.current) return;
    setDrag({
      x: e.clientX - startRef.current.x,
      y: e.clientY - startRef.current.y,
    });
  }

  function endDrag() {
    if (!dragging) return;
    setDragging(false);
    startRef.current = null;
    const dir = dirFrom(drag.x, drag.y);
    if (dir === "yes" && !yesEnabled) {
      // No playlist selected yet — spring back and prompt to pick/create one.
      setDrag({ x: 0, y: 0 });
      onNeedTarget();
    } else if (dir) {
      flyOut(dir);
    } else {
      setDrag({ x: 0, y: 0 });
    }
  }

  function flyOut(dir: SwipeDir) {
    exitingRef.current = dir;
    const target =
      dir === "yes"
        ? { x: 700, y: drag.y }
        : dir === "no"
        ? { x: -700, y: drag.y }
        : { x: drag.x, y: -800 };
    setDrag(target);
  }

  function onTransitionEnd() {
    if (exitingRef.current) {
      const dir = exitingRef.current;
      exitingRef.current = null;
      onSwipe(dir, sample);
    }
  }

  const rot = Math.max(-14, Math.min(14, drag.x / 16));
  const transform = active
    ? `translate(${drag.x}px, ${drag.y}px) rotate(${rot}deg)`
    : `scale(${1 - depth * 0.04}) translateY(${depth * 14}px)`;

  const dir = dirFrom(drag.x, drag.y);
  const yesOp = Math.max(0, Math.min(1, drag.x / THRESH_X));
  const noOp = Math.max(0, Math.min(1, -drag.x / THRESH_X));
  const thinkOp = Math.max(0, Math.min(1, -drag.y / THRESH_Y));

  return (
    <div
      className={`card ${active ? "card--active" : ""} ${dragging ? "card--dragging" : ""}`}
      style={{
        transform,
        transition: dragging ? "none" : "transform 0.32s cubic-bezier(.2,.8,.3,1)",
        zIndex: 100 - depth,
        cursor: active ? "grab" : "default",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onTransitionEnd={onTransitionEnd}
    >
      {active && (
        <>
          <div className="card__hint card__hint--yes" style={{ opacity: dir === "yes" ? yesOp : yesOp * 0.9 }}>
            YES
          </div>
          <div className="card__hint card__hint--no" style={{ opacity: dir === "no" ? noOp : noOp * 0.9 }}>
            NOPE
          </div>
          <div className="card__hint card__hint--think" style={{ opacity: thinkOp }}>
            THINKING
          </div>
        </>
      )}

      <div className="card__media" data-nodrag={active && playing ? "" : undefined}>
        {active && playable && playing ? (
          <CardPlayer videoId={sample.videoId} volume={volume} />
        ) : sample.thumbnail ? (
          <div className="card__thumbwrap">
            <img className="card__thumb" src={sample.thumbnail} alt="" draggable={false} />
          </div>
        ) : (
          <CoverArt sample={sample} />
        )}

        {active && !playing && (
          <button
            className="card__play"
            data-nodrag=""
            onClick={() => {
              if (playable) setPlaying(true);
              else window.open(demoListenUrl(sample), "_blank", "noopener");
            }}
            aria-label={playable ? "Play preview" : "Listen on YouTube Music"}
          >
            <span className="card__play-icon">▶</span>
            <span className="card__play-label">
              {playable ? "Play preview" : "Listen ↗"}
            </span>
          </button>
        )}
      </div>

      <div className="card__body">
        <KeywordChips keywords={sample.keywords} />
        <h2 className="card__title" title={sample.title}>
          {sample.title}
        </h2>
        <p className="card__channel">
          {sample.channelTitle}
          <span className="card__stats">
            {formatDuration(sample.durationSec)} · {formatViews(sample.viewCount)} views
          </span>
        </p>
        {sample.source === "demo" && (
          <p className="card__demoflag">Demo card — add an API key for real, playable tracks</p>
        )}
      </div>
    </div>
  );
}
