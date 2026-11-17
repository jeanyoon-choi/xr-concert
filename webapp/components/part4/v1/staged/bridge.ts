import { STATE_GROUPS } from "../phones/states";
import { line, type Scenario } from "./scenario";

// The Bridge, on the posts-and-comments apps: she pours it out, alone, on
// community boards and feeds — her own post, in her own words, only the
// bridge's four lines. Set a little larger than the apps' own type.

const POSTS = STATE_GROUPS.find((group) => group.id === "posts")!.states;

const LINES = [line(33), line(34), line(35), line(36)];

export const BRIDGE: Scenario = {
  from: 33,
  until: 37,
  scale: 1.2,
  app: (phone) => POSTS[phone % POSTS.length]!,
  phones: Array.from({ length: 12 }, () => LINES),
};
