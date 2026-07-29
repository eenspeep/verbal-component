import type { Sample } from "../types";
import { generateKeywords } from "./keywords";

// Demo mode fabricates realistic-looking track metadata so the whole interface
// (swipe, sort, queue, keywords, playlist building) is usable with zero setup.
// There is no real audio in demo mode — each card links out to a YouTube search
// so you can still hear it. Add an API key in Settings for real, playable tracks.

const SCENES = [
  "Tavern", "Dungeon", "Deep Forest", "Frozen Peaks", "Coastal Town", "Ancient Ruins",
  "Boss Battle", "Goblin Ambush", "Royal Court", "Misty Swamp", "Desert Caravan",
  "Haunted Crypt", "Bustling Market", "Wizard's Library", "Campfire Rest", "Pirate Ship",
  "Underdark", "Dragon's Lair", "Village at Dawn", "Stormy Voyage", "Sacred Temple",
  "Sewer Chase", "Winter Village", "Elven Glade", "Cavern Depths", "City Gates",
];

const DESCRIPTORS = [
  "Ambience", "Battle Music", "Exploration Theme", "Relaxing Music", "Dark Ambient",
  "Cinematic Score", "Loopable Background", "Atmospheric Soundscape", "Epic Music",
  "Peaceful Music", "Tense Underscore", "Adventure Theme",
];

const CHANNELS = [
  "Hearthfire Ambience", "Tabletop Audio Vault", "Component Pouch Sessions", "Bardic Loops",
  "The DM's Toolkit", "Dungeon Synth Depot", "Twelve-Sided Sound", "Lantern & Lyre",
  "Realm Reverb", "Ambient Worlds Tabletop",
];

// A small deterministic PRNG so a given seed always yields the same card.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

const DESC_SNIPPETS = [
  "Perfect background music for your next session. Loops seamlessly with no jarring transitions.",
  "Immersive ambience to set the scene while your players explore and roleplay.",
  "Royalty-free instrumental score designed for tabletop roleplaying games.",
  "Drop this on to raise the tension when the dice hit the table.",
  "Slow, atmospheric soundscape to underscore quiet moments and downtime.",
];

/**
 * Deterministically fabricate a demo sample for a category + index. The index
 * lets the feed generate an effectively endless, non-repeating stream.
 */
export function makeDemoSample(category: string, index: number, tags: string[] = []): Sample {
  const catSeed = [...category.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rng = mulberry32((catSeed ^ (index * 2654435761)) >>> 0);

  const cat = category.trim() ? category.trim() : "Fantasy";
  const catCap = cat.charAt(0).toUpperCase() + cat.slice(1);
  const scene = pick(rng, SCENES);
  const descriptor = pick(rng, DESCRIPTORS);
  const channel = pick(rng, CHANNELS);

  const title = `${catCap} ${scene} — ${descriptor}`;
  // When tags are set, weave one into the description so a chunk of demo cards
  // match the tag filter and the deck keeps flowing.
  const tag = tags.length ? pick(rng, tags) : null;
  const description = tag
    ? `${pick(rng, DESC_SNIPPETS)} Tagged: ${tag}.`
    : pick(rng, DESC_SNIPPETS);

  // Synthetic length/views: mostly inside the 2–10 min / 500k+ window so the
  // deck flows, with a minority outside it so the filters are visibly at work.
  const dr = rng();
  const durationSec =
    dr < 0.15
      ? 30 + Math.floor(rng() * 80) // 0:30–1:50 (too short)
      : dr < 0.25
      ? 700 + Math.floor(rng() * 2600) // 11–55 min (too long)
      : 125 + Math.floor(rng() * 470); // ~2:05–9:55 (passes)
  const viewCount =
    rng() < 0.2
      ? 10_000 + Math.floor(rng() * 480_000) // below 500k
      : 500_000 + Math.floor(rng() * 8_000_000); // 0.5M–8.5M

  return {
    videoId: `demo:${catSeed}:${index}`,
    title,
    channelTitle: channel,
    description,
    thumbnail: "",
    keywords: generateKeywords({ title, description, category: cat }),
    durationSec,
    viewCount,
    category: cat,
    source: "demo",
  };
}

/** A YouTube search URL so demo cards are still listenable via an outbound link. */
export function demoListenUrl(sample: Sample): string {
  const q = sample.title.replace(/\s*\(.*?\)\s*/g, " ").replace(/—/g, "").trim();
  return `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;
}
