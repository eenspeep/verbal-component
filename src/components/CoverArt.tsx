import type { Sample } from "../types";

// Deterministic generated cover art for cards without a real thumbnail
// (demo mode), derived from the video id so a given track always looks the same.

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const EMOJI = ["🎲", "⚔️", "🏰", "🌲", "🔥", "🌙", "🐉", "🍺", "🗺️", "🎻", "🛡️", "✨"];

export default function CoverArt({ sample }: { sample: Sample }) {
  const h = hash(sample.videoId + sample.title);
  const hue = h % 360;
  const hue2 = (hue + 40 + (h % 60)) % 360;
  const emoji = EMOJI[h % EMOJI.length];
  const style = {
    background: `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${hue2} 60% 20%))`,
  };
  return (
    <div className="coverart" style={style} aria-hidden="true">
      <span className="coverart__emoji">{emoji}</span>
    </div>
  );
}
