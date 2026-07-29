// Loader + minimal typings for the YouTube IFrame Player API. We use the JS
// player (rather than a bare <iframe>) so playback volume can be controlled.

export interface YTPlayer {
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

interface YTPlayerOptions {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: { onReady?: (e: { target: YTPlayer }) => void };
}

interface YTNamespace {
  Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const API_SRC = "https://www.youtube.com/iframe_api";
let apiPromise: Promise<YTNamespace> | null = null;

/** Load the IFrame Player API once and resolve with the `YT` namespace. */
export function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector(`script[src="${API_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = API_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  });
  return apiPromise;
}
