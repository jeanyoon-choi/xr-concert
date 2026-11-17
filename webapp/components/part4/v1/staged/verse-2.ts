import { STATE_GROUPS } from "../phones/states";
import { line, shout, type MessageSpec, type Scenario } from "./scenario";

// Verse 2 and Pre-Chorus 2 (pc2): back to chat, in the rhythm and the
// composition of the opening (./opening.ts) — but across the chat apps, a
// different one on each phone, not KakaoTalk alone, and with all twelve
// phones already out.
//
// - Verse 2: the first phone of each row takes the first two lines, the
//   second the next two.
// - pc2: the third takes “'Cause you're just jealous and possessive”, the
//   fourth “So manipulating”; “Honestly, impressive” goes out on the first
//   five of each row, and yhmp, a message a word, on all six.
// Each app shows the lines it is given in its own way.

const CHAT = STATE_GROUPS.find((group) => group.id === "chat")!.states;

// yhmp: a message a word, as each is sung.
const YHMP = [shout(24, 0, 0), shout(24, 1, 1), shout(24, 2, 2), shout(24, 3, 3)];
const ALL = [line(23), ...YHMP];

/** One row of six, as the opening's six. */
const ROW: readonly (readonly MessageSpec[])[] = [
  [line(17), line(18), ...ALL],
  [line(19), line(20), ...ALL],
  [line(21), ...ALL],
  [line(22), ...ALL],
  [...ALL],
  [...YHMP],
];

export const VERSE_2: Scenario = {
  from: 17,
  until: 25,
  // The second row begins one app along, so no column holds the same app twice.
  app: (phone) => CHAT[(phone + Math.floor(phone / ROW.length)) % CHAT.length]!,
  phones: [...ROW, ...ROW],
};
