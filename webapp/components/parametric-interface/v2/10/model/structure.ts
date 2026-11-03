// The song's own structure, which the plan sheet is organised by. Lanes are
// the song's parts; the vertical axis is the song clock. Line indexes refer
// to the ROSÉ "toxic till the end" lyric timing in ../../model/songs.

export type Part = "verse" | "pre" | "chorus" | "bridge";

export type Section = {
  readonly id: string;
  readonly part: Part;
  readonly name: string;
  readonly first: number;
  readonly last: number;
  /** The section's own line, set as its circled era statement. */
  readonly statement: string;
  /** The lane group left empty while this section plays, where it is set. */
  readonly statementZone: Zone;
};

export type Zone = "verse" | "middle" | "bridge";

export const SECTIONS: readonly Section[] = [
  { id: "v1", part: "verse", name: "VERSE 1", first: 0, last: 7, statement: "CALL US WHAT WE ARE, TOXIC FROM THE START", statementZone: "middle" },
  { id: "p1", part: "pre", name: "PRE-CHORUS 1", first: 8, last: 11, statement: "", statementZone: "verse" },
  { id: "c1", part: "chorus", name: "CHORUS 1", first: 12, last: 15, statement: "WE WERE TOXIC TILL THE END", statementZone: "verse" },
  { id: "v2", part: "verse", name: "VERSE 2", first: 16, last: 24, statement: "LADIES AND GENTLEMEN, I PRESENT TO YOU: THE EX", statementZone: "bridge" },
  { id: "p2", part: "pre", name: "PRE-CHORUS 2", first: 25, last: 28, statement: "", statementZone: "verse" },
  { id: "c2", part: "chorus", name: "CHORUS 2", first: 29, last: 32, statement: "YOU WERE PLOTTING HOW TO STAY IN MY HEAD", statementZone: "verse" },
  { id: "b", part: "bridge", name: "BRIDGE", first: 33, last: 36, statement: "YOU WASTED MY PRETTIEST YEARS", statementZone: "verse" },
  { id: "p3", part: "pre", name: "PRE-CHORUS 3", first: 37, last: 40, statement: "", statementZone: "verse" },
  { id: "c3", part: "chorus", name: "CHORUS 3", first: 41, last: 45, statement: "WE WERE TOXIC TILL THE END, END, END", statementZone: "verse" },
];

export const PART_HEADS: Readonly<Record<Part, string>> = {
  verse: "VERSE PROGRAMS",
  pre: "PRE-CHORUS TRANSITION",
  chorus: "CHORUS — CRITICAL PATH",
  bridge: "BRIDGE",
};

export const LEXICON_HEAD = "LEXICON (FIRST USE)";
export const ROOT_LABEL = ["TOXIC TILL THE END", "PROGRAM", "(TTTE)"] as const;
export const TERMINAL_LABEL = "TILL THE END";

export function sectionOf(lineIndex: number) {
  return SECTIONS.find((section) => lineIndex >= section.first && lineIndex <= section.last)!;
}

/** A pre-chorus and its chorus share one era statement, the chorus's. */
export function statementBands() {
  const bands: { section: Section; first: number; last: number }[] = [];
  for (const section of SECTIONS) {
    if (section.part === "pre") continue;
    const pre = SECTIONS.find((candidate) => candidate.part === "pre" && candidate.last + 1 === section.first);
    bands.push({ section, first: pre ? pre.first : section.first, last: section.last });
  }
  return bands;
}
