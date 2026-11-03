// Phones moving between apps (after goldfishes pc/mobiles/1's hops), by
// passage: the lyric falls into passages — wider than a line, narrower than
// a verse (PASSAGES). When a passage ends, the dice decide once for the
// whole grid: either every phone moves to another app together, each to a
// different one, or none does.
//
// Pure in (seats, part): the dice are hashes, not Math.random, so a reload
// or a seek lands every phone on the same app it had.

import { VERSE_PHONES, type PhoneState } from "../model/score";

/**
 * How long a move takes. A move is always centred on the moment the new
 * passage begins: it starts MOVE_MS / 2 before and ends MOVE_MS / 2 after,
 * whatever MOVE_MS is.
 */
export const MOVE_MS = 750;

/** How long before a move the next app is mounted, out of sight, so the move itself only moves. */
export const PRELOAD_MS = 700;

/** The chance the grid changes apps when a passage ends. */
export const PASSAGE_CHANCE = 0.7;

/**
 * The first line (cue index) of each passage of “toxic till the end”. Each
 * “We were toxic …” line is a passage of its own.
 */
export const PASSAGES: readonly number[] = [0, 2, 4, 8, 11, 12, 15, 16, 19, 21, 25, 28, 29, 32, 33, 35, 37, 40, 41, 44];

/** The passage a line belongs to (0 before the song). */
export function passageOf(cueIndex: number) {
  let passage = 0;
  for (let index = 1; index < PASSAGES.length; index += 1) if (PASSAGES[index]! <= cueIndex) passage = index;
  return passage;
}

/** 0–1 from a passage and a salt. */
function dice(part: number, salt: number) {
  let value = Math.imul(Math.imul(part + 7, 0x9e3779b1) ^ 0x51ed27, 0x85ebca6b) >>> 0;
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
  const count = VERSE_PHONES.length;
  let turn = 0;
  for (let boundary = 1; boundary <= passage; boundary += 1) {
    // At least four places, so no phone is handed its neighbour's app.
    if (dice(boundary, 1) < PASSAGE_CHANCE) turn += 4 + Math.floor(dice(boundary, 2) * (count - 7));
  }
  return Array.from({ length: seats }, (_, seat) => VERSE_PHONES[(seat + turn) % count]!);
}
