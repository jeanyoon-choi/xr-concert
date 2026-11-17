"use client";

import { memo, useEffect, useState, type CSSProperties } from "react";
import type { SungLine } from "../../../song/lines";
import { LyricWords } from "../lyric-words";
import type { PhoneStateProps } from "../types";
import styles from "./photos.module.css";

// iOS 18 Photos, light: one photograph open, its info panel pulled up (the
// swipe up on a photo, or the info button, which stands selected). It is her
// camera roll of him, one picture at a time, each with one plain black bar
// struck across his eyes. Under the photograph the sheet is the one Photos
// shows: the "Add a Caption" field first, then the day and time it was taken
// and its file name, then the camera card. The line being sung is what she
// types into the caption field — it IS the photo's caption, set word by word
// — and each new line swipes to the next photo, whose caption is empty until
// the line fills it.
//
// Sources. Apple's iPhone User Guide for iOS 18, "See photo and video
// information" (support.apple.com/guide/iphone/iph0edb9c18f/18.0/ios/18.0):
// swipe up or tap Info; the panel holds a caption field, the date and time,
// the file name, the iPhone model and camera settings (lens, shutter speed,
// file size) and a map; date and location are adjusted from the More button.
// TidBITS, "Get More Info from Photos in iOS 15" and MacRumors, "View EXIF
// metadata in Photos": the box under the date holds the model, the format,
// the camera with lens size and ƒ-stop, megapixels · resolution · file size,
// then ISO, lens, exposure value, ƒ-stop and shutter speed in one row.
// Approximate, drawn from memory of the app and not measured from a capture:
// every metric, type size and colour of the sheet and the card; the
// navigation bar (back chevron, date over time, More) and the toolbar's
// spacing; the photograph is cropped about his eyes to fill its area, where
// Photos slides the whole picture up; the caption is set at 32 pt, not the
// field's 17 pt, to be read on a small phone, so the rows under it are pushed
// down and the map never comes into view (none is drawn).
// Glyphs drawn here to SF Symbols geometry: chevron.left, ellipsis.circle,
// square.and.arrow.up, heart, info.circle.fill, slider.horizontal.3, trash.
// Photographs: Unsplash and Pexels, public/part4/v1/photos (attribution.json there).

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

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/** Only photographs with his face in them are opened: the bar needs eyes to cover. */
const FACES = ROLL.filter((photo): photo is Photo & { readonly eyes: Eyes } => Boolean(photo.eyes));

/**
 * The photo a seat shows for a line. Every seat walks the roll by the same
 * stride, which shares no factor with the roll's length, each from a start of
 * its own: two lines in a row never show the same picture, the whole roll
 * passes before one returns, and twelve phones side by side never show the
 * same picture at once.
 */
const STRIDE = 11;
const APART = 3;
function photoFor(seat: number, cue: number) {
  return FACES[(seat * APART + Math.max(0, cue) * STRIDE) % FACES.length]!;
}

const src = (photo: Photo) => `/part4/v1/photos/${photo.file}.jpg`;

/** The photograph's area in the page, in points, and where his eyes sit in it from the top. */
const VIEW_W = 390;
const VIEW_H = 320;
const EYE_LINE = 0.42;
/** The furthest the bar turns with a tilted head, in degrees. */
const MAX_TURN = 12;

/** The photograph fills its area, brought to his eyes; the bar is the eye rectangle. */
function layout(photo: Photo & { readonly eyes: Eyes }) {
  const { eyes } = photo;
  const scale = Math.max(VIEW_W / photo.w, VIEW_H / photo.h);
  const width = photo.w * scale;
  const height = photo.h * scale;
  const cx = (eyes.x + eyes.w / 2) / 100;
  const cy = (eyes.y + eyes.h / 2) / 100;
  const shot: CSSProperties = {
    left: clamp(VIEW_W / 2 - cx * width, VIEW_W - width, 0),
    top: clamp(VIEW_H * EYE_LINE - cy * height, VIEW_H - height, 0),
    width,
    height,
  };

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
    left: cx * width - barW / 2,
    top: cy * height - barH / 2,
    width: barW,
    height: barH,
    transform: angle ? `rotate(${angle}deg)` : undefined,
  };
  return { shot, bar };
}

/** Her phone: one per seat, so every photo in a roll comes from the same camera. */
const PHONES = [
  { name: "Apple iPhone 15 Pro", camera: "Main Camera", mm: 24, f: "1.78", mp: 24, long: 5712, short: 4284 },
  { name: "Apple iPhone 14", camera: "Main Camera", mm: 26, f: "1.5", mp: 12, long: 4032, short: 3024 },
  { name: "Apple iPhone 15", camera: "Main Camera", mm: 26, f: "1.6", mp: 24, long: 5712, short: 4284 },
  { name: "Apple iPhone 13 mini", camera: "Wide Camera", mm: 26, f: "1.6", mp: 12, long: 4032, short: 3024 },
] as const;

/** Sensitivity and the shutter speed that goes with it, bright to dark. */
const EXPOSURES = [
  [50, "1/1250"], [64, "1/640"], [80, "1/240"], [100, "1/120"], [125, "1/100"],
  [250, "1/60"], [400, "1/50"], [640, "1/33"], [1000, "1/25"], [1600, "1/15"],
] as const;

/**
 * The light each photograph was taken in (looked up from the pictures: their
 * mean brightness and what they show), so its hour and exposure agree with it:
 * the hours it could have been taken between, in minutes of the day, and the
 * span of EXPOSURES it draws from.
 */
const NIGHT = new Set(["03", "06", "08", "10", "13", "14", "21", "24", "33", "34"]);
const DUSK = new Set(["17", "22", "23"]);
const BRIGHT = new Set(["02", "04", "05", "07", "11", "12", "15", "16", "20", "25", "27", "29", "30", "32", "38", "40"]);
function lightOf(file: string) {
  if (NIGHT.has(file)) return { from: 19 * 60 + 40, to: 23 * 60 + 50, first: 6, count: 4 };
  if (DUSK.has(file)) return { from: 17 * 60 + 30, to: 19 * 60 + 10, first: 3, count: 3 };
  if (BRIGHT.has(file)) return { from: 10 * 60 + 40, to: 16 * 60 + 30, first: 0, count: 4 };
  return { from: 12 * 60, to: 18 * 60 + 30, first: 4, count: 3 };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** What Photos knows of a photograph, the same every time: taken within the last year, at an hour that suits its light. */
const TODAY = new Date();
function taken(photo: Photo) {
  const n = Number(photo.file);
  const date = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() - 2 - (hash(n * 13 + 5) % 340));
  const light = lightOf(photo.file);
  const minutes = light.from + (hash(n * 29 + 1) % (light.to - light.from));
  const time = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  const year = date.getFullYear() === TODAY.getFullYear() ? undefined : "numeric";
  const [iso, shutter] = EXPOSURES[light.first + (hash(n * 7 + 3) % light.count)]!;
  return {
    title: date.toLocaleDateString("en-US", { month: "long", day: "numeric", year }),
    time,
    weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    day: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    name: `IMG_${1000 + (hash(n * 53 + 9) % 8200)}`,
    megabytes: (hash(n * 17 + 2) % 19) / 10,
    iso,
    shutter,
  };
}

/** One page: a photo (by the line's place in the song) and the line that is its caption. */
type Page = { readonly cue: number; readonly line?: SungLine };
/** `prev` is the page swiped away from, kept while it leaves; without it the page is simply there. */
type Deck = { readonly lines: readonly SungLine[]; readonly cur: Page; readonly prev?: Page };

function turn(deck: Deck | undefined, lines: readonly SungLine[]): Deck {
  const line = lines.at(-1);
  // Before the song: the first photo, its caption empty; the first line is typed into it.
  const cur: Page = { cue: line?.cueIndex ?? 0, line };
  if (!deck) return { lines, cur };
  if (cur.cue === deck.cur.cue) return { lines, cur, prev: deck.prev };
  // The next line: swipe to the next photo, the one left keeping its whole caption.
  if (line && deck.cur.line && cur.cue > deck.cur.cue) {
    const left = deck.cur.line;
    return { lines, cur, prev: { cue: deck.cur.cue, line: { ...left, sung: left.words.length, text: left.full, current: false } } };
  }
  // The song went back or was restarted: the photo for that line is simply there.
  return { lines, cur };
}

type GlyphName = "back" | "more" | "share" | "heart" | "info" | "edit" | "trash";

function Glyph({ name }: { name: GlyphName }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 20" width="12" height="20"><path d="M10 1.5 2 10l8 8.5" {...stroke} strokeWidth={2.4} /></svg>;
    case "more":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10.2" {...stroke} strokeWidth={1.7} /><circle cx="7.3" cy="12" r="1.35" fill="currentColor" /><circle cx="12" cy="12" r="1.35" fill="currentColor" /><circle cx="16.7" cy="12" r="1.35" fill="currentColor" /></svg>;
    case "share":
      return <svg aria-hidden="true" viewBox="0 0 20 26" width="19" height="25"><path d="M10 16V2M5.5 6.2 10 1.8l4.5 4.4" {...stroke} strokeWidth={1.8} /><path d="M6.5 10H3.8A1.8 1.8 0 0 0 2 11.8v10.4A1.8 1.8 0 0 0 3.8 24h12.4a1.8 1.8 0 0 0 1.8-1.8V11.8A1.8 1.8 0 0 0 16.2 10h-2.7" {...stroke} strokeWidth={1.8} /></svg>;
    case "heart":
      return <svg aria-hidden="true" viewBox="0 0 24 22" width="24" height="22"><path d="M12 20.2S2 14.3 2 7.6A5.1 5.1 0 0 1 7.2 2.4c2.1 0 3.8 1.2 4.8 3 1-1.8 2.7-3 4.8-3A5.1 5.1 0 0 1 22 7.6c0 6.7-10 12.6-10 12.6Z" {...stroke} strokeWidth={1.8} /></svg>;
    case "info":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="currentColor" /><path d="M12 10.9v6.3" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth={2.2} /><circle cx="12" cy="7.2" r="1.4" fill="#fff" /></svg>;
    case "edit":
      return <svg aria-hidden="true" viewBox="0 0 24 22" width="24" height="22"><path d="M2 4.5h3.2m5.6 0H22M2 11h10.2m5.6 0H22M2 17.5h4.2m5.6 0H22" {...stroke} strokeWidth={1.8} /><circle cx="8" cy="4.5" r="2.6" {...stroke} strokeWidth={1.8} /><circle cx="15" cy="11" r="2.6" {...stroke} strokeWidth={1.8} /><circle cx="9" cy="17.5" r="2.6" {...stroke} strokeWidth={1.8} /></svg>;
    case "trash":
      return <svg aria-hidden="true" viewBox="0 0 22 24" width="22" height="24"><path d="M2 5.2h18M8 5V3.2c0-.7.5-1.2 1.2-1.2h3.6c.7 0 1.2.5 1.2 1.2V5M4.3 5.2l1.1 15.3c.1 1 .9 1.7 1.9 1.7h7.4c1 0 1.8-.7 1.9-1.7l1.1-15.3M9 9.5v8.5M13 9.5v8.5" {...stroke} strokeWidth={1.7} /></svg>;
  }
}

function PhotoPage({ seat, page, state }: { seat: number; page: Page; state?: "in" | "out" }) {
  const photo = photoFor(seat, page.cue);
  const info = taken(photo);
  const phone = PHONES[seat % PHONES.length]!;
  const portrait = photo.h > photo.w;
  const { shot, bar } = layout(photo);
  const megabytes = ((phone.mp === 24 ? 2.1 : 1.4) + info.megabytes).toFixed(1);
  return (
    <div className={styles.page} data-state={state} aria-hidden={state === "out" || undefined}>
      <span className={styles.frame} role="img" aria-label="Photo">
        <span className={styles.shot} style={{ ...shot, backgroundImage: `url(${src(photo)})` }}>
          <span className={styles.censor} style={bar} />
        </span>
      </span>
      <div className={styles.sheet}>
        <div className={styles.captionRow}>
          <p className={styles.caption} data-lyric data-empty={!page.line || undefined} aria-live="off">
            {page.line ? <LyricWords line={page.line} rest="hold" /> : "Add a Caption"}
          </p>
        </div>
        <div className={styles.rule} />
        <div className={styles.when}>
          <p>{info.weekday} • {info.day} • {info.time}</p>
          <p className={styles.file}>{info.name}</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>{phone.name}</span>
            <span className={styles.badge}>HEIF</span>
          </div>
          <div className={styles.cardBody}>
            <p>{phone.camera} — {phone.mm} mm ƒ{phone.f}</p>
            <p>
              {phone.mp} MP • {portrait ? phone.short : phone.long} × {portrait ? phone.long : phone.short} • {megabytes} MB
            </p>
          </div>
          <ul className={styles.exposure}>
            <li>ISO {info.iso}</li>
            <li>{phone.mm} mm</li>
            <li>0 ev</li>
            <li>ƒ{phone.f}</li>
            <li>{info.shutter} s</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PhotosState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const [deck, setDeck] = useState<Deck>(() => turn(undefined, lines));
  if (deck.lines !== lines) setDeck(turn(deck, lines));
  const { cur, prev } = deck;
  const moving = prev && !reducedMotion;
  const info = taken(photoFor(seat, cur.cue));

  // The next line's photograph is fetched while this one is up, so the swipe never lands on an empty frame.
  const next = src(photoFor(seat, cur.cue + 1));
  useEffect(() => {
    const image = new Image();
    image.src = next;
  }, [next]);

  return (
    <section className={styles.app} aria-label="Photos" inert={!shown}>
      <div className={styles.pages}>
        {moving ? <PhotoPage key={prev.cue} seat={seat} page={prev} state="out" /> : null}
        <PhotoPage key={cur.cue} seat={seat} page={cur} state={moving ? "in" : undefined} />
      </div>

      <header className={styles.top}>
        <span className={styles.back} role="img" aria-label="Back"><Glyph name="back" /></span>
        <span className={styles.heading}>
          <strong>{info.title}</strong>
          <span>{info.time}</span>
        </span>
        <span role="img" aria-label="More"><Glyph name="more" /></span>
      </header>

      <footer className={styles.tools} aria-hidden="true">
        <span><Glyph name="share" /></span>
        <span><Glyph name="heart" /></span>
        <span><Glyph name="info" /></span>
        <span><Glyph name="edit" /></span>
        <span><Glyph name="trash" /></span>
      </footer>
    </section>
  );
}

export default memo(PhotosState);
