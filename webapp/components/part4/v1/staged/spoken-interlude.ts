import { STATE_GROUPS } from "../phones/states";
import { bold, line, type Scenario } from "./scenario";

// The Spoken Interlude, on the notes-and-system apps: only its own three
// lines, nothing from before —
//   Ladies and gentlemen / I present to you / The ex
// (one timed line of the song, cut into its three phrases).

const OWN = STATE_GROUPS.find((group) => group.id === "own")!.states.filter((state) => state !== "lock");

// “The ex” is the point of it: in bold.
const PHRASES = [line(16, 0, 2), line(16, 3, 6), bold(16, 7, 8)];

export const SPOKEN_INTERLUDE: Scenario = {
  from: 16,
  until: 17,
  // Three short phrases on an otherwise quiet screen: set large.
  scale: 2,
  app: (phone) => OWN[phone % OWN.length]!,
  phones: Array.from({ length: 12 }, () => PHRASES),
};
