"use client";

import { useMemo } from "react";
import { useSongClock } from "../clock";
import { getLyricCues, getLyricWordTimings } from "../song/lyrics";

// Words are chosen slightly ahead of the audio clock so the rendered word lands
// on the sung onset despite per-frame read and render delay (v2's measured lead).
export const LYRIC_LEAD_MS = 120;

export type LyricWordTiming = ReturnType<typeof getLyricWordTimings>[number];

function wordIndexAt(timeMs: number, wordTimings: readonly LyricWordTiming[]) {
  let index = 0;

  for (let nextIndex = 1; nextIndex < wordTimings.length; nextIndex += 1) {
    if (timeMs < wordTimings[nextIndex]!.startMs) break;
    index = nextIndex;
  }

  return index;
}

/**
 * The lyric at the clock. `wordIndex`, `cueIndex` and `activeWordPosition`
 * are -1 until the first word is reached, so a phone can stay empty before
 * the song.
 */
export function useLyricCue() {
  const { currentTimeMs, hasStarted, isPlaying, reducedMotion, song } = useSongClock();
  const wordTimings = useMemo(() => getLyricWordTimings(song), [song]);
  const lyricCues = useMemo(() => getLyricCues(song), [song]);
  const leadTimeMs = currentTimeMs + LYRIC_LEAD_MS;
  const reached = hasStarted && leadTimeMs >= wordTimings[0]!.startMs;
  const wordIndex = reached ? wordIndexAt(leadTimeMs, wordTimings) : -1;

  return useMemo(() => {
    const current = wordIndex >= 0 ? wordTimings[wordIndex]! : null;

    return {
      wordIndex,
      currentTimeMs,
      hasStarted,
      isPlaying,
      reducedMotion,
      song,
      lyricCues,
      wordTimings,
      cueIndex: current?.cueIndex ?? -1,
      currentWord: current?.word ?? null,
      lyric: current ? lyricCues[current.cueIndex]! : [],
      activeWordPosition: current?.wordIndex ?? -1,
    };
  }, [currentTimeMs, hasStarted, isPlaying, lyricCues, reducedMotion, song, wordIndex, wordTimings]);
}

export type LyricCue = ReturnType<typeof useLyricCue>;
