// The contract every phone state in v4/1_mobiles meets (apps/<state>/index.tsx).
//
// A state is one iOS interface drawn at native points on the 390 × 844 glass
// (1 CSS px = 1 pt; the phone zooms the whole frame). Like a v2 interface, it
// receives the sung lines — oldest first, the last one growing word by word —
// and places them in its own semantic slot. It stays interactable: whatever
// the participant does is reported through `act`, kept by the phone, and
// survives the score moving the seat to another state and back. No timers,
// no global listeners, no viewport units.

import type { SungLine } from "../../model/lines";
import type { PhoneState } from "../../model/score";

/** Something the participant sent from this phone, placed after the line it followed. */
export type Reply = { readonly id: number; readonly text: string; readonly afterCue: number };

export type PhoneAction =
  | { readonly kind: "reply"; readonly text: string }
  | { readonly kind: "open"; readonly state: PhoneState };

export type PhoneStateProps = {
  readonly seat: number;
  readonly lines: readonly SungLine[];
  readonly replies: readonly Reply[];
  /** Status-bar time for the song moment, “21:31”. */
  readonly clock: string;
  /** Whether this state is the one shown; hidden states keep their DOM and draft. */
  readonly shown: boolean;
  readonly reducedMotion: boolean;
  readonly act: (action: PhoneAction) => void;
};

/** Whom each seat's phone hears from: many people's phones, one song. */
const CONTACTS = [
  { name: "Daniel", initials: "D", tint: "#8e96a8" },
  { name: "Jae", initials: "J", tint: "#a99486" },
  { name: "Minseo", initials: "M", tint: "#8aa39a" },
  { name: "Theo", initials: "T", tint: "#9c8fb0" },
  { name: "Ari", initials: "A", tint: "#b09a7c" },
  { name: "Sam", initials: "S", tint: "#7f9bb3" },
] as const;

export function contactFor(seat: number) {
  return CONTACTS[seat % CONTACTS.length]!;
}
