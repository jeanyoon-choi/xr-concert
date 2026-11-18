// The structure of “toxic till the end”: each section's first line, as an
// index into the song's lines (rose-toxic-till-the-end.ts). A section runs
// to the next one.

export const SECTIONS = [
  { id: "verse-1", label: "Verse 1", from: 0 },
  { id: "pre-chorus-1", label: "Pre-Chorus 1", from: 4 },
  { id: "chorus-1", label: "Chorus 1", from: 8 },
  { id: "spoken-interlude", label: "Spoken Interlude", from: 16 },
  { id: "verse-2", label: "Verse 2", from: 17 },
  { id: "pre-chorus-2", label: "Pre-Chorus 2", from: 21 },
  { id: "chorus-2", label: "Chorus 2", from: 25 },
  { id: "bridge", label: "Bridge", from: 33 },
  { id: "final-chorus", label: "Final Chorus", from: 37 },
  { id: "outro", label: "Outro", from: 45 },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/** The section a line belongs to; before the first line it is the first section. */
export function sectionOf(cueIndex: number): SectionId {
  let id: SectionId = SECTIONS[0].id;
  for (const section of SECTIONS) if (section.from <= cueIndex) id = section.id;
  return id;
}
