"use client";

// YouTube Shorts on iOS (the Shorts tab's player), at native points.
//
// The interface — top bar, action rail, channel / title / sound, progress
// line, tab bar — is ../youtube-shorts/chrome.tsx, shared by the three
// Shorts variants; its header says which parts are YouTube's served assets
// and published metrics and which were not checked against the iOS app.
//
// Lyric slot: the video itself. The Short is a quiet lyric video: stills
// with the look of 35mm film at golden hour or under tungsten light (an
// empty room, a bed, a lawn, a parked car, two cups left on a sill), one per
// sung line, cross-fading on a new line and pushing in very slowly. Over
// them, lowercase serif, regular weight, white. The line being sung appears
// word by word (the whole line is laid out from its first word, the words
// not yet sung unseen, so nothing reflows, and each word eases in:
// ../lyric-words; a word wider than the frame at a large text size has the
// line's type fitted down rather than being broken: ../youtube-shorts/fit) at the centre of the video area; the one or two lines
// before it stay above, fainter, so the screen reads like a poem being
// written. The block is left-aligned and is centred as a block in the area
// left of the rail (measured, see `place`). The app is handed only the
// newest line, so it keeps the earlier ones itself. Each still carries a
// flat dim, only as strong as that photograph needs for the type to read.
//
// Photographs: public/part4/v1/youtube-shorts-3 (Unsplash License; sources
// and photographers in attribution.json there).
//
// The Short is a private person's: a personal handle, a handful of likes, a
// title in her own voice. The song and the singer are named nowhere.

import { memo, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { LyricWords } from "../lyric-words";
import type { PhoneStateProps } from "../types";
import { ShortsOverlay, ShortsTabBar } from "../youtube-shorts/chrome";
import { useFit } from "../youtube-shorts/fit";
import styles from "./youtube-shorts.module.css";

// Ordinary personal accounts, one per seat.
const CHANNELS = [
  { handle: "@yuna_0917", tint: "#5c6bc0" },
  { handle: "@sophie.k03", tint: "#8e24aa" },
  { handle: "@jisoo__98", tint: "#00897b" },
  { handle: "@emma_2206", tint: "#c2185b" },
  { handle: "@nari0311", tint: "#3949ab" },
  { handle: "@chloe_hj", tint: "#6d4c41" },
  { handle: "@dahye.99", tint: "#ef6c00" },
  { handle: "@lena_1124", tint: "#0288d1" },
  { handle: "@seoyeon_07", tint: "#7cb342" },
  { handle: "@mia.0502", tint: "#d81b60" },
  { handle: "@hayoung__", tint: "#546e7a" },
  { handle: "@clara_k98", tint: "#f4511e" },
] as const;

// Captions in a private voice; at most one hashtag, usually none.
const TITLES = [
  { title: "not sending this to you", tag: "" },
  { title: "3am again", tag: "" },
  { title: "you know who you are", tag: "" },
  { title: "posting this then deleting", tag: "" },
  { title: "i said what i said", tag: "" },
  { title: "for no one in particular", tag: "" },
  { title: "things i never told him", tag: "#unsent" },
  { title: "still on my mind, sadly", tag: "" },
  { title: "do not text him", tag: "#notetoself" },
  { title: "we were never fine", tag: "" },
] as const;

/** The stills (01.jpg …) and the flat dim each needs under white type. */
const STILL_DIMS = [0.3, 0.3, 0.38, 0.5, 0.42, 0.44, 0.2, 0.5, 0.45, 0.25, 0.5, 0.2] as const;
/** Coprime with the number of stills, so consecutive lines never share one. */
const STRIDE = 5;

/** The still a seat shows for a line: fixed by seat and line, and different on each of twelve phones side by side. */
function stillOf(seat: number, cue: number) {
  const count = STILL_DIMS.length;
  const index = (((seat + cue * STRIDE) % count) + count) % count;
  return { src: `/part4/v1/youtube-shorts-3/${String(index + 1).padStart(2, "0")}.jpg`, dim: STILL_DIMS[index]! };
}

/** Typographic quotes and apostrophes for a word of the line. */
function set(word: string) {
  return word
    .replace(/^"/, "\u201c")
    .replace(/"/g, "\u201d")
    .replace(/^'/, "\u2018")
    .replace(/'/g, "\u2019");
}

/** How many earlier lines stay above the one being sung. */
const EARLIER = 2;

type Kept = { readonly cueIndex: number; readonly words: readonly string[] };

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
  // A private account's numbers: 3 to about 200 likes, 0 to 12 comments.
  const likes = Math.round(3 * (200 / 3) ** roll(1));
  const channel = CHANNELS[seat % CHANNELS.length]!;
  const caption = TITLES[(h >>> 4) % TITLES.length]!;
  return {
    ...channel,
    initial: channel.handle[1]!.toUpperCase(),
    title: caption.title,
    tag: caption.tag || undefined,
    likes,
    comments: Math.min(12, Math.round(likes * roll(2) * 0.09)),
    progress: 0.18 + roll(3) * 0.6,
  };
}

function YouTubeShortsState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const short = shortOf(seat);
  const line = lines.at(-1);
  // The lines that passed, kept here because the app is handed only the
  // newest: appended while the cues run on one after another, started over
  // when the song restarts, seeks, or skips (derived during render).
  const [kept, setKept] = useState<readonly Kept[]>([]);
  const last = kept.at(-1);
  if (!line) {
    if (kept.length) setKept([]);
  } else if (!last || last.cueIndex !== line.cueIndex) {
    const entry = { cueIndex: line.cueIndex, words: line.words };
    setKept(last && line.cueIndex === last.cueIndex + 1 ? [...kept, entry].slice(-(EARLIER + 1)) : [entry]);
  }
  const earlier = line ? kept.filter((item) => item.cueIndex < line.cueIndex).slice(-EARLIER) : [];

  // The block is left-aligned, and centred as a block: it is moved right by
  // half of what its longest row leaves free. An earlier line that would be
  // cut by the top of the frame is left out whole. Measured as ratios, so
  // the phone's own scaling does not matter; re-run when the block resizes
  // (the text-size option).
  const poem = useRef<HTMLDivElement>(null);
  const lyric = useRef<HTMLParagraphElement>(null);
  const cue = line?.cueIndex;
  // Before the block is placed: no word of the line is wider than the frame.
  useFit(lyric, cue, "width");
  // The line before's still stays under the new one while it fades in; the
  // next line's is in the page already, unseen, so the fade never waits.
  const at = cue ?? -1;
  const stills = [at - 1, at, at + 1];
  useLayoutEffect(() => {
    const block = poem.current;
    const frame = block?.parentElement;
    if (!block || !frame) return;
    const place = () => {
      const box = block.getBoundingClientRect();
      if (!box.width) return;
      const top = frame.getBoundingClientRect().top;
      let right = box.left;
      for (const row of block.querySelectorAll<HTMLElement>("p")) {
        const fits = row.getBoundingClientRect().top >= top - 0.5;
        row.style.visibility = fits ? "" : "hidden";
        if (!fits) continue;
        for (const rect of row.firstElementChild?.getClientRects() ?? []) right = Math.max(right, rect.right);
      }
      const free = Math.max(0, 1 - (right - box.left) / box.width);
      block.style.transform = `translate(${(free * 50).toFixed(3)}%, -50%)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(block);
    return () => observer.disconnect();
  }, [cue, earlier.length]);
  const running = shown && !reducedMotion;

  return (
    <section className={styles.app} aria-label="YouTube Shorts" inert={!shown} data-running={running || undefined}>
      <div className={styles.feed}>
        {/* The video: film stills, the poem written line by line over them. */}
        <div className={styles.video}>
          {stills.map((index) => {
            const still = stillOf(seat, index);
            return (
              <span
                key={index}
                className={styles.still}
                data-ahead={index > at || undefined}
                style={{ "--dim": still.dim } as CSSProperties}
                aria-hidden="true"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={still.src} alt="" draggable={false} />
              </span>
            );
          })}
          <div className={styles.frame}>
            {line ? (
              <div ref={poem} className={styles.poem}>
                <div className={styles.earlier} aria-hidden="true">
                  {earlier.map((item, index) => (
                    <p key={item.cueIndex} data-age={earlier.length - index}>
                      <span>{item.words.map(set).join(" ")}</span>
                    </p>
                  ))}
                </div>
                <p key={line.cueIndex} ref={lyric} data-lyric className={styles.lyric} aria-live="off">
                  <span>
                    <LyricWords line={line} rest="hold" format={set} />
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <ShortsOverlay short={short} running={running} />
      </div>

      <ShortsTabBar />
    </section>
  );
}

export default memo(YouTubeShortsState);
