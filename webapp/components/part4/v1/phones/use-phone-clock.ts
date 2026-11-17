"use client";

import { useEffect, useState } from "react";
import { anchorSongClock, formatSongClock } from "../clock/wall-clock";
import type { LyricCue } from "../timeline/use-lyric-cue";

/** The time the phones show, "HH:MM": the wall clock, ticking each minute even while the song is stopped. */
export function usePhoneClock(cue: LyricCue) {
  const [, setMinute] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000)), 5_000);
    return () => window.clearInterval(timer);
  }, []);
  anchorSongClock(cue.currentTimeMs);
  return formatSongClock(cue.currentTimeMs);
}
