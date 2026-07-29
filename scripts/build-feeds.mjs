// Build static category feeds from the YouTube Data API, once per day in CI, so
// the app can swipe real tracks with ZERO live search quota. Writes one JSON per
// category plus an index manifest into public/feeds/. Self-contained (Node fetch,
// no deps). Quota is spent here in CI, not in every user's browser.
//
// Usage: YT_API_KEY=... node scripts/build-feeds.mjs

import { writeFileSync, mkdirSync } from "node:fs";

const API_KEY = process.env.YT_API_KEY;
if (!API_KEY) {
  console.error("Missing YT_API_KEY env var.");
  process.exit(1);
}

const API = "https://www.googleapis.com/youtube/v3";
const OUT_DIR = "public/feeds";

// 3 query variants per category keeps the daily quota well under budget:
// ~12 categories x 3 searches x 100 units = ~3,600 units (of 10,000/day).
const SUFFIXES = ["tabletop rpg music", "ambient music", "battle music"];

const CATEGORIES = [
  { slug: "pokemon", name: "Pokémon" },
  { slug: "medieval", name: "Medieval" },
  { slug: "relaxed", name: "Relaxed" },
  { slug: "boss-battle", name: "Boss Battle" },
  { slug: "tavern", name: "Tavern" },
  { slug: "space", name: "Space" },
  { slug: "horror", name: "Horror" },
  { slug: "forest", name: "Forest" },
  { slug: "dungeon", name: "Dungeon" },
  { slug: "city", name: "City" },
  { slug: "ocean", name: "Ocean" },
  { slug: "combat", name: "Combat" },
];

// Lenient build-time bounds so the pool is broad; the app's runtime filters
// (duration/views/tags, user-adjustable) apply on top.
const MIN_DUR = 60;
const MAX_DUR = 30 * 60;
const MIN_VIEWS = 50_000;
const PER_CATEGORY_CAP = 120;

let unitsUsed = 0;

function parseIsoDuration(iso) {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return (+(d || 0)) * 86400 + (+(h || 0)) * 3600 + (+(mi || 0)) * 60 + +(s || 0);
}
function decode(t) {
  return t
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function search(q) {
  const p = new URLSearchParams({
    key: API_KEY,
    part: "snippet",
    type: "video",
    q,
    maxResults: "50",
    videoEmbeddable: "true",
    order: "relevance",
    safeSearch: "moderate",
  });
  const r = await fetch(`${API}/search?${p}`);
  unitsUsed += 100;
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return (d.items || [])
    .filter((it) => it.id?.videoId && it.snippet)
    .map((it) => ({ videoId: it.id.videoId, snippet: it.snippet }));
}

async function fetchDetails(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const p = new URLSearchParams({
      key: API_KEY,
      part: "contentDetails,statistics",
      id: ids.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    const r = await fetch(`${API}/videos?${p}`);
    unitsUsed += 1;
    const d = await r.json();
    for (const it of d.items || []) {
      out.set(it.id, {
        durationSec: parseIsoDuration(it.contentDetails?.duration),
        viewCount: Number(it.statistics?.viewCount || 0) || 0,
      });
    }
  }
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];

for (const cat of CATEGORIES) {
  const seen = new Set();
  const raw = [];
  for (const suffix of SUFFIXES) {
    try {
      for (const it of await search(`${cat.name} ${suffix}`)) {
        if (!seen.has(it.videoId)) {
          seen.add(it.videoId);
          raw.push(it);
        }
      }
    } catch (e) {
      console.error(`  search failed (${cat.name} / ${suffix}): ${e.message}`);
    }
  }

  const details = await fetchDetails(raw.map((r) => r.videoId));
  const pool = raw
    .map((r) => {
      const d = details.get(r.videoId) || { durationSec: 0, viewCount: 0 };
      const s = r.snippet;
      const thumbs = s.thumbnails || {};
      return {
        videoId: r.videoId,
        title: decode(s.title || "Untitled"),
        channelTitle: decode(s.channelTitle || ""),
        description: decode((s.description || "").slice(0, 240)),
        thumbnail: thumbs.medium?.url || thumbs.high?.url || thumbs.default?.url || "",
        durationSec: d.durationSec,
        viewCount: d.viewCount,
        category: cat.name,
      };
    })
    .filter((t) => t.durationSec >= MIN_DUR && t.durationSec <= MAX_DUR && t.viewCount >= MIN_VIEWS)
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, PER_CATEGORY_CAP);

  writeFileSync(`${OUT_DIR}/${cat.slug}.json`, JSON.stringify(pool));
  if (pool.length > 0) manifest.push({ slug: cat.slug, name: cat.name, count: pool.length });
  console.log(`${cat.slug.padEnd(14)} ${pool.length} tracks`);
}

writeFileSync(
  `${OUT_DIR}/index.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), categories: manifest }),
);
console.log(`\nWrote ${manifest.length} feeds. Quota units used: ${unitsUsed} / 10000.`);
