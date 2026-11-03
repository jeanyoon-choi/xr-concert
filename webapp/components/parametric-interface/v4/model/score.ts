// The score (1031 NRF XR idea): for t1 ≤ t ≤ t2 the main surface assigns
// every seat one interface state; the screen and all seats together form one
// compositional state. Each seat stays interactable inside what it was given.
// The score names states only; each surface owns how a state looks.

import type { InterfaceKey } from "../interfaces/registry";

/** Where a phone holds text: chats, social posts and comments, a note, the lock screen. */
export type PhoneState =
  | "messages"
  | "kakaotalk"
  | "instagram-dm"
  | "whatsapp"
  | "x"
  | "chatgpt"
  | "telegram"
  | "tiktok"
  | "slack"
  | "instagram"
  | "line"
  | "discord"
  | "youtube"
  | "threads"
  | "messenger"
  | "notes"
  | "lock";

/** The verses' deal: sixteen interfaces, so twelve phones never repeat one. */
export const VERSE_PHONES: readonly PhoneState[] = [
  "messages", "kakaotalk", "instagram-dm", "whatsapp", "x", "chatgpt", "telegram", "tiktok",
  "slack", "instagram", "line", "discord", "youtube", "threads", "messenger", "notes",
];
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

// Phones: every seat keeps its own app the whole song, each taking the same
// line in its own way; only while a “We were toxic …” line is sung does
// every phone fall to its lock screen (phoneAt), the line arriving as each
// app's notification, and the next line returns every phone to its app.
// Windows: verses scatter; each chorus pulls every window into one
// interface. Times are the line starts of the ROSÉ timing.
const verse = {
  phone: (seat: number) => VERSE_PHONES[seat % VERSE_PHONES.length]!,
  tab: rotate<TabState>("5", "2", "7", "4", "3", "6", "8", "1"),
};
const phones = { phone: verse.phone };

export const roseScore: readonly ScoreSection[] = [
  { id: "verse-1", label: "Verse 1", startMs: 0, ...verse },
  { id: "chorus-1", label: "Chorus", startMs: 37_840, ...phones, tab: every<TabState>("5") },
  { id: "verse-2", label: "Verse 2", startMs: 52_340, ...verse },
  { id: "chorus-2", label: "Chorus", startMs: 89_680, ...phones, tab: every<TabState>("4") },
  { id: "bridge", label: "Bridge", startMs: 108_780, ...phones, tab: every<TabState>("6") },
  { id: "chorus-3", label: "Chorus", startMs: 129_760, ...phones, tab: every<TabState>("2") },
];

/**
 * The lines that lock every phone: every “We were toxic …” — “till the end”,
 * “till the end, end, end”, and the bare “We were toxic”.
 */
export function isLockLine(lyric: readonly string[]) {
  return lyric.join(" ").startsWith("We were toxic");
}

/** A phone's state for the line being sung: its own app, or the lock screen on a lock line. */
export function phoneAt(section: ScoreSection, lyric: readonly string[], seat: number, seats: number): PhoneState {
  return isLockLine(lyric) ? "lock" : section.phone(seat, seats);
}

export function sectionAt(score: readonly ScoreSection[], timeMs: number) {
  let section = score[0]!;
  for (const candidate of score) {
    if (candidate.startMs > timeMs) break;
    section = candidate;
  }
  return section;
}
