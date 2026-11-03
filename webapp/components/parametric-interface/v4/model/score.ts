// The score (1031 NRF XR idea): for t1 ≤ t ≤ t2 the main surface assigns
// every seat one interface state; the screen and all seats together form one
// compositional state. Each seat stays interactable inside what it was given.
// The score names states only; each surface owns how a state looks.

export type PhoneState = "messages" | "assistant" | "lock";
export type TabState = "search" | "news" | "billboard";

export type ScoreSection = {
  readonly id: string;
  readonly label: string;
  readonly startMs: number;
  /** The state each phone seat holds during this section. */
  readonly phone: (seat: number, seats: number) => PhoneState;
  /** The state each tab seat holds during this section. */
  readonly tab: (seat: number, seats: number) => TabState;
};

const every =
  <T,>(state: T) =>
  () =>
    state;
/** Seats take the states in turn, so neighbours differ. */
const alternate =
  <T,>(...states: readonly T[]) =>
  (seat: number) =>
    states[seat % states.length]!;

// Verses scatter: every seat is a different, ordinary interface, each taking
// the same line in its own way. Each chorus (“We were toxic till the end”)
// pulls everything into unison — every phone locked, every tab a street ad.
// The bridge turns every phone to the assistant and every tab to a search.
// Times are the line starts of the ROSÉ timing.
const verse = {
  phone: alternate<PhoneState>("messages", "assistant", "lock", "assistant", "messages", "lock"),
  tab: alternate<TabState>("search", "news", "billboard", "news", "search", "billboard"),
};
const chorus = { phone: every<PhoneState>("lock"), tab: every<TabState>("billboard") };

export const roseScore: readonly ScoreSection[] = [
  { id: "verse-1", label: "Verse 1", startMs: 0, ...verse },
  { id: "chorus-1", label: "Chorus", startMs: 37_840, ...chorus },
  { id: "verse-2", label: "Verse 2", startMs: 52_340, ...verse },
  { id: "chorus-2", label: "Chorus", startMs: 89_680, ...chorus },
  { id: "bridge", label: "Bridge", startMs: 108_780, phone: every<PhoneState>("assistant"), tab: every<TabState>("search") },
  { id: "chorus-3", label: "Chorus", startMs: 129_760, ...chorus },
];

export function sectionAt(score: readonly ScoreSection[], timeMs: number) {
  let section = score[0]!;
  for (const candidate of score) {
    if (candidate.startMs > timeMs) break;
    section = candidate;
  }
  return section;
}
