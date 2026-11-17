import { STATE_GROUPS } from "../phones/states";
import { line, type Scenario } from "./scenario";

// The Final Chorus falls in two at the high “We were toxic”.
// - Before it, the whispered lines: back to chat, each phone in a chat app,
//   every phone sending each line (this scenario).
// - From “We were toxic” on, the phones follow the score across the media
//   apps (POOLS in ./index.tsx).

const CHAT = STATE_GROUPS.find((group) => group.id === "chat")!.states;

const WHISPERED = [line(37), line(38), line(39)];

export const FINAL_CHORUS_WHISPER: Scenario = {
  from: 37,
  until: 40,
  app: (phone) => CHAT[(phone + Math.floor(phone / 6)) % CHAT.length]!,
  phones: Array.from({ length: 12 }, () => WHISPERED),
};
