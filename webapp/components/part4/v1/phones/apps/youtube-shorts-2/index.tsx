"use client";

// YouTube Shorts on iOS (the Shorts tab's player), at native points.
//
// The interface — top bar, action rail, channel / title / sound, progress
// line, tab bar — is ../youtube-shorts/chrome.tsx, shared by the three
// Shorts variants; its header says which parts are YouTube's served assets
// and published metrics and which were not checked against the iOS app.
//
// Lyric slot: the video itself. The Short is a one-word-at-a-time lyric
// edit over home-video stills: only the word being sung is on screen, dead
// centre, as large as the frame allows; the next word replaces it at its
// onset — a hard cut, no fade or settle; the word's element is keyed by its
// place in the song, so the one before is gone in the same frame and two
// words are never on screen together. Nothing is on screen before the line begins. The fit is
// CSS: the word carries its estimated width in em (--len) and the stylesheet
// divides the frame's width by it.
//
// Behind the word, one photograph per sung line (cut on the new line), under
// a flat dim and with a slight handheld drift: a relationship remembered —
// him out of focus, a hand at a car window, a kitchen at night, the sea at
// dusk. They are real photographs (Unsplash License; see
// public/part4/v1/youtube-shorts-2/attribution.json). No camcorder overlay.
//
// The Short is a private person's post — a personal handle, a handful of
// likes — and names neither the song nor the singer.

import { memo, type CSSProperties } from "react";
import type { PhoneStateProps } from "../types";
import { ShortsOverlay, ShortsTabBar } from "../youtube-shorts/chrome";
import styles from "./youtube-shorts.module.css";

const STILLS = [
  "01-him-street",
  "02-him-smile",
  "03-car-hand",
  "04-kitchen",
  "05-sea-run",
  "06-shore",
  "07-orange",
  "08-him-blur",
  "09-passenger",
  "10-car-lights",
  "11-walk-home",
  "12-bonfire",
] as const;

/** The still behind a line: by seat and line, five apart so no two lines running share one. */
function stillFor(seat: number, cue: number) {
  return STILLS[(((seat * 7 + cue * 5) % STILLS.length) + STILLS.length) % STILLS.length]!;
}

// Personal accounts, one per seat: a first name with digits or an underscore.
const CHANNELS = [
  { handle: "@hana_0412", tint: "#5c6bc0" },
  { handle: "@jisoo.kwon97", tint: "#8e24aa" },
  { handle: "@mia_rhodes2", tint: "#00897b" },
  { handle: "@chloe_1107", tint: "#c2185b" },
  { handle: "@yuna__park", tint: "#3949ab" },
  { handle: "@nora.ellis03", tint: "#6d4c41" },
  { handle: "@sophie_k21", tint: "#ef6c00" },
  { handle: "@dahye0926", tint: "#0288d1" },
  { handle: "@lena_marsh", tint: "#546e7a" },
  { handle: "@emma.j_98", tint: "#7cb342" },
  { handle: "@seoyeon_00", tint: "#d81b60" },
  { handle: "@ivy_tran14", tint: "#5e35b1" },
] as const;

// Captions in a private voice: short, lowercase, at most one hashtag.
const TITLES: readonly (readonly [string, string?])[] = [
  ["for no one in particular"],
  ["found this in my drafts"],
  ["two years. anyway"],
  ["not about you (it is)"],
  ["posting this then logging off"],
  ["he knows", "#fyp"],
  ["still on my mind i guess"],
  ["don't ask", "#shorts"],
  ["3am again"],
  ["should've deleted this"],
  ["if you see this no you didn't"],
  ["us, basically"],
];

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The Short a seat is watching: fixed by the seat, so a reload shows the same one. */
function shortOf(seat: number) {
  const h = hash(seat * 197 + 11);
  const roll = (salt: number) => (hash(h + salt) % 10_000) / 10_000;
  // A private post's numbers: 3 to about 200 likes, 0 to 12 comments.
  const likes = Math.round(3 * 66 ** roll(1));
  const channel = CHANNELS[seat % CHANNELS.length]!;
  const [title, tag] = TITLES[(h >>> 4) % TITLES.length]!;
  return {
    ...channel,
    initial: channel.handle[1]!.toUpperCase(),
    title,
    tag,
    likes,
    comments: Math.min(12, Math.floor(likes * roll(2) * 0.1)),
    progress: 0.18 + roll(3) * 0.6,
  };
}

/**
 * The word as the frame shows it — lowercase, without the line's commas and
 * full stops — and its width in em at the lyric's face (SF Pro Display 800,
 * -0.035em tracking), estimated from the letters: no DOM measurement.
 */
function shownWord(word: string) {
  const text = word.toLowerCase().replace(/[“”"]/g, "").replace(/[,.:;!?]+$/, "");
  let em = 0;
  for (const letter of text) em += (/[ijl'’.,!]/.test(letter) ? 0.3 : /[ftr]/.test(letter) ? 0.42 : /[mw]/.test(letter) ? 0.92 : 0.64) - 0.035;
  return { text, em: Math.max(1, em * 0.96) };
}

function YouTubeShortsState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const short = shortOf(seat);
  const line = lines.at(-1);
  // The word being sung, alone; nothing until the line has begun.
  const word = line && line.sung > 0 ? shownWord(line.words[line.sung - 1]!) : null;
  // This line's still and the next line's, which is already loaded when the cut comes.
  const cue = line?.cueIndex ?? -1;
  const stills = [stillFor(seat, cue), stillFor(seat, cue + 1)];
  const running = shown && !reducedMotion;

  return (
    <section className={styles.app} aria-label="YouTube Shorts" inert={!shown} data-running={running || undefined}>
      <div className={styles.feed}>
        {/* The video: a still per line, one word in the middle of the frame. */}
        <div className={styles.video}>
          <div className={styles.stills} style={{ animationDelay: `${-(seat % 12) * 1.9}s` }} aria-hidden="true">
            {stills.map((still, index) => (
              <span key={still} data-on={index === 0 || undefined} style={{ backgroundImage: `url(/part4/v1/youtube-shorts-2/${still}.jpg)` }} />
            ))}
          </div>
          {line && word ? (
            <p data-lyric className={styles.lyric} aria-live="off">
              <span key={`${line.cueIndex}-${line.sung}`} style={{ "--len": word.em.toFixed(3) } as CSSProperties}>
                {word.text}
              </span>
            </p>
          ) : null}
        </div>

        <ShortsOverlay short={short} running={running} />
      </div>

      <ShortsTabBar />
    </section>
  );
}

export default memo(YouTubeShortsState);
