// Phones moving between apps on their own (after goldfishes pc/mobiles/1's
// hops): at the end of each sung line a phone may leave its app for another
// — not every phone, not every line: each takes the chance HOP_CHANCE, by
// its own dice. How it gets there varies as goldfishes' do: a notification
// tapped open, the swipe along the home bar, or the app switcher.
//
// Pure in (seat, line): the dice are hashes, not Math.random, so a reload or a
// seek lands every phone on the same app it had.

import { VERSE_PHONES, type PhoneState } from "../model/score";

export type HopKind = "open" | "slide" | "switcher";

/** The chance a phone changes app when a line ends. */
export const HOP_CHANCE = 0.35;

/** How a phone moves, weighted: tapping a notification open is the commonest. */
const KINDS: readonly HopKind[] = ["open", "open", "slide", "switcher"];

export type PhonePlan = {
  readonly app: PhoneState;
  /** How the phone arrived at it. */
  readonly kind: HopKind;
  /** The line it arrived on (-1: held since before the song). */
  readonly since: number;
};

/** 0–1 from a seat, a line and a salt. */
function dice(seat: number, line: number, salt: number) {
  let value = Math.imul((seat + 1) ^ Math.imul(line + 7, 0x9e3779b1), 0x85ebca6b) >>> 0;
  value = Math.imul(value ^ (value >>> 13) ^ Math.imul(salt + 1, 0x27d4eb2f), 0xc2b2ae35) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Every phone's app while line `cueIndex` is sung. Phones move in seat order
 * at each line end, and a phone that moves picks among the apps no other
 * phone is in, so the grid never shows one app twice (there are more apps
 * than the default twelve phones; past sixteen phones, repeats are allowed).
 */
export function plansAt(seats: number, cueIndex: number): PhonePlan[] {
  const count = VERSE_PHONES.length;
  const plans: PhonePlan[] = Array.from({ length: seats }, (_, seat) => ({ app: VERSE_PHONES[seat % count]!, kind: "open", since: -1 }));
  for (let line = 1; line <= cueIndex; line += 1) {
    for (let seat = 0; seat < seats; seat += 1) {
      if (dice(seat, line, 1) >= HOP_CHANCE) continue;
      const taken = new Set(plans.map((plan) => plan.app));
      const free = VERSE_PHONES.filter((app) => !taken.has(app));
      const choices = free.length ? free : VERSE_PHONES.filter((app) => app !== plans[seat]!.app);
      const app = choices[Math.floor(dice(seat, line, 2) * choices.length)]!;
      plans[seat] = { app, kind: KINDS[Math.floor(dice(seat, line, 3) * KINDS.length)]!, since: line };
    }
  }
  return plans;
}
