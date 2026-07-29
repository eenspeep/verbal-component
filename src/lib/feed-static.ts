import type { Sample } from "../types";
import { generateKeywords } from "./keywords";

// Pre-built static feeds (generated daily by scripts/build-feeds.mjs and served
// from /feeds/*.json) let the app swipe real, playable tracks with ZERO live
// YouTube search quota. Categories without a static feed fall back to live
// search (with a key) or the demo generator.

interface Manifest {
  categories?: { slug: string; name: string; count: number }[];
}

interface StaticTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  description: string;
  thumbnail: string;
  durationSec: number;
  viewCount: number;
  category: string;
}

function base(): string {
  return import.meta.env.BASE_URL || "/";
}

export function slugify(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let manifestPromise: Promise<Set<string>> | null = null;

function loadManifest(): Promise<Set<string>> {
  if (!manifestPromise) {
    manifestPromise = fetch(`${base()}feeds/index.json`)
      .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : { categories: [] }))
      .then((m) => new Set((m.categories ?? []).map((c) => c.slug)))
      .catch(() => new Set<string>());
  }
  return manifestPromise;
}

/** The slug of a static feed for this category, or null if none exists. */
export async function staticFeedSlug(category: string): Promise<string | null> {
  const slug = slugify(category);
  const available = await loadManifest();
  return available.has(slug) ? slug : null;
}

/** Load a static feed as playable Samples (keywords generated client-side). */
export async function loadStaticFeed(slug: string): Promise<Sample[]> {
  try {
    const r = await fetch(`${base()}feeds/${slug}.json`);
    if (!r.ok) return [];
    const tracks = (await r.json()) as StaticTrack[];
    return tracks.map((t) => ({
      ...t,
      keywords: generateKeywords({ title: t.title, description: t.description, category: t.category }),
      source: "live" as const, // real, playable videos
    }));
  } catch {
    return [];
  }
}
