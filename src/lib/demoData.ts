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

const LENGTHS = ["1 Hour", "30 Min", "45 Min", "2 Hours", "Extended", "Seamless Loop"];

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
export function makeDemoSample(category: string, index: number): Sample {
  const catSeed = [...category.toLowerCase()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
  const rng = mulberry32((catSeed ^ (index * 2654435761)) >>> 0);

  const cat = category.trim() ? category.trim() : "Fantasy";
  const catCap = cat.charAt(0).toUpperCase() + cat.slice(1);
  const scene = pick(rng, SCENES);
  const descriptor = pick(rng, DESCRIPTORS);
  const channel = pick(rng, CHANNELS);
  const length = pick(rng, LENGTHS);

  const title = `${catCap} ${scene} — ${descriptor} (${length})`;
  const description = pick(rng, DESC_SNIPPETS);

  return {
    videoId: `demo:${catSeed}:${index}`,
    title,
    channelTitle: channel,
    description,
    thumbnail: "",
    keywords: generateKeywords({ title, description, category: cat }),
    category: cat,
    source: "demo",
  };
}

/** A YouTube search URL so demo cards are still listenable via an outbound link. */
export function demoListenUrl(sample: Sample): string {
  const q = sample.title.replace(/\s*\(.*?\)\s*/g, " ").replace(/—/g, "").trim();
  return `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;
}
