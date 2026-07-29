# 🎲 Verbal Component

A **Tinder-style swipe interface for building tabletop-RPG playlists on YouTube Music.**
Search a vibe — `pokemon`, `medieval`, `relaxed`, `boss battle` — and get an
endless flow of tracks to triage. Each card shows **three auto-generated keywords
before you press play**, so you can judge a track at a glance. Then:

- **Swipe right → Yes** — add it to the playlist for this vibe
- **Swipe left → Nope** — skip it forever
- **Swipe up → Still thinking** — park it in a queue to revisit later
- **Sort** — file it into *any other* playlist (or spin up a new one on the spot)

<sub>Swipe with the mouse/touch, tap the big buttons, or use the keyboard:
`←` Nope · `→` Yes · `↑` Thinking · `S` Sort.</sub>

---

## Two modes

| | Demo mode (default) | Live mode |
|---|---|---|
| Setup | None — just run it | A Google API key (+ OAuth to sync) |
| Cards | Realistic fabricated tracks | Real YouTube search results |
| Playback | "Listen ↗" opens YouTube Music | Inline preview player on the card |
| Playlists | Built & saved locally | Locally **and** synced to your YouTube Music |

Everything about the *interface* — swiping, keyword chips, sorting, the still-thinking
queue, building playlists — works fully in demo mode with zero configuration. Add an
API key to light up real search, playback, and syncing.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

Build a static bundle for hosting:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the built bundle locally
```

`dist/` is a plain static site — deploy it to GitHub Pages, Netlify, Vercel, or any
static host. (For a GitHub Pages *project* site served from a subpath, set `base` in
`vite.config.ts` to `"/<repo-name>/"`.)

---

## Going live (real search + playback + syncing)

Everything runs in your browser — there is no server and your credentials never
leave your machine (they're kept in `localStorage`). You supply your own Google
credentials so the playlists are created on **your** account.

### 1. YouTube Data API key — enables search & playback

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → Library →** enable **YouTube Data API v3**.
3. **APIs & Services → Credentials → Create credentials → API key.**
4. Paste it into Verbal Component's **Settings → API key**. The badge flips to **LIVE**.

### 2. OAuth Client ID — enables syncing playlists to YouTube Music

1. **APIs & Services → Credentials → Create credentials → OAuth client ID.**
2. Application type: **Web application**.
3. Under **Authorized JavaScript origins**, add the exact origin where you run
   Verbal Component (Settings shows it for you — e.g. `http://localhost:5173`, or your
   deployed URL).
4. Paste the client ID into **Settings → OAuth Client ID**, then **Connect Google**.
5. While your OAuth consent screen is in "testing", add your Google account as a
   **test user** so sign-in is allowed.

Now each playlist has a **Sync to YouTube Music →** button that creates a private
playlist on your account and adds every track. Playlists created on YouTube show up
in the YouTube Music app under *Library → Playlists*. Flip on **auto-sync** in
Settings to write each Yes/Sort through immediately instead.

> **Prefer not to type them each visit?** Copy `.env.example` to `.env`, fill in
> `VITE_YT_API_KEY` / `VITE_YT_OAUTH_CLIENT_ID`, and rebuild — they become the
> defaults. Never commit a real `.env` (it's git-ignored).

### A note on quota

The free YouTube Data API tier is ~10,000 units/day, and each search costs 100
units (≈100 searches/day). Verbal Component paginates and rotates through query variants,
so a single search term keeps yielding fresh tracks for a long time before it needs
another API call. If you hit the ceiling, the deck tells you and you can resume the
next day.

---

## How the keywords work

The three chips on each card are generated **locally** — no LLM, no extra API calls,
instant and offline. `src/lib/keywords.ts` scores words from the track's title
(weighted highest), description, and the category, boosting a curated lexicon of
mood/scene/genre words (`tavern`, `battle`, `ambient`, `orchestral`, `eerie`, …) and
filtering out noise (`official`, `1 hour`, `soundtrack`, …). The top three become the
keywords, padded with on-theme fallbacks when a title is sparse.

---

## Project layout

```
src/
  App.tsx               State orchestration + view routing
  store.ts              Reducer: playlists, active target, thinking queue, seen/decided
  types.ts              Domain types
  hooks/useFeed.ts      Buffers the endless sample stream, tops up when low
  lib/
    feed.ts             Never-ending feed (demo generator / live paginated search)
    youtube.ts          YouTube Data API v3: search + playlist writes
    google.ts           Google Identity Services OAuth (browser token flow)
    keywords.ts         Local 3-keyword generator
    demoData.ts         Deterministic demo cards
    storage.ts          localStorage persistence
  components/
    SwipeCard.tsx       The draggable card + inline player
    CardDeck.tsx        Card stack, keyboard shortcuts, sort flow
    ActionBar.tsx       Nope / Thinking / Sort / Yes
    SortMenu.tsx        Bottom-sheet "file into a playlist"
    PlaylistPanel.tsx   Playlists + per-playlist YouTube sync
    ThinkingPanel.tsx   The "still thinking" queue
    SettingsPanel.tsx   Credentials + preferences
    TopBar.tsx / CategoryBar.tsx / KeywordChips.tsx / CoverArt.tsx
```

## Privacy

No backend and no analytics. Your playlists, thinking queue, swipe history, and API
credentials all live in your browser's `localStorage`. **Reset local data** in
Settings clears them; it never touches playlists already synced to YouTube.
