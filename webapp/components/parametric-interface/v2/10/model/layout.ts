import type { ParametricSong } from "../../model/song";
import { sectionOf, SECTIONS, statementBands, type Part, type Zone } from "./structure";

// The plan sheet, organised the way the 1989 Integrated Space Plan is:
// - the vertical axis is time (the song clock, labelled as years);
// - lanes are program areas (the song's parts), each under its own heading;
// - the chorus is the central critical path, in heavier double-ruled elements;
// - every element sits at the time its line begins and depends on the line
//   before it; a repeated line is tied to its earlier occurrences;
// - each section's era statement is set at the section's time, in the lanes
//   that are empty while it plays;
// - the lexicon lists every word at its first use, as the poster's
//   vehicle lists run down its right side.
// All of it fits the viewport: 1500 design px wide, as tall as the aspect.

export const SHEET_WIDTH = 1500;
export const HEADER_HEIGHT = 104;
export const FIRST_YEAR = 2026;
export const LAST_YEAR = 2100;
export const RIGHT_YEARS_X = 1326;
export const TABLES_X = 1332;
export const TABLES_WIDTH = SHEET_WIDTH - TABLES_X - 6;
export const LINE_FONT = 7.8;
export const LINE_ROW = 8.8;
export const CHORUS_FONT = 8.4;
export const CHORUS_ROW = 9.2;
export const LEXICON_FONT = 6.6;
export const LEXICON_HEIGHT = 10;

type Lane = { readonly x: number; readonly w: number };

const COLUMNS: Readonly<Record<Part | "lexicon", readonly Lane[]>> = {
  verse: [{ x: 64, w: 172 }, { x: 246, w: 172 }],
  pre: [{ x: 432, w: 100 }, { x: 540, w: 100 }],
  chorus: [{ x: 654, w: 120 }, { x: 782, w: 120 }],
  bridge: [{ x: 916, w: 96 }, { x: 1020, w: 96 }],
  lexicon: [{ x: 1130, w: 58 }, { x: 1194, w: 58 }, { x: 1258, w: 58 }],
};

const ZONES: Readonly<Record<Zone, { x: number; w: number }>> = {
  verse: { x: 64, w: 354 },
  middle: { x: 432, w: 470 },
  bridge: { x: 916, w: 200 },
};

/** Left-margin rails for repeated verse lines, so they never cross a statement. */
const VERSE_RAILS = [42, 49, 56] as const;

export const PART_X: Readonly<Record<Part | "lexicon", { x: number; w: number }>> = {
  verse: { x: 64, w: 354 },
  pre: { x: 432, w: 208 },
  chorus: { x: 654, w: 248 },
  bridge: { x: 916, w: 200 },
  lexicon: { x: 1130, w: 186 },
};

export type Point = readonly [number, number];
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type LineBox = Rect & {
  readonly lineIndex: number;
  readonly part: Part;
  /** Word indexes of the line, wrapped to the element. */
  readonly rows: readonly (readonly number[])[];
};

export type WordBox = Rect & { readonly key: string; readonly word: string };

export type Statement = {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly size: number;
  readonly rows: readonly string[];
};

export type Rail = { readonly id: string; readonly points: readonly Point[]; readonly label: string; readonly labelAt: Point };

export type Sheet = {
  readonly height: number;
  readonly chartTop: number;
  readonly chartBottom: number;
  readonly lines: readonly LineBox[];
  readonly progress: readonly (readonly Point[])[];
  readonly rails: readonly Rail[];
  readonly words: readonly WordBox[];
  readonly lexiconChains: readonly (readonly Point[])[];
  readonly statements: readonly Statement[];
  readonly heads: readonly { part: Part | "lexicon"; x: number; y: number }[];
  readonly years: readonly { year: number; y: number }[];
  readonly rootToFirst: readonly Point[];
  readonly lastToEnd: readonly Point[];
};

function bareWord(word: string) {
  return word.toUpperCase().replace(/^[^A-Z]+|[^A-Z']+$/g, "");
}

export function wrapIndexes(words: readonly string[], maxChars: number) {
  const rows: number[][] = [];
  let current: number[] = [];
  let length = 0;

  words.forEach((word, index) => {
    if (current.length && length + 1 + word.length > maxChars) {
      rows.push(current);
      current = [index];
      length = word.length;
    } else {
      length += (current.length ? 1 : 0) + word.length;
      current.push(index);
    }
  });

  if (current.length) rows.push(current);
  return rows;
}

export function wrap(text: string, maxChars: number) {
  const words = text.split(" ");
  return wrapIndexes(words, maxChars).map((row) => row.map((index) => words[index]).join(" "));
}

function fitStatement(text: string, width: number, height: number) {
  for (let size = 26; size >= 11; size -= 1) {
    const lineHeight = size * 1.12;
    const rows = wrap(text, Math.max(6, Math.floor(width / (size * 0.62))));
    if (rows.length * lineHeight <= height) return { size, rows };
  }
  return { size: 11, rows: wrap(text, Math.floor(width / 6.8)) };
}

// Orthogonal dependency from one element to the next, entering from above
// when the next starts lower, otherwise from the side.
function route(a: Rect, b: Rect): Point[] {
  const ax = a.x + a.w / 2;
  const bx = b.x + b.w / 2;
  const aBottom = a.y + a.h;

  if (b.y >= aBottom + 6) {
    const turnY = b.y - 4;
    return ax === bx ? [[ax, aBottom], [bx, b.y]] : [[ax, aBottom], [ax, turnY], [bx, turnY], [bx, b.y]];
  }

  const rightward = bx > ax;
  const exitX = rightward ? a.x + a.w : a.x;
  const entryX = rightward ? b.x : b.x + b.w;
  const exitY = a.y + Math.min(a.h / 2, 6);
  const entryY = b.y + Math.min(b.h / 2, 6);
  const midX = (exitX + entryX) / 2;
  return [[exitX, exitY], [midX, exitY], [midX, entryY], [entryX, entryY]];
}

export function buildSheet(height: number, song: ParametricSong): Sheet {
  const chartTop = HEADER_HEIGHT + 22;
  const chartBottom = height - 40;
  const span = chartBottom - chartTop;
  const timeY = (ms: number) => chartTop + (ms / song.durationMs) * span;

  // Line elements, each at its line's start, in its part's lanes. A repeated
  // line keeps the lane of its first occurrence, so repeats align.
  const skyline: Record<string, number> = {};
  const laneOfText = new Map<string, number>();
  const lines: LineBox[] = song.lyrics.map((line, lineIndex) => {
    const part = sectionOf(lineIndex).part;
    const lanes = COLUMNS[part];
    const key = line.text.toLowerCase();
    let lane = laneOfText.get(key);
    if (lane === undefined) {
      lane = lanes.reduce((best, _, index) =>
        (skyline[`${part}-${index}`] ?? 0) < (skyline[`${part}-${best}`] ?? 0) ? index : best, 0);
      laneOfText.set(key, lane);
    }
    const { x, w } = lanes[lane]!;
    const isChorus = part === "chorus";
    const font = isChorus ? CHORUS_FONT : LINE_FONT;
    const rows = wrapIndexes(line.words.map((word) => word.text.toUpperCase()), Math.floor((w - 10) / (font * 0.68)));
    const h = rows.length * (isChorus ? CHORUS_ROW : LINE_ROW) + (isChorus ? 8 : 6);
    const y = Math.max(timeY(line.startMs), (skyline[`${part}-${lane}`] ?? 0) + 3);
    skyline[`${part}-${lane}`] = y + h;
    return { lineIndex, part, rows, x, y, w, h };
  });

  const progress = lines.slice(1).map((box, index) => route(lines[index]!, box));

  // Repeated lines are tied together along a rail beside their lane.
  const rails: Rail[] = [];
  const groups = new Map<string, LineBox[]>();
  lines.forEach((box) => {
    const key = song.lyrics[box.lineIndex]!.text.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), box]);
  });
  let verseRail = 0;
  for (const [key, boxes] of groups) {
    if (boxes.length < 2) continue;
    const first = boxes[0]!;
    const isVerse = first.part === "verse";
    const railX = isVerse
      ? VERSE_RAILS[verseRail++ % VERSE_RAILS.length]!
      : first.x + first.w + 4;
    const sideX = isVerse ? first.x : first.x + first.w;
    const points: Point[] = [];
    boxes.forEach((box, index) => {
      const y = box.y + box.h / 2;
      if (index > 0) points.push([railX, y]);
      points.push([isVerse ? box.x : sideX, y]);
      if (index < boxes.length - 1) points.push([railX, y]);
    });
    const label = `RECURRENCE: ${song.lyrics[first.lineIndex]!.text.toUpperCase()}`;
    rails.push({
      id: key,
      points,
      label,
      labelAt: [railX - 2, (first.y + boxes.at(-1)!.y) / 2],
    });
  }

  // Lexicon: every word at its first use, packed down three lanes.
  const words: WordBox[] = [];
  const seen = new Set<string>();
  const lexiconSkyline = COLUMNS.lexicon.map(() => chartTop + 8);
  const lexiconLanes: WordBox[][] = COLUMNS.lexicon.map(() => []);
  for (const line of song.lyrics) {
    for (const word of line.words) {
      const key = bareWord(word.text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const lane = lexiconSkyline.indexOf(Math.min(...lexiconSkyline));
      const y = Math.max(timeY(word.startMs), lexiconSkyline[lane]! + 2);
      if (y + LEXICON_HEIGHT > chartBottom) continue;
      const { x, w } = COLUMNS.lexicon[lane]!;
      const box = { key, word: key, x, y, w, h: LEXICON_HEIGHT };
      words.push(box);
      lexiconLanes[lane]!.push(box);
      lexiconSkyline[lane] = y + LEXICON_HEIGHT;
    }
  }
  const lexiconChains = lexiconLanes.flatMap((lane) =>
    lane.slice(1).map((box, index) => {
      const above = lane[index]!;
      const x = box.x + box.w / 2;
      return [[x, above.y + above.h], [x, box.y]] as Point[];
    }).filter((points) => points[1]![1] - points[0]![1] > 3),
  );

  // Era statements: at each section's time, in the zone left empty then.
  const statements: Statement[] = statementBands().map(({ section, first, last }) => {
    const top = timeY(song.lyrics[first]!.startMs);
    const bottom = timeY(song.lyrics[last]!.endMs);
    const zone = ZONES[section.statementZone];
    const bandHeight = Math.max(60, bottom - top);
    // The ring is sized by its zone and its time band; the statement is
    // fitted inside the ring, never the other way round.
    const r = Math.min(zone.w / 2 + 6, bandHeight / 2 + 4);
    const fitted = fitStatement(section.statement, r * 1.6, r * 1.3);
    return {
      id: section.id,
      cx: zone.x + zone.w / 2,
      cy: (top + bottom) / 2,
      r,
      size: fitted.size,
      rows: fitted.rows,
    };
  });

  const heads = (Object.keys(PART_X) as (Part | "lexicon")[]).map((part) => {
    const firstBox = part === "lexicon" ? words[0] : lines.find((box) => box.part === part);
    return { part, x: PART_X[part].x, y: (firstBox?.y ?? chartTop + 10) - 6 };
  });

  const years = [];
  for (let year = 2030; year <= LAST_YEAR; year += 5) {
    years.push({ year, y: chartTop + ((year - FIRST_YEAR) / (LAST_YEAR - FIRST_YEAR)) * span });
  }

  const rootCentreX = PART_X.chorus.x + PART_X.chorus.w / 2;
  const firstLine = lines[0]!;
  const lastLine = lines.at(-1)!;
  const rootToFirst: Point[] = [
    [rootCentreX, 92],
    [rootCentreX, HEADER_HEIGHT + 8],
    [firstLine.x + firstLine.w / 2, HEADER_HEIGHT + 8],
    [firstLine.x + firstLine.w / 2, firstLine.y],
  ];
  const lastToEnd: Point[] = [
    [lastLine.x + lastLine.w / 2, lastLine.y + lastLine.h],
    [lastLine.x + lastLine.w / 2, height - 26],
  ];

  return {
    height,
    chartTop,
    chartBottom,
    lines,
    progress,
    rails,
    words,
    lexiconChains,
    statements,
    heads,
    years,
    rootToFirst,
    lastToEnd,
  };
}

export { SECTIONS };
