import { line, shout, type Scenario } from "./scenario";

// Verse 1 and Pre-Chorus 1 (pc1): phones come in one at a time, each an empty
// 1:1 KakaoTalk room with the ex in which the phone's owner sends her part of
// the lyric.
//
// - Verse 1: one phone takes the first two lines (to “… in the dark”); a
//   second comes in on the right for the next two.
// - pc1: a third comes in for “That you were jealous and possessive”, a
//   fourth for “So manipulating”, a fifth on “Honestly, impressive”, a sixth
//   on “YOU” — six in a row. “Honestly, impressive” and yhmp (“YOU” “HAD”
//   “ME” “PARTICIPATING”, in capitals and bold, a message a word) are sent
//   on every phone out at once.
// At Chorus 1 the scenario ends: each phone scrolls on to the app the score
// gives it, and six more phones come in as a second row (./field.tsx).

// yhmp: a message a word, as each is sung.
const YHMP = [shout(7, 0, 0), shout(7, 1, 1), shout(7, 2, 2), shout(7, 3, 3)];
/** Sent on every phone out, after its own lines. */
const ALL = [line(6), ...YHMP];

/**
 * The phones as they stand left to right, and the messages each one sends.
 * A phone comes in when its first message begins (the earliest is out from
 * the start), wherever in the row it stands.
 */
export const OPENING: Scenario = {
  from: 0,
  until: 8,
  app: () => "kakaotalk",
  phones: [
    [line(0), line(1), ...ALL],
    [line(2), line(3), ...ALL],
    [line(4), ...ALL],
    [line(5), ...ALL],
    [...ALL],
    [...YHMP],
  ],
};
