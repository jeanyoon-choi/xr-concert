// The score (1031 NRF XR idea): for t1 ≤ t ≤ t2 the main surface assigns
// every seat one interface state; the screen and all seats together form one
// compositional state. Each seat stays interactable inside what it was given.
// The score names states only; each surface owns how a state looks.

import type { AppId } from "../mobiles/feed/apps/types";
import type { InterfaceKey } from "../interfaces/registry";

/** A phone shows Messages, its lock screen, or one of the app clones. */
export type PhoneState = "messages" | "lock" | AppId;
/** A window shows one of v2's interfaces. */
export type TabState = InterfaceKey;

export type ScoreSection = {
  readonly id: string;
  readonly label: string;
  readonly startMs: number;
  /** The state each phone seat holds during this section. */
  readonly phone: (seat: number, seats: number) => PhoneState;
  /** The state each window seat holds during this section. */
  readonly tab: (seat: number, seats: number) => TabState;
};

const every =
  <T,>(state: T) =>
  () =>
    state;
/** Seats take the states in turn; each run is turned by three, so a grid mixes rather than stacking one state per column. */
const rotate =
  <T,>(...states: readonly T[]) =>
  (seat: number) =>
    states[(seat + Math.floor(seat / states.length) * 3) % states.length]!;

// Verses scatter: every seat is a different, ordinary interface, each taking
// the same line in its own way. Each chorus (“We were toxic till the end”)
// pulls everything into unison: every phone locked, every window the same
// interface. Times are the line starts of the ROSÉ timing.
const verse = {
  phone: rotate<PhoneState>("messages", "x", "instagram", "tinder", "linkedin", "news", "facebook", "yelp", "netflix"),
  tab: rotate<TabState>("5", "2", "7", "4", "3", "6", "8", "1"),
};
const lock = every<PhoneState>("lock");

export const roseScore: readonly ScoreSection[] = [
  { id: "verse-1", label: "Verse 1", startMs: 0, ...verse },
  { id: "chorus-1", label: "Chorus", startMs: 37_840, phone: lock, tab: every<TabState>("5") },
  { id: "verse-2", label: "Verse 2", startMs: 52_340, ...verse },
  { id: "chorus-2", label: "Chorus", startMs: 89_680, phone: lock, tab: every<TabState>("4") },
  { id: "bridge", label: "Bridge", startMs: 108_780, phone: every<PhoneState>("messages"), tab: every<TabState>("6") },
  { id: "chorus-3", label: "Chorus", startMs: 129_760, phone: lock, tab: every<TabState>("2") },
];

export function sectionAt(score: readonly ScoreSection[], timeMs: number) {
  let section = score[0]!;
  for (const candidate of score) {
    if (candidate.startMs > timeMs) break;
    section = candidate;
  }
  return section;
}
