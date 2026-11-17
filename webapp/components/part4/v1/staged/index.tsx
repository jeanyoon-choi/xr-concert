"use client";

import { STATE_GROUPS, type PhoneState } from "../phones/states";
import type { SectionId } from "../song/sections";
import type { LyricCue } from "../timeline/use-lyric-cue";
import { BRIDGE } from "./bridge";
import { StagedField } from "./field";
import { FINAL_CHORUS_WHISPER } from "./final-chorus";
import { OPENING } from "./opening";
import type { Scenario } from "./scenario";
import { SPOKEN_INTERLUDE } from "./spoken-interlude";
import { VERSE_2 } from "./verse-2";

// The staged view: the song, section by section, on one field of phones
// that stays up throughout (./field.tsx).
// - Scenarios, each its own file, tell the phones what to send for a stretch
//   of the song: ./opening.ts (Verse 1, pc1), ./spoken-interlude.ts,
//   ./verse-2.ts (Verse 2, pc2), ./bridge.ts, ./final-chorus.ts (its whispered opening).
//   To stage another stretch, write its scenario and add it to SCENARIOS.
// - Elsewhere the phones follow the score; which apps a section deals from
//   is set in POOLS, and a section not named there deals from the apps
//   chosen in the options control.

const group = (id: (typeof STATE_GROUPS)[number]["id"]): readonly PhoneState[] =>
  STATE_GROUPS.find((entry) => entry.id === id)!.states.filter((state) => state !== "lock");

const POOLS: Partial<Record<SectionId, readonly PhoneState[]>> = {
  // The choruses: the phones go between the media apps.
  "chorus-1": group("media"),
  "chorus-2": group("media"),
  // From the high “We were toxic” of the Final Chorus to the end (its whispered opening is a scenario).
  "final-chorus": group("media"),
  outro: group("media"),
};

/** How much larger a section sets the lyric, where its phones follow the score. */
const SCALES: Partial<Record<SectionId, number>> = {};

/** In song order. */
const SCENARIOS: readonly Scenario[] = [OPENING, SPOKEN_INTERLUDE, VERSE_2, BRIDGE, FINAL_CHORUS_WHISPER];

export function Staged({ cue, pool, locked }: { cue: LyricCue; pool: readonly PhoneState[]; locked: boolean }) {
  return <StagedField cue={cue} scenarios={SCENARIOS} pool={pool} pools={POOLS} scales={SCALES} locked={locked} />;
}
