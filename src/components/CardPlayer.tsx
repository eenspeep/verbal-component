import { useEffect, useRef } from "react";
import { loadYouTubeIframeApi, type YTPlayer } from "../lib/youtubePlayer";

interface Props {
  videoId: string;
  /** 0–100. Applied on ready and whenever it changes. */
  volume: number;
}

/**
 * A YouTube player for the top card. Uses the IFrame Player API so we can set
 * the volume. Rendered only when a card should be playing, and torn down when
 * the card leaves the deck.
 */
export default function CardPlayer({ videoId, volume }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const volRef = useRef(volume);
  volRef.current = volume;

  useEffect(() => {
    let cancelled = false;
    const wrap = wrapRef.current;
    if (!wrap) return;
    // Give the API its own target node inside our React-managed wrapper, so
    // React never tries to remove a node the API has already replaced.
    const target = document.createElement("div");
    wrap.appendChild(target);

    loadYouTubeIframeApi().then((YT) => {
      if (cancelled) return;
      playerRef.current = new YT.Player(target, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (e) => {
            e.target.setVolume(volRef.current);
            e.target.playVideo();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* player may not be ready yet */
      }
      playerRef.current = null;
    };
  }, [videoId]);

  useEffect(() => {
    try {
      playerRef.current?.setVolume(volume);
    } catch {
      /* not ready yet — onReady applies the current volume */
    }
  }, [volume]);

  return <div className="card__player" ref={wrapRef} />;
}
