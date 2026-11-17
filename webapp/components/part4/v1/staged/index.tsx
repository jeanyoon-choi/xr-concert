"use client";

import type { ComponentType } from "react";
import type { SectionId } from "../song/sections";
import { sectionOf } from "../song/sections";
import type { LyricCue } from "../timeline/use-lyric-cue";
import { Opening } from "./opening";

// The staged view: each section of the song has its own staging. A section
// without one yet falls back to the phone grid (`fallback`). To stage a
// section, write its component and add it here.

export type StagingProps = { cue: LyricCue };

const STAGINGS: Partial<Record<SectionId, ComponentType<StagingProps>>> = {
  // One staging across both: its phones stay as the song moves from one to the other.
  "verse-1": Opening,
  "pre-chorus-1": Opening,
  "chorus-1": Opening,
};

export function Staged({ cue, fallback }: { cue: LyricCue; fallback: React.ReactNode }) {
  const Staging = STAGINGS[sectionOf(cue.cueIndex)];
  return Staging ? <Staging cue={cue} /> : fallback;
}
