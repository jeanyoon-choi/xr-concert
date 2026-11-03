"use client";

import { useMemo } from "react";
import { sungLines } from "../model/lines";
import type { LyricCue } from "./use-lyric-cue";

/**
 * The arrived lines at the clock, oldest first, recomputed only when the sung
 * word changes. One array is shared by every surface on the page.
 */
export function useSungLines(cue: LyricCue, limit: number) {
  const { lyricCues, wordTimings, wordIndex } = cue;
  return useMemo(() => sungLines(lyricCues, wordTimings, wordIndex, limit), [limit, lyricCues, wordIndex, wordTimings]);
}
