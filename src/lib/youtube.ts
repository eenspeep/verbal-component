import type { Sample } from "../types";
import { generateKeywords } from "./keywords";
import { getAccessToken } from "./google";

// YouTube Data API v3 REST helpers. Search uses an API key; playlist writes use
// an OAuth access token. See the README for how to obtain both.

const API = "https://www.googleapis.com/youtube/v3";

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
  pageToken?: string,
  order = "relevance",
): Promise<SearchPage> {
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    type: "video",
    q: query,
    maxResults: "25",
    videoEmbeddable: "true",
    order,
    safeSearch: "moderate",
  });
  if (pageToken) params.set("pageToken", pageToken);

  const resp = await fetch(`${API}/search?${params.toString()}`);
  const data = (await resp.json()) as SearchListResponse;

  if (!resp.ok || data.error) {
    const reason = data.error?.errors?.[0]?.reason;
    if (reason === "quotaExceeded") {
      throw new Error("YouTube API daily quota exceeded. Try again tomorrow or use another key.");
    }
    throw new Error(data.error?.message || `YouTube search failed (${resp.status}).`);
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
        category,
        source: "live" as const,
      };
    });

  return { samples, nextPageToken: data.nextPageToken };
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
  description = "Curated with Questward.",
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
