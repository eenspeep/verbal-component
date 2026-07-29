import type { Sample } from "../types";

// Feed filters. A track must sit inside the duration window AND clear the view
// threshold to appear in the deck. These are the out-of-the-box defaults; the
// live values are user-adjustable in Settings.
export const DEFAULT_MIN_DURATION_SEC = 2 * 60; // 2 minutes
export const DEFAULT_MAX_DURATION_SEC = 10 * 60; // 10 minutes
export const DEFAULT_MIN_VIEWS = 500_000; // half a million views

export interface FilterThresholds {
  minDurationSec: number;
  maxDurationSec: number;
  minViews: number;
}

export const DEFAULT_FILTERS: FilterThresholds = {
  minDurationSec: DEFAULT_MIN_DURATION_SEC,
  maxDurationSec: DEFAULT_MAX_DURATION_SEC,
  minViews: DEFAULT_MIN_VIEWS,
};

/** Parse an ISO-8601 duration (e.g. "PT4M13S", "PT1H2M", "PT45S") to seconds. */
export function parseIsoDuration(iso: string | undefined): number {
  if (!iso) return 0;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (+(d || 0)) * 86400 + (+(h || 0)) * 3600 + (+(min || 0)) * 60 + +(s || 0);
}

/** True when a sample is inside the duration window and above the view floor. */
export function passesFilters(sample: Sample, f: FilterThresholds): boolean {
  return (
    sample.durationSec >= f.minDurationSec &&
    sample.durationSec <= f.maxDurationSec &&
    sample.viewCount >= f.minViews
  );
}

/** Format seconds as m:ss (or h:mm:ss for long clips). */
export function formatDuration(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const two = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** Compact view count, e.g. 1.2M, 530K. */
export function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}
