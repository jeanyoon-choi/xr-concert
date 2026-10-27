"use client";

import { useMemo } from "react";
import { getLyricCues, getLyricWordTimings } from "../model/lyrics";
import { useSongPlayback } from "../playback";

// Words are chosen slightly ahead of the audio clock so the rendered word lands
// on the sung onset despite per-frame read and render delay.
const LYRIC_LEAD_MS = 120;

function getWordIndex(currentTimeMs: number, wordTimings: ReturnType<typeof getLyricWordTimings>) {
  let index = 0;

  for (let nextIndex = 1; nextIndex < wordTimings.length; nextIndex += 1) {
    if (currentTimeMs < wordTimings[nextIndex]!.startMs) break;
    index = nextIndex;
  }

  return index;
}

export function useLyricCue() {
  const { currentTimeMs, hasStarted, isPlaying, reducedMotion, song } = useSongPlayback();
  const wordTimings = useMemo(() => getLyricWordTimings(song), [song]);
  const lyricCues = useMemo(() => getLyricCues(song), [song]);
  const wordIndex = getWordIndex(currentTimeMs + LYRIC_LEAD_MS, wordTimings);

  return useMemo(() => {
    const current = wordTimings[wordIndex]!;
    const previous = wordTimings[Math.max(0, wordIndex - 1)]!;

    return {
      wordIndex,
      cycleIndex: 0,
      currentTimeMs,
      hasStarted,
      isPlaying,
      reducedMotion,
      song,
      cueIndex: current.cueIndex,
      lyricCues,
      wordTimings,
      currentWord: current.word,
      previousWord: previous.word,
      lyric: lyricCues[current.cueIndex]!,
      activeWordPosition: current.wordIndex,
    };
  }, [currentTimeMs, hasStarted, isPlaying, lyricCues, reducedMotion, song, wordIndex, wordTimings]);
}
