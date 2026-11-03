// An invented design-and-production team's workspace. Names and channels are
// fictional; avatars are initials on flat colours. The only messages are the
// song's lines, posted by POSTER (see ../index.tsx).

export type Person = { readonly id: string; readonly name: string; readonly initials: string; readonly color: string };

export const people = {
  mira: { id: "mira", name: "Mira Okafor", initials: "MO", color: "#2f7d6d" },
  jonas: { id: "jonas", name: "Jonas Lindqvist", initials: "JL", color: "#8b5a2b" },
  sena: { id: "sena", name: "Sena Park", initials: "SP", color: "#4a5fb0" },
  theo: { id: "theo", name: "Theo Marchetti", initials: "TM", color: "#9c3d54" },
  ada: { id: "ada", name: "Ada Brennan", initials: "AB", color: "#6b6f2a" },
  ravi: { id: "ravi", name: "Ravi Desai", initials: "RD", color: "#5b4a8a" },
} as const satisfies Record<string, Person>;

export const WORKSPACE_NAME = "Fieldwork";
export const WORKSPACE_INITIALS = "F";
export const ME = people.sena;

export type SidebarChannel = { readonly id: string; readonly name: string; readonly unread?: boolean; readonly selected?: boolean };

export const channels: readonly SidebarChannel[] = [
  { id: "general", name: "general" },
  { id: "design-crit", name: "design-crit" },
  { id: "production", name: "production", selected: true },
  { id: "site-visits", name: "site-visits" },
  { id: "print-room", name: "print-room" },
  { id: "random", name: "random" },
];

export const directMessages: readonly Person[] = [people.mira, people.jonas, people.theo];

export const CURRENT_CHANNEL = "production";
export const MEMBER_COUNT = 14;

/** The member who posts the sung lines in the open channel. */
export const POSTER = people.mira;
