"use client";

import { memo, useState, type CSSProperties } from "react";
import { dateLabel } from "../../../clock/wall-clock";
import { LyricWords } from "../lyric-words";
import type { PhoneStateProps } from "../types";
import styles from "./photos.module.css";

// iOS 18 Photos, a memory movie playing with its controls shown. It is her
// memory of him: one photograph fills the screen at a time with the slow
// Ken Burns move, and dissolves into the next on each new sung LINE. The line
// being sung is the memory's title — large, bold, white, lower-left under its
// date line — set word by word. Every photograph, the scrubber's thumbnails
// too, has one plain black bar over his eyes; the bar is inside the
// photograph, so it moves with the push. Before the song it is the memory's
// cover, titled "Him".
//
// Source: the iOS 18 player as pictured in Apple's iPhone User Guide,
// "Personalize your memory movies"
// (support.apple.com/guide/iphone/personalize-your-memory-movies-iph1a5832438/18.0/ios/18.0):
// top row — a round back button, the memory's name centred, round Volume and
// More buttons; a filmstrip scrubber of the movie's photographs, the playing
// one larger and set apart; at the foot the round Memory Mixes button and the
// "Photos | Movie" control. Positions and sizes are measured from that one
// picture (so to about a point).
// Approximate, or changed on purpose:
// - Under the memory's name the real player writes the song playing and its
//   artist; no interface here may name them, so that line is left out.
// - The big lower-left title with an uppercase date line above it follows
//   how Photos sets a memory's title on its cover; the real movie shows it
//   only as it opens, here it stays, since it is the lyric.
// - The pause glyph the real player shows mid-screen is left out: it would
//   sit on his face and under the title.
// - The buttons' blurred material is a flat translucent grey (no backdrop
//   blur over a moving picture, twelve phones at once); the dark shade under
//   the controls is estimated.
// Glyphs drawn here, to SF Symbols shapes: chevron.left, speaker.wave.2,
// ellipsis, and the Memory Mixes note with sparkles.
// Photographs: Unsplash and Pexels, public/part4/v1/photos (see
// attribution.json there).

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

/** A bar needs eyes to cover: only the photographs with a visible face are in the movie. */
const FACES: readonly Photo[] = ROLL.filter((photo) => photo.eyes);

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Strides coprime with the roll's length: a seat walks the whole roll before a photograph returns. */
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const STRIDES = Array.from({ length: FACES.length - 2 }, (_, index) => index + 2).filter((stride) => gcd(stride, FACES.length) === 1);

/** The photograph for a line (the cover is line -1): fixed by seat and line, never the one before it. */
function photoFor(seat: number, cue: number): Photo {
  const length = FACES.length;
  const stride = STRIDES[hash(seat * 2 + 1) % STRIDES.length]!;
  const at = (hash(seat) + cue * stride) % length;
  return FACES[(at + length) % length]!;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** The glass, in points. */
const SCREEN_W = 390;
const SCREEN_H = 844;
/** Where his eyes sit on the screen, from the top (the title is below them). */
const EYE_LINE = 0.36;
/** The furthest the bar turns with a tilted head, in degrees. */
const MAX_TURN = 12;
/** The most a photograph is enlarged past covering the screen. */
const MAX_LEAN = 1.6;
/** How far the Ken Burns move goes. */
const PUSH = 1.14;

/**
 * The photograph's own box, covering a view of `viewW` × `viewH` with his
 * eyes brought to the middle and to `eyeLine` as far as the edges allow, and
 * the bar in it (px of the view).
 */
function place(photo: Photo, viewW: number, viewH: number, eyeLine: number) {
  const eyes = photo.eyes!;
  const cx = (eyes.x + eyes.w / 2) / 100;
  const cy = (eyes.y + eyes.h / 2) / 100;
  const cover = Math.max(viewW / photo.w, viewH / photo.h);
  // It leans in until his eyes can be brought up to the eye line (they are never under the title), a little more when he is small in the frame.
  const reach = (viewH * (1 - eyeLine)) / ((1 - cy) * photo.h * cover);
  const scale = cover * clamp(Math.max(reach, Math.sqrt(photo.zoom ?? 1)), 1, MAX_LEAN);
  const width = photo.w * scale;
  const height = photo.h * scale;
  const left = clamp(viewW / 2 - cx * width, viewW - width, 0);
  const top = clamp(viewH * eyeLine - cy * height, viewH - height, 0);

  let barW = (eyes.w / 100) * width;
  let barH = (eyes.h / 100) * height;
  // The bar turns with the head only so far; past that it grows to still cover both eyes.
  const tilt = eyes.r ?? 0;
  const angle = clamp(tilt, -MAX_TURN, MAX_TURN);
  const over = (Math.abs(tilt - angle) * Math.PI) / 180;
  if (over > 0) {
    [barW, barH] = [barW * Math.cos(over) + barH * Math.sin(over), barW * Math.sin(over) + barH * Math.cos(over)];
  }
  barH = Math.max(barH, 1.5);
  const shot: CSSProperties = {
    left,
    top,
    width,
    height,
    transformOrigin: `${cx * width}px ${cy * height}px`,
    backgroundImage: `url(/part4/v1/photos/${photo.file}.jpg)`,
  };
  const bar: CSSProperties = {
    left: cx * width - barW / 2,
    top: cy * height - barH / 2,
    width: barW,
    height: barH,
    transform: angle ? `rotate(${angle}deg)` : undefined,
  };
  return { shot, bar };
}

function Shot({ photo, width, height, eyeLine, move }: { photo: Photo; width: number; height: number; eyeLine: number; move?: CSSProperties }) {
  const { shot, bar } = place(photo, width, height, eyeLine);
  return (
    <span className={styles.shot} style={{ ...shot, ...move }}>
      <span className={styles.censor} style={bar} />
    </span>
  );
}

function Glyph({ name }: { name: "back" | "volume" | "more" | "mixes" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 10 16" width="9" height="15"><path d="M8 1.6 2 8l6 6.4" {...stroke} strokeWidth={2.3} /></svg>;
    case "volume":
      return (
        <svg aria-hidden="true" viewBox="0 0 22 18" width="18" height="15">
          <path d="M1.6 6.6h2.9l4.3-3.7c.5-.4 1.2-.1 1.2.6v11c0 .7-.7 1-1.2.6l-4.3-3.7H1.6c-.5 0-.9-.4-.9-.9V7.5c0-.5.4-.9.9-.9Z" fill="currentColor" />
          <path d="M13.4 5.6a4.9 4.9 0 0 1 0 6.8M16.4 2.9a8.6 8.6 0 0 1 0 12.2" {...stroke} strokeWidth={1.7} />
        </svg>
      );
    case "more":
      return <svg aria-hidden="true" viewBox="0 0 18 4" width="16" height="4"><circle cx="2" cy="2" r="1.9" fill="currentColor" /><circle cx="9" cy="2" r="1.9" fill="currentColor" /><circle cx="16" cy="2" r="1.9" fill="currentColor" /></svg>;
    case "mixes":
      return (
        <svg aria-hidden="true" viewBox="0 0 26 26" width="25" height="25">
          {/* Two beamed notes. */}
          <path d="M11.2 19.6V7.2l11-2.5v12.6" {...stroke} strokeWidth={1.9} />
          <path d="M11.2 7.2l11-2.5v3.4l-11 2.5Z" fill="currentColor" />
          <ellipse cx="8.4" cy="19.9" rx="3" ry="2.4" fill="currentColor" />
          <ellipse cx="19.4" cy="17.6" rx="3" ry="2.4" fill="currentColor" />
          {/* Sparkles, upper left. */}
          <path d="M5.2 2.2c.3 2 .9 2.6 2.9 2.9-2 .3-2.6.9-2.9 2.9-.3-2-.9-2.6-2.9-2.9 2-.3 2.6-.9 2.9-2.9Z" fill="currentColor" />
          <path d="M2.9 9.6c.2 1.2.5 1.5 1.7 1.7-1.2.2-1.5.5-1.7 1.7-.2-1.2-.5-1.5-1.7-1.7 1.2-.2 1.5-.5 1.7-1.7Z" fill="currentColor" />
        </svg>
      );
  }
}

/** The memory's dates, "Sep 2025 – Nov 2026": some fourteen months, to today. */
const MONTH = { month: "short", year: "numeric" } as const;
const SPAN = `${dateLabel("en-US", MONTH, -430)} – ${dateLabel("en-US", MONTH)}`;
const COVER_TITLE = "Him";

/** The scrubber's thumbnails: 26 × 43 at a 32-pt pitch, the playing one 44 × 49 with 11 pt either side. */
const THUMB_W = 44;
const THUMB_H = 49;
const PITCH = 32;
const APART = 14;
const REACH = 7;

/** The title's size by its length, in points; `fit` keeps its longest word inside the 358-pt column. */
const GLYPH = 0.6;
function titleSize(text: string) {
  const size = text.length <= 14 ? 72 : text.length <= 26 ? 60 : text.length <= 38 ? 52 : 46;
  const longest = Math.max(...text.split(" ").map((word) => word.length));
  return { "--size": `${size}px`, "--fit": `${Math.floor((SCREEN_W - 32) / (GLYPH * longest))}px` } as CSSProperties;
}

/** The photograph playing and the one it dissolved from. */
type Reel = { readonly now: number; readonly before: number | null };

function PhotosMemoryState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const line = lines.at(-1);
  const cue = line?.cueIndex ?? -1;
  const [reel, setReel] = useState<Reel>({ now: cue, before: null });
  if (reel.now !== cue) setReel({ now: cue, before: reel.now });

  const slides = reel.before === null ? [reel.now] : [reel.before, reel.now];
  const thumbs: number[] = [];
  // The strip begins at the cover: nothing is before it.
  for (let at = Math.max(-1, cue - REACH); at <= cue + REACH; at += 1) thumbs.push(at);
  const title = line ? line.full : COVER_TITLE;

  return (
    <section
      className={styles.app}
      aria-label="Photos"
      inert={!shown}
      data-paused={!shown || undefined}
      data-still={reducedMotion || undefined}
    >
      <div className={styles.reel} aria-hidden="true">
        {slides.map((at) => (
          <div key={at} className={styles.slide} data-enter={(at === reel.now && reel.before !== null) || undefined}>
            <Shot
              photo={photoFor(seat, at)}
              width={SCREEN_W}
              height={SCREEN_H}
              eyeLine={EYE_LINE}
              // In on one photograph, out on the next.
              move={{ "--from": at % 2 === 0 ? 1 : PUSH, "--to": at % 2 === 0 ? PUSH : 1 } as CSSProperties}
            />
          </div>
        ))}
        <span className={styles.ahead} style={{ backgroundImage: `url(/part4/v1/photos/${photoFor(seat, cue + 1).file}.jpg)` }} />
      </div>
      <div className={styles.shade} aria-hidden="true" />

      <header className={styles.top} aria-hidden="true">
        <span className={styles.round}><Glyph name="back" /></span>
        <span className={styles.topRight}>
          <span className={styles.round}><Glyph name="volume" /></span>
          <span className={styles.round}><Glyph name="more" /></span>
        </span>
      </header>
      <p className={styles.name} aria-hidden="true">{COVER_TITLE}</p>

      <div className={styles.card}>
        <p className={styles.sub}>{SPAN}</p>
        <h2 key={cue} data-lyric className={styles.title} style={titleSize(title)}>
          {line ? <LyricWords line={line} rest="hold" /> : COVER_TITLE}
        </h2>
      </div>

      <div className={styles.strip} aria-hidden="true">
        {thumbs.map((at) => {
          const away = at - cue;
          const x = SCREEN_W / 2 + away * PITCH + Math.sign(away) * APART - THUMB_W / 2;
          return (
            <span key={at} className={styles.thumb} data-on={away === 0 || undefined} style={{ transform: `translateX(${x}px)` }}>
              <Shot photo={photoFor(seat, at)} width={THUMB_W} height={THUMB_H} eyeLine={0.42} />
            </span>
          );
        })}
      </div>

      <span className={styles.mixes} aria-hidden="true"><Glyph name="mixes" /></span>
      <span className={styles.modes} aria-hidden="true">
        <span>Photos</span>
        <span className={styles.modeOn}>Movie</span>
      </span>
    </section>
  );
}

export default memo(PhotosMemoryState);
