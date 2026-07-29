import type { Sample } from "../types";
import { generateKeywords } from "./keywords";
import { getAccessToken } from "./google";
import { parseIsoDuration, passesFilters, type FilterThresholds } from "./filters";

// YouTube Data API v3 REST helpers. Search uses an API key; playlist writes use
// an OAuth access token. See the README for how to obtain both.

const API = "https://www.googleapis.com/youtube/v3";

// --- Response cache -------------------------------------------------------
// GET responses (search + video details) are cached in localStorage so that
// reloading, re-browsing a category, or re-filtering doesn't re-spend the
// (limited) daily search quota. Quota resets daily, so a 12h TTL is safe.
const CACHE_KEY = "questward.ytcache.v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 150;

type CacheStore = Record<string, { t: number; d: unknown }>;

/** Cache key for a request URL, with the API key stripped out (never stored). */
function cacheKeyFor(url: string): string {
  return url.replace(/([?&])key=[^&]*/, "$1key=");
}

function readCache(): CacheStore {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as CacheStore;
  } catch {
    return {};
  }
}

function writeCache(url: string, data: unknown): void {
  try {
    const store = readCache();
    store[cacheKeyFor(url)] = { t: Date.now(), d: data };
    const keys = Object.keys(store);
    if (keys.length > CACHE_MAX_ENTRIES) {
      keys.sort((a, b) => store[a].t - store[b].t);
      for (const k of keys.slice(0, keys.length - CACHE_MAX_ENTRIES)) delete store[k];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // Storage full/unavailable — caching is best-effort.
  }
}

/**
 * GET JSON with a localStorage cache. On a fresh cache hit, no network request
 * (and no quota) is spent. Only successful, error-free responses are cached.
 */
async function cachedGet<T>(url: string): Promise<{ data: T; ok: boolean; status: number }> {
  const hit = readCache()[cacheKeyFor(url)];
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) {
    return { data: hit.d as T, ok: true, status: 200 };
  }
  const resp = await fetch(url);
  const data = (await resp.json()) as T & { error?: unknown };
  if (resp.ok && !data.error) writeCache(url, data);
  return { data, ok: resp.ok, status: resp.status };
}

interface SearchListResponse {
  nextPageToken?: string;
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: Record<string, { url?: string }>;
    };
  }>;
  error?: { message?: string; errors?: Array<{ reason?: string }> };
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export interface SearchPage {
  samples: Sample[];
  nextPageToken?: string;
}

/**
 * Search YouTube for videos matching `query`, returning embeddable music-ish
 * results as Samples with auto-generated keywords.
 */
export async function searchVideos(
  apiKey: string,
  query: string,
  category: string,
  filters: FilterThresholds,
  pageToken?: string,
  order = "relevance",
): Promise<SearchPage> {
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "50",
    videoEmbeddable: "true",
    order,
    safeSearch: "moderate",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const { data, ok, status } = await cachedGet<SearchListResponse>(
    `${API}/search?${params.toString()}`,
  );

  if (!ok || data.error) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded") {
      throw new Error("YouTube API daily quota exceeded. Try again tomorrow or use another key.");
    }
    throw new Error(data.error?.message || `YouTube search failed (${status}).`);
  }

  const samples: Sample[] = (data.items ?? [])
    .filter((it) => it.id?.videoId && it.snippet)
    .map((it) => {
      const s = it.snippet!;
      const title = decodeEntities(s.title ?? "Untitled");
      const description = decodeEntities(s.description ?? "");
      const thumbs = s.thumbnails ?? {};
      const thumbnail =
        thumbs.medium?.url || thumbs.high?.url || thumbs.default?.url || "";
      return {
        videoId: it.id!.videoId!,
        title,
        description,
        channelTitle: decodeEntities(s.channelTitle ?? ""),
        thumbnail,
        keywords: generateKeywords({ title, description, category }),
        durationSec: 0,
        viewCount: 0,
        category,
        source: "live" as const,
      };
    });

  // Enrich with duration + view count (search.list omits both), then apply the
  // duration/view filters. One videos.list call covers the whole page (1 unit).
  const details = await fetchVideoDetails(apiKey, samples.map((s) => s.videoId));
  for (const sample of samples) {
    const d = details.get(sample.videoId);
    if (d) {
      sample.durationSec = d.durationSec;
      sample.viewCount = d.viewCount;
    }
  }
  const filtered = samples.filter((s) => passesFilters(s, filters));

  return { samples: filtered, nextPageToken: data.nextPageToken };
}

interface VideosListResponse {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
    statistics?: { viewCount?: string };
  }>;
  error?: { message?: string };
}

/** Look up duration (seconds) and view count for a batch of video ids. */
async function fetchVideoDetails(
  apiKey: string,
  ids: string[],
): Promise<Map<string, { durationSec: number; viewCount: number }>> {
  const out = new Map<string, { durationSec: number; viewCount: number }>();
  if (ids.length === 0) return out;

  const params = new URLSearchParams({
    key: apiKey,
    part: "contentDetails,statistics",
    id: ids.join(","),
    maxResults: "50",
  });
  const { data, ok } = await cachedGet<VideosListResponse>(`${API}/videos?${params.toString()}`);
  if (!ok || data.error) return out; // On failure, leave details empty (items get filtered out).

  for (const it of data.items ?? []) {
    if (!it.id) continue;
    out.set(it.id, {
      durationSec: parseIsoDuration(it.contentDetails?.duration),
      viewCount: Number(it.statistics?.viewCount ?? 0) || 0,
    });
  }
  return out;
}

async function ytFetch(
  path: string,
  token: string,
  body: unknown,
): Promise<any> {
  const resp = await fetch(`${API}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) {
    const reason = data?.error?.errors?.[0]?.reason;
    if (resp.status === 401) throw new Error("Sign-in expired — please reconnect Google.");
    if (reason === "quotaExceeded") throw new Error("YouTube API quota exceeded for today.");
    throw new Error(data?.error?.message || `YouTube request failed (${resp.status}).`);
  }
  return data;
}

/** Create a (private) YouTube playlist and return its id. */
export async function createYoutubePlaylist(
  clientId: string,
  title: string,
  description = "Curated with Verbal Component.",
): Promise<string> {
  const token = await getAccessToken(clientId);
  const data = await ytFetch("playlists?part=snippet,status", token, {
    snippet: { title, description },
    status: { privacyStatus: "private" },
  });
  return data.id as string;
}

/** Append a video to a YouTube playlist. */
export async function addVideoToPlaylist(
  clientId: string,
  playlistId: string,
  videoId: string,
): Promise<void> {
  const token = await getAccessToken(clientId);
  await ytFetch("playlistItems?part=snippet", token, {
    snippet: {
      playlistId,
      resourceId: { kind: "youtube#video", videoId },
    },
  });
}
