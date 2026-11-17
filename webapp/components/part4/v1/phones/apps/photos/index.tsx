"use client";

import { memo, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { SungLine } from "../../../song/lines";
import { clockAgo, dateLabel } from "../../../clock/wall-clock";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import styles from "./photos.module.css";

// iOS 18 Photos, light, the Library grid at the default zoom (three square
// columns, hairline gutters) scrolled to its end, newest bottom-right, as the
// app opens. It is her camera roll of him: the boyfriend across the table, in
// the driver's seat, walking ahead at night, at the shore. Every photograph
// is whole, with one plain black bar struck across his eyes. Each sung WORD
// becomes one more photo appended to the library with the word written in
// white below, on a flat black strip along the foot of the photo, so the grid
// grows by a tile per word. Tap a tile to open it full screen.
//
// Sources: layout from iOS 18 Photos (single scrolling library, large
// "Library" title + date over a light top fade, search / Select / account
// controls, the floating "Years · Months · All" control and the
// "N Photos, M Videos" footer). Glyphs are drawn to SF Symbols geometry
// (magnifyingglass, arrow.up.arrow.down, chevron.left, square.and.arrow.up,
// heart, info.circle, trash). Photographs: Unsplash and Pexels, public/part4/v1/photos
// (see attribution.json there).

/** A rectangle over the eyes, in percent of the photograph; `r` turns it about its centre (degrees). */
type Eyes = { readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly r?: number };
/**
 * One photograph: its pixel size, where the eyes are (none when the face is
 * not seen), the point a tile is cropped about when there are no eyes, and
 * how far a tile leans in when he is small in the frame.
 */
type Photo = {
  readonly file: string;
  readonly w: number;
  readonly h: number;
  readonly eyes?: Eyes;
  readonly at?: { readonly x: number; readonly y: number };
  readonly zoom?: number;
};

const ROLL: readonly Photo[] = [
  { file: "01", w: 900, h: 506, eyes: { x: 43, y: 21.75, w: 15, h: 6.5, r: -22 } }, // thumbs up in a cafe
  { file: "02", w: 900, h: 600, eyes: { x: 33, y: 36.5, w: 15, h: 8, r: 2 } }, // driving, shaka
  { file: "03", w: 900, h: 600, eyes: { x: 45.75, y: 32.5, w: 6.5, h: 4 } }, // at a table under string lights
  { file: "04", w: 900, h: 621, eyes: { x: 25, y: 35.25, w: 35, h: 10.5, r: -11 } }, // winking, close
  { file: "05", w: 900, h: 1350, eyes: { x: 63.5, y: 53.7, w: 15, h: 2.6 }, zoom: 1.5 }, // at the kitchen table
  { file: "06", w: 900, h: 600, eyes: { x: 44.4, y: 44.25, w: 10, h: 5.5, r: 3 }, zoom: 1.3 }, // on a street at night
  { file: "07", w: 900, h: 600, eyes: { x: 38.75, y: 31.35, w: 15.5, h: 8.5, r: 3 } }, // at the shore, sunglasses
  { file: "08", w: 900, h: 600, eyes: { x: 43.25, y: 42.5, w: 13.5, h: 5 } }, // laughing under lights
  { file: "09", w: 900, h: 601, at: { x: 56, y: 30 } }, // driving, from the back seat
  { file: "10", w: 900, h: 506, eyes: { x: 39.5, y: 29.8, w: 13, h: 6, r: -6 } }, // peace sign in a bar
  { file: "11", w: 900, h: 1349, eyes: { x: 38.5, y: 43.15, w: 27, h: 4.2, r: 23 } }, // laughing
  { file: "12", w: 900, h: 600, eyes: { x: 44.5, y: 16.25, w: 7, h: 4.5 }, zoom: 1.2 }, // on a rock by the sea
  { file: "13", w: 900, h: 1350, at: { x: 33, y: 58 }, zoom: 1.3 }, // walking ahead at night
  { file: "14", w: 900, h: 643, eyes: { x: 47, y: 36, w: 17, h: 7, r: -7 } }, // smiling at night
  { file: "15", w: 900, h: 1350, eyes: { x: 43, y: 45.5, w: 11, h: 2.2 }, zoom: 1.6 }, // on the couch
  { file: "16", w: 900, h: 600, eyes: { x: 34, y: 44, w: 8, h: 5, r: -8 }, zoom: 1.4 }, // driving, from outside
  { file: "17", w: 900, h: 1349, eyes: { x: 32.5, y: 40, w: 30, h: 3.6, r: 5 } }, // on a boat at dusk
  { file: "18", w: 900, h: 1350, eyes: { x: 35, y: 40.1, w: 12, h: 2.8 } }, // on a bus
  { file: "19", w: 900, h: 507, eyes: { x: 39.8, y: 24.5, w: 14, h: 6, r: -8 } }, // grinning in a car park
  { file: "20", w: 900, h: 1350, eyes: { x: 36.5, y: 30.7, w: 8, h: 2.2 }, zoom: 1.3 }, // walking on the dunes
  { file: "21", w: 900, h: 600, eyes: { x: 53.3, y: 44.8, w: 20, h: 6 } }, // smiling across the table
  { file: "22", w: 900, h: 1350, eyes: { x: 44, y: 45.8, w: 14, h: 3 }, zoom: 1.3 }, // downtown at dusk
  { file: "23", w: 900, h: 600, eyes: { x: 43.05, y: 38.05, w: 12.5, h: 6.5, r: 5 } }, // at the shore, sunset
  { file: "24", w: 900, h: 1359, eyes: { x: 39.5, y: 43.5, w: 34, h: 4.4, r: -41 } }, // head back against a wall
  { file: "25", w: 900, h: 1350, eyes: { x: 47, y: 54.8, w: 12, h: 3.4, r: -15 } }, // face up to the autumn sun
  { file: "26", w: 900, h: 1350, eyes: { x: 25, y: 32, w: 22, h: 5, r: -23 } }, // in a padded coat, hiding his face
  { file: "27", w: 900, h: 1350, eyes: { x: 41.5, y: 21.8, w: 10, h: 2 }, zoom: 2 }, // outside a cafe in Korea
  { file: "28", w: 900, h: 1350, eyes: { x: 60.5, y: 34.5, w: 13, h: 4, r: 20 } }, // on the subway with his phone
  { file: "29", w: 900, h: 600, eyes: { x: 47, y: 29, w: 22, h: 7, r: -2 } }, // bleached hair, across the cafe table
  { file: "30", w: 900, h: 1350, eyes: { x: 24.5, y: 37.7, w: 30, h: 4.2, r: 9 } }, // bleached hair, looking back
  { file: "31", w: 900, h: 1348, eyes: { x: 57, y: 34.4, w: 18, h: 3.2, r: 3 } }, // against a corrugated wall
  { file: "32", w: 900, h: 1350, eyes: { x: 32, y: 39, w: 12, h: 3, r: 15 } }, // looking down
  { file: "33", w: 900, h: 605, eyes: { x: 54, y: 32.95, w: 16, h: 5.5, r: -3 } }, // city lights at night, on film
  { file: "34", w: 900, h: 1350, eyes: { x: 50, y: 52.2, w: 10, h: 2.6 }, zoom: 1.3 }, // on a Seoul street under shop signs
  { file: "35", w: 900, h: 1008, eyes: { x: 52.5, y: 56.25, w: 19, h: 5.5, r: -3 } }, // with a drink, on film
  { file: "36", w: 900, h: 900, eyes: { x: 36.5, y: 34.75, w: 19, h: 5.5, r: -3 } }, // iced coffee at a cafe
  { file: "37", w: 900, h: 1200, eyes: { x: 35.5, y: 43.5, w: 36, h: 7, r: 29 } }, // smiling by the plane window
  { file: "38", w: 900, h: 1350, eyes: { x: 41, y: 26.2, w: 26, h: 3.6, r: -15 } }, // beret and knit, chin up
  { file: "39", w: 900, h: 1350, eyes: { x: 43.5, y: 35.6, w: 14, h: 2.4 }, zoom: 1.5 }, // holding a sunflower bouquet
  { file: "40", w: 900, h: 1125, eyes: { x: 63, y: 21.4, w: 8, h: 3.2 }, zoom: 1.2 }, // on a Seoul rooftop
];

/** The library before the song: 4,821 photos and 382 videos. */
const BASE_PHOTOS = 4821;
const BASE_VIDEOS = 382;
const BASE = BASE_PHOTOS + BASE_VIDEOS;
const WINDOW = 60;
const KEEP = 96;

type Kind = "photo" | "video";
/** A captured word: `at` orders it in the song (line, then word), `n` is its place in the library. */
type Shot = { readonly key: string; readonly at: number; readonly n: number; readonly text: string };
/** `seen` is the newest capture already in the library when it was opened or rebuilt: only later ones arrive. */
type Library = { readonly lines: readonly SungLine[]; readonly shots: readonly Shot[]; readonly seen: number };

const lastOf = (shots: readonly Shot[]) => shots.at(-1)?.n ?? -1;

function grow(library: Library | undefined, lines: readonly SungLine[]): Library {
  const shots = append(library?.shots ?? [], lines);
  // Opened, emptied or rebuilt after a seek: what is there is simply there, nothing arrives.
  const rebuilt = !library || lastOf(shots) < lastOf(library.shots);
  return { lines, shots, seen: rebuilt ? lastOf(shots) : library.seen };
}

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The words begun so far, line by line; the newest is taken from `text` so it grows as typed. */
function wordsOf(lines: readonly SungLine[]) {
  const words: { key: string; at: number; text: string }[] = [];
  const at = (line: SungLine, index: number) => line.cueIndex * 1_000 + index;
  for (const line of lines) {
    const done = line.words.slice(0, Math.max(0, line.sung - 1));
    done.forEach((word, index) => words.push({ key: `${line.cueIndex}-${index}`, at: at(line, index), text: word }));
    if (line.sung > 0) {
      const prefix = done.join(" ");
      const last = line.text.slice(prefix.length).trim();
      words.push({ key: `${line.cueIndex}-${line.sung - 1}`, at: at(line, line.sung - 1), text: last || line.words[line.sung - 1]! });
    }
  }
  return words;
}

/**
 * Captures are appended, never renumbered, so a tile keeps its column when
 * old lines leave `lines`. Only a word sung after the newest capture is a new
 * photo: the library keeps the last KEEP, and a word it has already dropped
 * must not come back as a new one while its line is still in `lines`.
 */
function append(shots: readonly Shot[], lines: readonly SungLine[]): readonly Shot[] {
  // Before the song (or after a restart) the library is the ordinary camera roll again.
  if (lines.length === 0) return [];
  const words = wordsOf(lines);
  const newest = shots.at(-1);
  // The song went back (a seek, a restart): the library is rebuilt from the words now sung.
  if (newest && (words.at(-1)?.at ?? -1) < newest.at) return append([], lines);

  const next = [...shots];
  const index = new Map(next.map((shot, position) => [shot.key, position]));
  for (const word of words) {
    const position = index.get(word.key);
    if (position !== undefined) {
      if (next[position]!.text !== word.text) next[position] = { ...next[position]!, text: word.text };
    } else if (!newest || word.at > newest.at) {
      next.push({ key: word.key, at: word.at, n: (next.at(-1)?.n ?? -1) + 1, text: word.text });
    }
  }
  return next.length > KEEP ? next.slice(next.length - KEEP) : next;
}

function kindOf(index: number, word: boolean): Kind {
  // A word is always a still; in the library before the song, now and then a clip.
  return !word && hash(index * 7 + 3) % 9 === 0 ? "video" : "photo";
}

function seconds(index: number) {
  const s = 3 + (hash(index + 11) % 12);
  return `0:${String(s).padStart(2, "0")}`;
}

/** A word needs eyes to cover: photographs without a visible face stay in the library before the song. */
const FACES: readonly Photo[] = ROLL.filter((photo) => photo.eyes);

/** One run's order: the roll shuffled, seeded by the run. */
function shuffled(length: number, run: number) {
  const order = Array.from({ length }, (_, position) => position);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = hash(run * 131 + i) % (i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * Each run of tiles is the whole roll once, in an order of its own. A run
 * never opens with one of the three photographs the run before closed with,
 * so the same picture is not beside or above itself across the seam.
 */
const orders = new Map<string, readonly number[]>();
function photoAt(index: number, word: boolean): Photo {
  const roll = word ? FACES : ROLL;
  const run = Math.floor(index / roll.length);
  const key = `${roll.length}-${run}`;
  let order = orders.get(key);
  if (!order) {
    const next = shuffled(roll.length, run);
    // Only the opening three are ever moved (three rows down), so the run before still closes as it was shuffled.
    const closing = run > 0 ? shuffled(roll.length, run - 1).slice(-3) : [];
    for (let i = 0, spare = 9; i < 3; i += 1) {
      while (closing.includes(next[i]!) && spare < next.length - 3) {
        [next[i], next[spare]] = [next[spare]!, next[i]!];
        spare += 1;
      }
    }
    order = next;
    orders.set(key, order);
  }
  return roll[order[index % roll.length]!]!;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Where the eyes sit in a tile, from its top, in percent: the middle of what the word's strip leaves. */
const EYE_LINE = 37;
/** The strip the word is written on along the foot, in cqmin of a tile and of the full photograph. */
const STRIP = 24;
const STRIP_FULL = 14;
/** An average glyph's width in em. */
const GLYPH = 0.62;
/** The furthest the bar turns with a tilted head, in degrees. */
const MAX_TURN = 12;

/**
 * The photograph's own box and the bar in it. Lengths are in cqmin of the
 * view: a square tile the photograph covers, his eyes brought to its middle;
 * or, full screen, the whole photograph. The bar is the eye rectangle and
 * nothing more.
 */
function layout(photo: Photo, full: boolean) {
  const eyes = photo.eyes;
  const cx = (eyes ? eyes.x + eyes.w / 2 : (photo.at?.x ?? 50)) / 100;
  const cy = (eyes ? eyes.y + eyes.h / 2 : (photo.at?.y ?? 50)) / 100;
  const baseW = Math.max(1, photo.w / photo.h) * 100;
  const baseH = Math.max(1, photo.h / photo.w) * 100;
  // A tile leans in until the eyes can be brought to its middle without uncovering an edge.
  const zoom = full
    ? 1
    : Math.max(
        photo.zoom ?? 1,
        50 / (cx * baseW),
        50 / ((1 - cx) * baseW),
        EYE_LINE / (cy * baseH),
        (100 - EYE_LINE) / ((1 - cy) * baseH),
      );
  const width = baseW * zoom;
  const height = baseH * zoom;
  const shot: CSSProperties = full
    ? { inset: 0 }
    : {
        left: `${clamp(50 - cx * width, 100 - width, 0)}%`,
        top: `${clamp(EYE_LINE - cy * height, 100 - height, 0)}%`,
        width: `${width}%`,
        height: `${height}%`,
      };
  if (!eyes) return { shot, bar: undefined, width };

  let barW = (eyes.w / 100) * width;
  let barH = (eyes.h / 100) * height;
  // The bar turns with the head only so far; past that it grows to still cover both eyes.
  const tilt = eyes.r ?? 0;
  const angle = clamp(tilt, -MAX_TURN, MAX_TURN);
  const over = (Math.abs(tilt - angle) * Math.PI) / 180;
  if (over > 0) {
    [barW, barH] = [barW * Math.cos(over) + barH * Math.sin(over), barW * Math.sin(over) + barH * Math.cos(over)];
  }
  const bar: CSSProperties = {
    left: `${(cx - barW / width / 2) * 100}%`,
    top: `${(cy - barH / height / 2) * 100}%`,
    width: `${(barW / width) * 100}%`,
    height: `${(barH / height) * 100}%`,
    transform: angle ? `rotate(${angle}deg)` : undefined,
  };
  return { shot, bar, width };
}

function Picture({ index, text, full = false }: { index: number; text?: string; full?: boolean }) {
  const photo = photoAt(index, Boolean(text));
  const { shot, bar, width } = layout(photo, full);
  // The word sits on one line: as large as its strip allows, smaller when it is long.
  const strip = full ? STRIP_FULL : STRIP;
  const word: CSSProperties | undefined = text
    ? { height: `${strip}cqmin`, fontSize: `${Math.min(strip * 0.78, ((full ? width : 100) - 8) / (GLYPH * text.length))}cqmin` }
    : undefined;
  return (
    <span className={styles.frame} style={full ? { aspectRatio: `${photo.w} / ${photo.h}` } : undefined}>
      <span className={styles.shot} style={{ ...shot, backgroundImage: `url(/part4/v1/photos/${photo.file}.jpg)` }}>
        {bar ? <span className={styles.censor} style={bar} /> : null}
      </span>
      {word ? <span className={styles.word} style={word}>{text}</span> : null}
    </span>
  );
}

function Glyph({ name }: { name: "search" | "sort" | "back" | "share" | "heart" | "info" | "trash" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "search":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><circle cx="8.4" cy="8.4" r="6.4" {...stroke} strokeWidth={2.1} /><path d="m13.2 13.2 5 5" {...stroke} strokeWidth={2.3} /></svg>;
    case "sort":
      return <svg aria-hidden="true" viewBox="0 0 22 20" width="20" height="18"><path d="M6.5 17.5V2.8M2.3 7 6.5 2.6 10.7 7M15.5 2.5v14.7m-4.2-4.4 4.2 4.4 4.2-4.4" {...stroke} strokeWidth={2} /></svg>;
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 20" width="11" height="19"><path d="M10 1.5 2 10l8 8.5" {...stroke} strokeWidth={2.5} /></svg>;
    case "share":
      return <svg aria-hidden="true" viewBox="0 0 20 26" width="18" height="23"><path d="M10 16V2M5.5 6.2 10 1.8l4.5 4.4" {...stroke} strokeWidth={1.9} /><path d="M6.5 10H3.8A1.8 1.8 0 0 0 2 11.8v10.4A1.8 1.8 0 0 0 3.8 24h12.4a1.8 1.8 0 0 0 1.8-1.8V11.8A1.8 1.8 0 0 0 16.2 10h-2.7" {...stroke} strokeWidth={1.9} /></svg>;
    case "heart":
      return <svg aria-hidden="true" viewBox="0 0 24 22" width="23" height="21"><path d="M12 20.2S2 14.3 2 7.6A5.1 5.1 0 0 1 7.2 2.4c2.1 0 3.8 1.2 4.8 3 1-1.8 2.7-3 4.8-3A5.1 5.1 0 0 1 22 7.6c0 6.7-10 12.6-10 12.6Z" {...stroke} strokeWidth={1.9} /></svg>;
    case "info":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23"><circle cx="12" cy="12" r="10.2" {...stroke} strokeWidth={1.8} /><path d="M12 10.8v6.4" {...stroke} strokeWidth={2} /><circle cx="12" cy="7.3" r="1.25" fill="currentColor" /></svg>;
    case "trash":
      return <svg aria-hidden="true" viewBox="0 0 22 24" width="21" height="23"><path d="M2 5.2h18M8 5V3.2c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2V5M4.3 5.2l1.1 15.3c.1 1 .9 1.7 1.9 1.7h7.4c1 0 1.8-.7 1.9-1.7l1.1-15.3M9 9.5v8.5M13 9.5v8.5" {...stroke} strokeWidth={1.8} /></svg>;
  }
}

const OWNERS = ["YC", "HK", "SJ", "EL", "MP", "RS"] as const;

/** The Library's date, "Nov 3, 2026", and the morning photo's time, 12 h 16 min before the song. */
const DAY = dateLabel("en-US", { month: "short", day: "numeric", year: "numeric" });
const MORNING = clockAgo(736);

function PhotosState({ seat, lines, clock, shown, reducedMotion }: PhoneStateProps) {
  const [library, setLibrary] = useState<Library>(() => grow(undefined, lines));
  if (library.lines !== lines) setLibrary(grow(library, lines));
  const [open, setOpen] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);

  const { shots } = library;
  const total = BASE + (shots.at(-1)?.n ?? -1) + 1;
  const start = Math.max(0, Math.floor((total - WINDOW) / 3) * 3);
  const byIndex = new Map(shots.map((shot) => [BASE + shot.n, shot]));
  const tiles = [] as { index: number; kind: Kind; text?: string }[];
  for (let index = start; index < total; index += 1) {
    const shot = byIndex.get(index);
    tiles.push({ index, kind: kindOf(index, Boolean(shot)), text: shot?.text });
  }

  const videos = BASE_VIDEOS;
  const photos = total - videos;

  // The library stays at its end, the newest row in view, as Photos opens.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !shown) return;
    const end = grid.scrollHeight - grid.clientHeight;
    if (!placed.current) {
      grid.scrollTop = end;
      placed.current = true;
      return;
    }
    follow(grid, end, reducedMotion);
  }, [total, shown, reducedMotion]);

  const viewing = open === null ? undefined : tiles.find((tile) => tile.index === open);
  // A capture made while the library is open fades in once; the mark stays, so nothing re-fades or snaps when the next one lands.
  const arrivedFrom = BASE + library.seen;

  return (
    <section className={styles.app} aria-label="Photos" inert={!shown}>
      <div ref={gridRef} className={styles.scroll}>
        <ul className={styles.grid} aria-label="Library">
          {tiles.map((tile) => (
            <li key={tile.index} className={styles.cell} data-new={(tile.index > arrivedFrom && !reducedMotion) || undefined}>
              <button
                type="button"
                className={styles.tile}
                aria-label={tile.text ? `${tile.kind === "video" ? "Video" : "Photo"}, ${tile.text}` : "Photo"}
                onClick={() => setOpen(tile.index)}
              >
                <Picture index={tile.index} text={tile.text} />
                {tile.kind === "video" ? <span className={styles.duration}>{seconds(tile.index)}</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <p className={styles.footer}>
          {photos.toLocaleString("en-US")} Photos, {videos.toLocaleString("en-US")} Videos
        </p>
      </div>

      <div className={styles.topFade} aria-hidden="true" />
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Library</h2>
          <p className={styles.date}>{DAY}</p>
        </div>
        <div className={styles.controls}>
          <span className={styles.round} aria-label="Search" role="img"><Glyph name="search" /></span>
          <span className={styles.select}>Select</span>
          <span className={styles.avatar} aria-hidden="true">{OWNERS[seat % OWNERS.length]}</span>
        </div>
      </header>

      <div className={styles.bottomFade} aria-hidden="true" />
      <footer className={styles.bar} aria-hidden="true">
        <span className={styles.segments}>
          <span>Years</span>
          <span>Months</span>
          <span className={styles.segmentOn}>All</span>
        </span>
        <span className={styles.round}><Glyph name="sort" /></span>
      </footer>

      {viewing ? (
        <div className={styles.viewer} role="dialog" aria-label="Photo">
          <header className={styles.viewerBar}>
            <button type="button" className={styles.viewerRound} aria-label="Back to Library" onClick={() => setOpen(null)}>
              <Glyph name="back" />
            </button>
            <span className={styles.viewerTitle}>
              <strong>Today</strong>
              <span>{viewing.text ? clock : MORNING}</span>
            </span>
            <span className={styles.viewerPill}>Edit</span>
          </header>
          <div className={styles.viewerImage}>
            <Picture index={viewing.index} text={viewing.text} full />
          </div>
          <footer className={styles.viewerTools} aria-hidden="true">
            <span className={styles.viewerRound}><Glyph name="share" /></span>
            <span className={styles.viewerGroup}>
              <Glyph name="heart" />
              <Glyph name="info" />
            </span>
            <span className={styles.viewerRound}><Glyph name="trash" /></span>
          </footer>
        </div>
      ) : null}
    </section>
  );
}

export default memo(PhotosState);
