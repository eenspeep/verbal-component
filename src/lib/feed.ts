import type { Sample } from "../types";
import { searchVideos } from "./youtube";
import { makeDemoSample } from "./demoData";
import { passesFilters, type FilterThresholds } from "./filters";
import { staticFeedSlug, loadStaticFeed } from "./feed-static";

// The Feed produces an effectively endless stream of samples for a category.
// In demo mode it fabricates cards on the fly. In live mode it cycles through a
// set of query variants and paginates each via the YouTube Data API, so a single
// category keeps yielding fresh tracks for a long time.

const QUERY_SUFFIXES = [
  "tabletop rpg music",
  "ambient music",
  "battle music",
  "exploration music",
  "d&d background music",
  "dungeon synth",
  "tavern music",
  "boss battle theme",
  "atmospheric soundscape",
  "relaxing fantasy music",
  "cinematic underscore",
  "campaign session music",
];

// When suffixes are exhausted we re-run them under different orderings to keep
// surfacing new results from the same category.
const ORDERS = ["relevance", "viewCount", "rating", "date"];

export interface FeedDeps {
  /** True once a video has been shown or acted on, so the feed never repeats it. */
  isSeen: (videoId: string) => boolean;
  apiKey: string;
  mode: "live" | "demo";
  filters: FilterThresholds;
}

export class Feed {
  readonly category: string;
  private deps: FeedDeps;

  // Demo cursor.
  private demoIndex = 0;

  // Live cursors.
  private suffixIndex = 0;
  private orderIndex = 0;
  private pageToken: string | undefined = undefined;
  private exhaustedRounds = 0;

  // Static-feed state. `undefined` = not yet checked; an array = a pre-built pool
  // is serving this category (zero live quota); `null` = no static feed exists.
  private staticPool: Sample[] | null | undefined = undefined;
  private staticCursor = 0;
  private staticDone = false;

  constructor(category: string, deps: FeedDeps) {
    this.category = category;
    this.deps = deps;
  }

  /** True once the current source is fully mined for now. */
  get isExhausted(): boolean {
    if (this.staticPool) return this.staticDone;
    return this.deps.mode === "live" && this.exhaustedRounds >= 2;
  }

  /** Fetch the next batch of unseen samples. Returns [] only if truly dry. */
  async loadMore(minCount = 6): Promise<Sample[]> {
    // Prefer a pre-built static feed (real, playable, no live quota) if one exists.
    if (this.staticPool === undefined) {
      const slug = await staticFeedSlug(this.category);
      this.staticPool = slug ? await loadStaticFeed(slug) : null;
    }
    if (this.staticPool) return this.loadStatic(minCount);
    if (this.deps.mode === "demo") return this.loadDemo(minCount);
    return this.loadLive(minCount);
  }

  private loadStatic(count: number): Sample[] {
    const pool = this.staticPool!;
    const out: Sample[] = [];
    while (out.length < count && this.staticCursor < pool.length) {
      const s = pool[this.staticCursor++];
      if (!this.deps.isSeen(s.videoId) && passesFilters(s, this.deps.filters)) out.push(s);
    }
    if (this.staticCursor >= pool.length) this.staticDone = true;
    return out;
  }

  private loadDemo(count: number): Sample[] {
    const out: Sample[] = [];
    let guard = 0;
    while (out.length < count && guard < count * 40) {
      guard++;
      const s = makeDemoSample(this.category, this.demoIndex++, this.deps.filters.tags);
      if (!this.deps.isSeen(s.videoId) && passesFilters(s, this.deps.filters)) out.push(s);
    }
    return out;
  }

  private async loadLive(minCount: number): Promise<Sample[]> {
    const out: Sample[] = [];
    let safety = 0;

    while (out.length < minCount && safety < 8 && !this.isExhausted) {
      safety++;
      const suffix = QUERY_SUFFIXES[this.suffixIndex];
      // Tags are applied purely as a post-filter (in passesFilters), NOT folded
      // into the query, so changing tags reuses the cached category pages for the
      // same query instead of spending fresh search quota on every tweak.
      const query = `${this.category} ${suffix}`.trim();

      let page;
      try {
        page = await searchVideos(
          this.deps.apiKey,
          query,
          this.category,
          this.deps.filters,
          this.pageToken,
          ORDERS[this.orderIndex],
        );
      } catch (err) {
        // Surface the first error to the caller so the UI can explain it,
        // rather than silently spinning.
        if (out.length === 0) throw err;
        break;
      }

      for (const s of page.samples) {
        if (!this.deps.isSeen(s.videoId) && !out.some((o) => o.videoId === s.videoId)) {
          out.push(s);
        }
      }

      if (page.nextPageToken) {
        this.pageToken = page.nextPageToken;
      } else {
        // Move to the next query variant; wrap to the next ordering after that.
        this.pageToken = undefined;
        this.suffixIndex++;
        if (this.suffixIndex >= QUERY_SUFFIXES.length) {
          this.suffixIndex = 0;
          this.orderIndex++;
          if (this.orderIndex >= ORDERS.length) {
            this.exhaustedRounds++;
            this.orderIndex = 0;
          }
        }
      }
    }

    return out;
  }
}
