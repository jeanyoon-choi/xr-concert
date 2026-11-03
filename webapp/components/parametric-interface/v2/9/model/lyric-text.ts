// How the article page sets a lyric word or line in its own typography.

// Headline case as nytimes.com sets it: minor words lowercase unless first.
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "if", "in", "nor",
  "of", "off", "on", "or", "the", "to", "vs.",
]);

export function headlineCase(word: string, isFirst: boolean) {
  const bare = word.toLowerCase().replace(/[^a-z.']/g, "");
  if (!isFirst && MINOR_WORDS.has(bare)) return word.toLowerCase();
  return word.replace(/[A-Za-z]/, (letter) => letter.toUpperCase());
}

// The page sets typographic quotes and apostrophes.
export function typographic(text: string) {
  return text.replace(/(^|\s)"/g, "$1“").replace(/"/g, "”").replace(/'/g, "’");
}

export function headlineOf(words: readonly string[]) {
  return typographic(words.map((word, index) => headlineCase(word, index === 0)).join(" "));
}

export function sentenceOf(words: readonly string[]) {
  return typographic(words.join(" "));
}

// A word as a navigation link: outer punctuation dropped, headline case.
export function linkOf(word: string) {
  return typographic(headlineCase(word.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, ""), true));
}
