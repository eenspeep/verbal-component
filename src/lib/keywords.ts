// Auto-generate three "vibe" keywords for a track from its title/description.
// Pure and local — no API, no LLM — so keywords are ready before you press play.

/** Words that describe mood/scene/genre. Matches here are boosted heavily. */
const VIBE_LEXICON: Record<string, number> = {};
const VIBE_WORDS = [
  // moods
  "epic", "calm", "relaxing", "relaxed", "peaceful", "serene", "tense", "dark",
  "ominous", "eerie", "haunting", "mysterious", "melancholy", "somber", "uplifting",
  "heroic", "triumphant", "dramatic", "sad", "hopeful", "cozy", "dreamy", "ethereal",
  "gentle", "soothing", "meditative", "chill", "mellow", "warm", "cold", "frozen",
  // scenes / places
  "tavern", "dungeon", "forest", "cave", "castle", "village", "town", "city",
  "market", "temple", "shrine", "swamp", "desert", "tundra", "ocean", "sea",
  "harbor", "ship", "mountain", "cavern", "ruins", "graveyard", "crypt", "library",
  "wilderness", "campfire", "inn", "throne", "dungeons", "underdark", "sewer",
  // action / function
  "battle", "combat", "boss", "chase", "ambush", "victory", "exploration",
  "adventure", "travel", "journey", "quest", "encounter", "stealth", "ritual",
  "puzzle", "downtime", "rest", "ambience", "ambient", "soundscape", "loop",
  // genre / instrumentation
  "orchestral", "cinematic", "chiptune", "8bit", "lofi", "synthwave", "medieval",
  "celtic", "fantasy", "folk", "choir", "piano", "strings", "percussion", "drums",
  "flute", "harp", "guitar", "electronic", "acoustic", "instrumental", "atmospheric",
  // creatures / factions
  "dragon", "goblin", "undead", "demon", "elf", "elven", "dwarven", "orc",
  "vampire", "witch", "wizard", "knight", "pirate", "bandit", "cult",
];
for (const w of VIBE_WORDS) VIBE_LEXICON[w] = 6;

/** Noise words that should never become keywords. */
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "of", "to", "in", "on",
  "at", "by", "from", "is", "are", "was", "be", "this", "that", "your", "you",
  "music", "song", "songs", "track", "tracks", "audio", "sound", "sounds",
  "official", "video", "lyric", "lyrics", "hd", "hq", "4k", "1080p", "full",
  "hour", "hours", "min", "mins", "minute", "minutes", "extended", "version",
  "ost", "soundtrack", "theme", "mix", "playlist", "vol", "volume", "part",
  "ft", "feat", "featuring", "remix", "cover", "live", "new", "best", "top",
  "free", "no", "copyright", "royalty", "download", "release", "album", "ep",
  "background", "bgm", "d", "dd", "5e", "rpg", "ttrpg", "tabletop", "roleplay",
  "roleplaying", "game", "gaming", "session", "campaign", "dnd", "pathfinder",
  "youtube", "subscribe", "channel", "www", "http", "https", "com", "watch",
]);

/** Category-appropriate fallbacks, used to pad up to three keywords. */
const FALLBACK = ["Ambient", "Atmospheric", "Instrumental", "Cinematic", "Loopable"];

function titleCase(word: string): string {
  if (word === "8bit") return "8-bit";
  if (word === "lofi") return "Lo-Fi";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Score candidate words from the title (weighted highest), description, and
 * category, then return the top three as Title-Cased keywords.
 */
export function generateKeywords(input: {
  title: string;
  description?: string;
  channelTitle?: string;
  category: string;
}): [string, string, string] {
  const scores = new Map<string, number>();

  const bump = (word: string, amount: number) => {
    if (word.length < 3 || word.length > 16) return;
    if (STOPWORDS.has(word)) return;
    if (/^\d+$/.test(word)) return;
    const vibe = VIBE_LEXICON[word] ?? 0;
    scores.set(word, (scores.get(word) ?? 0) + amount + vibe);
  };

  // Title words carry the most signal; earlier words slightly more.
  const titleTokens = tokenize(input.title);
  titleTokens.forEach((w, i) => bump(w, 4 + Math.max(0, 3 - i * 0.5)));

  // Description gives supporting context.
  tokenize((input.description ?? "").slice(0, 240)).forEach((w) => bump(w, 1));

  // The category itself is always a fair descriptor.
  tokenize(input.category).forEach((w) => bump(w, 3));

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => titleCase(word));

  const picked: string[] = [];
  for (const word of ranked) {
    if (picked.length >= 3) break;
    // Avoid near-duplicates (e.g. "forest" and "forests").
    if (picked.some((p) => p.toLowerCase().startsWith(word.toLowerCase().slice(0, 4)))) {
      continue;
    }
    picked.push(word);
  }

  // Seed fallbacks with the category so padding still feels on-theme.
  const catWord = tokenize(input.category)[0];
  const fallbacks = catWord ? [titleCase(catWord), ...FALLBACK] : FALLBACK;
  for (const f of fallbacks) {
    if (picked.length >= 3) break;
    if (!picked.includes(f)) picked.push(f);
  }

  return [picked[0], picked[1], picked[2]] as [string, string, string];
}
