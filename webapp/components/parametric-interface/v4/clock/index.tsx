"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ParametricSong } from "../model/song";

// v4's one song clock. A surface either owns the audio (AudioSongClock) or
// follows an anchor broadcast by the surface that does (FollowerSongClock);
// interfaces read the same state either way.

export type SongClockState = {
  readonly song: ParametricSong;
  readonly currentTimeMs: number;
  readonly hasStarted: boolean;
  readonly isPlaying: boolean;
  readonly reducedMotion: boolean;
};

/** Where the audio was at wall-clock `at` (Date.now()); followers extrapolate from it. */
export type ClockAnchor = {
  readonly songId: string;
  readonly positionMs: number;
  readonly playing: boolean;
  readonly started: boolean;
  readonly at: number;
};

export const SongClockContext = createContext<SongClockState | null>(null);

export function useSongClock() {
  const clock = useContext(SongClockContext);
  if (!clock) throw new Error("useSongClock must be used within a v4 song clock");
  return clock;
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}
