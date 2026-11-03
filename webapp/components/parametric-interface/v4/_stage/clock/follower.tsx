"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { activeParametricSong } from "../model/songs";
import type { ParametricSong } from "../model/song";
import { SongClockContext, useReducedMotion, type ClockAnchor } from ".";

// A surface without audio: it extrapolates the owner's last anchor on the
// shared wall clock. The owner reports at least once a second while playing;
// when it falls silent for longer than STALE_MS (closed, crashed), the clock
// holds where the owner was last expected to be instead of running on.

const STALE_MS = 3_500;
// rAF stops in occluded windows; the interval keeps the tab title moving there.
const FALLBACK_TICK_MS = 100;

function positionAt(anchor: ClockAnchor, song: ParametricSong, now: number) {
  if (!anchor.playing) return anchor.positionMs;
  const elapsed = Math.min(Math.max(0, now - anchor.at), STALE_MS);
  return Math.min(song.durationMs, anchor.positionMs + elapsed);
}

export function FollowerSongClock({
  anchor,
  children,
  song = activeParametricSong,
}: {
  anchor: ClockAnchor | null;
  children: ReactNode;
  song?: ParametricSong;
}) {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const reducedMotion = useReducedMotion();
  const usable = anchor && anchor.songId === song.id ? anchor : null;

  useEffect(() => {
    if (!usable) return;

    let frame = 0;
    const update = () => setCurrentTimeMs(Math.round(positionAt(usable, song, Date.now())));
    const loop = () => {
      update();
      frame = window.requestAnimationFrame(loop);
    };
    loop();
    const fallback = usable.playing ? window.setInterval(update, FALLBACK_TICK_MS) : 0;

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(fallback);
    };
  }, [song, usable]);

  const clock = useMemo(
    () => ({
      song,
      currentTimeMs: usable ? currentTimeMs : 0,
      hasStarted: Boolean(usable?.started),
      isPlaying: Boolean(usable?.playing),
      reducedMotion,
    }),
    [currentTimeMs, reducedMotion, song, usable],
  );

  return <SongClockContext.Provider value={clock}>{children}</SongClockContext.Provider>;
}
