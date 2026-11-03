"use client";

import { useMemo } from "react";
import { sungLines } from "../model/lines";
import { LYRIC_LEAD_MS, type LyricCue } from "./use-lyric-cue";

// The arrived lines at the clock, oldest first. The newest word is typed
// character by character from its onset, at a typing pace that never runs
// past the next word, so every lyric slot grows as if typed. Recomputed only
// when a character appears; one array is shared by every surface on a page.

/** A typist's pace per character, capped so a word finishes before the next one. */
const CHARACTER_MS = 55;

function typedCharacters(cue: LyricCue) {
  const word = cue.wordIndex >= 0 ? cue.wordTimings[cue.wordIndex] : undefined;
  if (!word) return Infinity;
  const length = word.word.length;
  const span = Math.min(length * CHARACTER_MS, word.durationMs * 0.8);
  const elapsed = cue.currentTimeMs + LYRIC_LEAD_MS - word.startMs;
  return span <= 0 ? length : Math.min(length, Math.max(1, Math.ceil((elapsed / span) * length)));
}

export function useSungLines(cue: LyricCue, limit: number) {
  const { lyricCues, wordTimings, wordIndex } = cue;
  const typed = typedCharacters(cue);
  return useMemo(() => sungLines(lyricCues, wordTimings, wordIndex, limit, typed), [limit, lyricCues, typed, wordIndex, wordTimings]);
}
