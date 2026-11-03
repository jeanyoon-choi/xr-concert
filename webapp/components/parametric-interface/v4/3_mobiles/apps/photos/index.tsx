"use client";

import { memo, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { SungLine } from "../../../model/lines";
import { clockAgo, dateLabel } from "../../clock-face";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import styles from "./photos.module.css";

// iOS 18 Photos, light, the Library grid at the default zoom (three square
// columns, hairline gutters) scrolled to its end, newest bottom-right, as the
// app opens. The camera roll is where every moment gets kept without being
// sent: each sung WORD becomes one more capture appended to the library — a
// photo with a story caption, a Snapchat-style band, a screenshot of a note
// or a message, a screen recording — so the grid grows by a tile per word.
// The word still being sung grows character by character in the newest tile.
// Tap a tile to open it full screen.
//
// Sources: layout from iOS 18 Photos (single scrolling library, large
// "Library" title + date over a light top fade, search / Select / account
// controls, the floating "Years · Months · All" control and the
// "N Photos, M Videos" footer). Glyphs are drawn to SF Symbols geometry
// (magnifyingglass, arrow.up.arrow.down, chevron.left, square.and.arrow.up,
// heart, info.circle, trash). Photographs: v4/wallpapers (see attribution.json).

const WALLPAPERS = 12;
/** The library before the song: 4,821 photos and 382 videos. */
const BASE_PHOTOS = 4821;
const BASE_VIDEOS = 382;
const BASE = BASE_PHOTOS + BASE_VIDEOS;
const WINDOW = 60;
const KEEP = 96;

type Kind = "photo" | "video" | "story" | "overlay" | "band" | "note" | "message" | "recording";
type Shot = { readonly key: string; readonly n: number; readonly text: string };
type Library = { readonly lines: readonly SungLine[]; readonly shots: readonly Shot[] };

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The words begun so far, line by line; the newest is taken from `text` so it grows as typed. */
function wordsOf(lines: readonly SungLine[]) {
  const words: { key: string; text: string }[] = [];
  for (const line of lines) {
    const done = line.words.slice(0, Math.max(0, line.sung - 1));
    done.forEach((word, index) => words.push({ key: `${line.cueIndex}-${index}`, text: word }));
    if (line.sung > 0) {
      const prefix = done.join(" ");
      const last = line.text.slice(prefix.length).trim();
      words.push({ key: `${line.cueIndex}-${line.sung - 1}`, text: last || line.words[line.sung - 1]! });
    }
  }
  return words;
}

/** Captures are appended, never renumbered, so a tile keeps its column when old lines leave `lines`. */
function append(shots: readonly Shot[], lines: readonly SungLine[]) {
  // Before the song (or after a restart) the library is the ordinary camera roll again.
  if (lines.length === 0) return [];
  const next = [...shots];
  const at = new Map(next.map((shot, index) => [shot.key, index]));
  for (const word of wordsOf(lines)) {
    const index = at.get(word.key);
    if (index !== undefined) {
      if (next[index]!.text !== word.text) next[index] = { ...next[index]!, text: word.text };
      continue;
    }
    at.set(word.key, next.length);
    next.push({ key: word.key, n: (next.at(-1)?.n ?? -1) + 1, text: word.text });
  }
  return next.length > KEEP ? next.slice(next.length - KEEP) : next;
}

function kindOf(index: number, word: boolean): Kind {
  const h = hash(index * 7 + 3);
  if (!word) return h % 9 === 0 ? "video" : "photo";
  const kinds: Kind[] = ["story", "overlay", "note", "message", "recording", "video", "overlay", "band", "story", "message"];
  return kinds[h % kinds.length]!;
}

function seconds(index: number) {
  const s = 3 + (hash(index + 11) % 12);
  return `0:${String(s).padStart(2, "0")}`;
}

function photoStyle(index: number, full: boolean) {
  const h = hash(index);
  const image = `url(/parametric-interface/v4/wallpapers/${String((h % WALLPAPERS) + 1).padStart(2, "0")}.jpg)`;
  if (full) return { backgroundImage: image };
  return {
    backgroundImage: image,
    backgroundPosition: `${(h >>> 4) % 101}% ${(h >>> 11) % 101}%`,
    backgroundSize: `${100 + ((h >>> 18) % 3) * 35}% auto`,
  };
}

function Picture({ index, kind, text, full = false }: { index: number; kind: Kind; text?: string; full?: boolean }) {
  // The word is set to the tile: the shorter it is, the larger (--len, in characters).
  const len = { "--len": Math.max(3, text?.length ?? 3) } as CSSProperties;
  switch (kind) {
    case "note":
      return (
        <span className={styles.note} style={len}>
          <span className={styles.noteBar}>
            <span>‹ Notes</span>
          </span>
          <span className={styles.noteWord}>{text}</span>
        </span>
      );
    case "message":
      return (
        <span className={styles.message} style={len}>
          <span className={styles.bubble}>{text}</span>
        </span>
      );
    case "recording":
      return (
        <span className={styles.recording} style={len}>
          <span className={styles.recordingDot} />
          <span className={styles.recordingWord}>{text}</span>
        </span>
      );
    default:
      return (
        <span className={styles.photo} style={{ ...photoStyle(index, full), ...len }}>
          {text && kind === "story" ? <span className={styles.story}>{text}</span> : null}
          {text && kind === "overlay" ? <span className={styles.overlay}>{text}</span> : null}
          {text && kind === "band" ? <span className={styles.band}>{text}</span> : null}
          {text && kind === "video" ? <span className={styles.caption}>{text}</span> : null}
        </span>
      );
  }
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
  const [library, setLibrary] = useState<Library>(() => ({ lines, shots: append([], lines) }));
  if (library.lines !== lines) setLibrary({ lines, shots: append(library.shots, lines) });
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

  let videos = BASE_VIDEOS;
  for (const shot of shots) {
    const kind = kindOf(BASE + shot.n, true);
    if (kind === "video" || kind === "recording") videos += 1;
  }
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
  const newest = shots.length > 0 ? total - 1 : -1;

  return (
    <section className={styles.app} aria-label="Photos" inert={!shown}>
      <div ref={gridRef} className={styles.scroll}>
        <ul className={styles.grid} aria-label="Library">
          {tiles.map((tile) => (
            <li key={tile.index} className={styles.cell} data-new={(tile.index === newest && !reducedMotion) || undefined}>
              <button
                type="button"
                className={styles.tile}
                aria-label={tile.text ? `${tile.kind === "video" || tile.kind === "recording" ? "Video" : "Photo"}, ${tile.text}` : "Photo"}
                onClick={() => setOpen(tile.index)}
              >
                <Picture index={tile.index} kind={tile.kind} text={tile.text} />
                {tile.kind === "video" || tile.kind === "recording" ? <span className={styles.duration}>{seconds(tile.index)}</span> : null}
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
          <div className={styles.viewerImage} data-kind={viewing.kind}>
            <Picture index={viewing.index} kind={viewing.kind} text={viewing.text} full />
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
