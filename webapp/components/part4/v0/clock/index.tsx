"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ParametricSong } from "../song/song";

// part4's one song clock: AudioSongClock (audio.tsx) owns the audio, and
// every interface under it reads this state.

export type SongClockState = {
  readonly song: ParametricSong;
  readonly currentTimeMs: number;
  readonly hasStarted: boolean;
  readonly isPlaying: boolean;
  readonly reducedMotion: boolean;
};

export const SongClockContext = createContext<SongClockState | null>(null);

export function useSongClock() {
  const clock = useContext(SongClockContext);
  if (!clock) throw new Error("useSongClock must be used within a part4 song clock");
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
