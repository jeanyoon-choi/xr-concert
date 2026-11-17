"use client";

import { useMemo } from "react";
import type { LyricCue } from "../timeline/use-lyric-cue";
import { APPS, type PhoneState } from "./states";

// The phones' score. The lyric falls into passages — wider than a line,
// narrower than a verse (PASSAGES). When a passage ends, the dice decide
// once for the whole grid: either every phone moves to another app together,
// each to a different one, or none does (after goldfishes pc/mobiles/1's
// hops). Every “We were toxic …” line locks every phone.
//
// Pure in (seats, passage): the dice are hashes, not Math.random, so a reload
// or a seek lands every phone on the app it had.

/**
 * How long a move takes. A move is always centred on the moment the new
 * passage begins: it starts MOVE_MS / 2 before and ends MOVE_MS / 2 after,
 * whatever MOVE_MS is.
 */
export const MOVE_MS = 750;

/** How long before a move the next app is mounted, out of sight, so the move itself only moves. */
const PRELOAD_MS = 700;

/** Phones mount their next app this far apart, so the mounts never land in one frame. */
const PRELOAD_STAGGER_MS = 40;

/** The chance the grid changes apps when a passage ends. */
const PASSAGE_CHANCE = 0.7;

/**
 * The first line (cue index) of each passage of “toxic till the end”. Each
 * “We were toxic …” line is a passage of its own.
 */
const PASSAGES: readonly number[] = [0, 2, 4, 8, 11, 12, 15, 16, 19, 21, 25, 28, 29, 32, 33, 35, 37, 40, 41, 44];

/**
 * The lines that lock every phone: every “We were toxic …” — “till the end”,
 * “till the end, end, end”, and the bare “We were toxic”.
 */
export function isLockLine(lyric: readonly string[]) {
  return lyric.join(" ").startsWith("We were toxic");
}

/** 0–1 from a passage and a salt. */
function dice(passage: number, salt: number) {
  let value = Math.imul(Math.imul(passage + 7, 0x9e3779b1) ^ 0x51ed27, 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13) ^ Math.imul(salt + 1, 0x27d4eb2f), 0xc2b2ae35) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Every phone's app during passage `passage`. At each passage change the dice
 * either leave the grid as it is or turn every phone the same number of
 * places along the app list: all move, together, and no two phones land on
 * the same app.
 */
export function appsAt(seats: number, passage: number): PhoneState[] {
  const count = APPS.length;
  let turn = 0;
  for (let boundary = 1; boundary <= passage; boundary += 1) {
    // At least four places, so no phone is handed its neighbour's app.
    if (dice(boundary, 1) < PASSAGE_CHANCE) turn += 4 + Math.floor(dice(boundary, 2) * (count - 7));
  }
  return Array.from({ length: seats }, (_, seat) => APPS[(seat + turn) % count]!);
}

export type PhoneScore = {
  /** The app each seat is in. */
  readonly apps: readonly PhoneState[];
  /** The app each seat moves to next, once it is time to mount it out of sight (null: none coming). */
  readonly upcoming: readonly (PhoneState | null)[];
  /** Whether a lock line is being sung. */
  readonly locked: boolean;
};

/**
 * The score at the clock. The clock moves every frame; what this returns
 * changes only when a passage turns, a phone's preload comes due or a lock
 * line begins or ends, so the grid can skip every frame in between.
 */
export function usePhoneScore(cue: LyricCue, seats: number): PhoneScore {
  const { currentTimeMs, wordTimings } = cue;
  // Passage starts in song time; a move is centred on each.
  const moveStarts = useMemo(
    () => PASSAGES.map((cueIndex) => (wordTimings.find((word) => word.cueIndex === cueIndex)?.startMs ?? 0) - MOVE_MS / 2),
    [wordTimings],
  );
  const begun = cue.wordIndex >= 0 || currentTimeMs > 0;
  /** The passage whose apps show at time `t`: its move started MOVE_MS / 2 before it begins. */
  const passageAt = (t: number) => {
    if (!begun) return 0;
    let passage = 0;
    for (let index = 1; index < moveStarts.length; index += 1) if (moveStarts[index]! <= t) passage = index;
    return passage;
  };

  const passage = passageAt(currentTimeMs);
  // How many seats, counted from the first, already hold the next passage's app out of sight.
  let preloading = 0;
  while (preloading < seats && passageAt(currentTimeMs + PRELOAD_MS - preloading * PRELOAD_STAGGER_MS) !== passage) preloading += 1;
  const locked = isLockLine(cue.lyric);

  return useMemo(() => {
    const apps = appsAt(seats, passage);
    const next = preloading > 0 ? appsAt(seats, passage + 1) : apps;
    return {
      apps,
      upcoming: apps.map((app, seat) => (seat < preloading && next[seat] !== app ? next[seat]! : null)),
      locked,
    };
  }, [locked, passage, preloading, seats]);
}
