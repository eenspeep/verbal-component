import { useCallback, useEffect, useRef, useState } from "react";
import type { Sample } from "../types";
import { Feed } from "../lib/feed";
import type { FilterThresholds } from "../lib/filters";

const MIN_BUFFER = 5;
const FETCH_BATCH = 8;

export interface FeedController {
  /** Upcoming cards; index 0 is the top of the deck. */
  buffer: Sample[];
  loading: boolean;
  error: string | null;
  exhausted: boolean;
  /** Drop a card from the deck once it's been decided. */
  advance: (videoId: string) => void;
  retry: () => void;
}

interface Options {
  category: string;
  mode: "live" | "demo";
  apiKey: string;
  isSeen: (videoId: string) => boolean;
  filters: FilterThresholds;
}

export function useFeed({ category, mode, apiKey, isSeen, filters }: Options): FeedController {
  const [buffer, setBuffer] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);

  const feedRef = useRef<Feed | null>(null);
  const loadingRef = useRef(false);
  // Keep a live reference to isSeen without rebuilding the feed each render.
  const isSeenRef = useRef(isSeen);
  isSeenRef.current = isSeen;

  const refill = useCallback(async () => {
    const feed = feedRef.current;
    if (!feed || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const fresh = await feed.loadMore(FETCH_BATCH);
      setBuffer((prev) => {
        const have = new Set(prev.map((s) => s.videoId));
        const add = fresh.filter((s) => !have.has(s.videoId) && !isSeenRef.current(s.videoId));
        return [...prev, ...add];
      });
      if (fresh.length === 0 && feed.isExhausted) setExhausted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Rebuild the feed whenever the category, mode, or key changes.
  useEffect(() => {
    if (!category.trim()) {
      feedRef.current = null;
      setBuffer([]);
      setExhausted(false);
      setError(null);
      return;
    }
    feedRef.current = new Feed(category, {
      isSeen: (id) => isSeenRef.current(id),
      apiKey,
      mode,
      filters,
    });
    setBuffer([]);
    setExhausted(false);
    setError(null);
    void refill();
    // Rebuild when the category, mode, key, or any filter threshold changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, mode, apiKey, filters.minDurationSec, filters.maxDurationSec, filters.minViews]);

  // Top up the buffer whenever it runs low.
  useEffect(() => {
    if (
      feedRef.current &&
      !loading &&
      !exhausted &&
      !error &&
      buffer.length < MIN_BUFFER
    ) {
      void refill();
    }
  }, [buffer.length, loading, exhausted, error, refill]);

  const advance = useCallback((videoId: string) => {
    setBuffer((prev) => prev.filter((s) => s.videoId !== videoId));
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setExhausted(false);
    void refill();
  }, [refill]);

  return { buffer, loading, error, exhausted, advance, retry };
}
