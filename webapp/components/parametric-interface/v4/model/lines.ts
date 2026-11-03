// The lyric as lines, the unit every v4 surface shows. Like v2, each surface
// (phone or tab) takes the whole sung line into its own semantic slot — a
// message, a notification, a search query, a headline — word by word as it is
// sung. Surfaces differ by the interface the score gives them, not by being
// handed fragments. Pure function of the clock: reloads and late joins
// rebuild the same state.

import type { LyricWordTiming } from "../timeline/use-lyric-cue";

export type SungLine = {
  readonly cueIndex: number;
  /** Every word of the line. */
  readonly words: readonly string[];
  /** Words begun so far (all of them once the line is past). */
  readonly sung: number;
  /** The line as typed so far: the begun words, the newest one only up to the characters typed. */
  readonly text: string;
  /** The whole line, joined. */
  readonly full: string;
  readonly startMs: number;
  /** True while this line is being sung. */
  readonly current: boolean;
};

/**
 * The arrived lines, oldest first, at most `limit`; the last one may be
 * partial. `typed` is how many characters of the newest word are typed
 * (default: all of it), so a line grows character by character.
 */
export function sungLines(
  cues: readonly (readonly string[])[],
  timings: readonly LyricWordTiming[],
  wordIndex: number,
  limit: number,
  typed = Infinity,
): SungLine[] {
  if (wordIndex < 0 || limit < 1) return [];
  const now = timings[wordIndex]!;
  const firstCue = Math.max(0, now.cueIndex - limit + 1);
  const starts = new Map<number, number>();
  for (let index = wordIndex; index >= 0; index -= 1) {
    const timing = timings[index]!;
    if (timing.cueIndex < firstCue) break;
    if (timing.wordIndex === 0) starts.set(timing.cueIndex, timing.startMs);
  }

  const lines: SungLine[] = [];
  for (let cueIndex = firstCue; cueIndex <= now.cueIndex; cueIndex += 1) {
    const words = cues[cueIndex]!;
    const current = cueIndex === now.cueIndex;
    const sung = current ? now.wordIndex + 1 : words.length;
    const begun = words.slice(0, sung);
    if (current) begun[sung - 1] = begun[sung - 1]!.slice(0, Math.max(1, typed));
    lines.push({
      cueIndex,
      words,
      sung,
      text: begun.join(" "),
      full: words.join(" "),
      startMs: starts.get(cueIndex) ?? now.startMs,
      current,
    });
  }
  return lines;
}

/** Drop quotes and trailing punctuation, for slots that want plain words (a query, a URL). */
export function plain(text: string) {
  return text.replace(/[“”"«»]/g, "").replace(/[,.:;!?]+$/g, "").trim();
}

/** A URL-path slug of a line. */
export function slug(text: string) {
  return plain(text)
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
