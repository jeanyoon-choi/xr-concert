"use client";

// YouTube Shorts on iOS (the Shorts tab's player), at native points.
//
// The interface — top bar, action rail, channel / title / sound, progress
// line, tab bar — is chrome.tsx in this folder, shared with the other two
// Shorts variants; its header says which parts are YouTube's served assets
// and published metrics and which were not checked against the iOS app.
//
// Lyric slot: the video itself. The Short is a lyric video of the "night
// drive" kind: moody night footage — rain on a car window, wet streets,
// tail-lights, fog — with the line being sung set in the middle, large and
// white; the whole line is on screen from its first word (so nothing ever
// moves), the words already sung white and the words to come dim, each
// easing up as it is sung (../lyric-words). The line always stays inside its
// box, clear of the rail, the top bar and the caption block: when the
// text-size option makes it too large, its type is fitted down (fit.ts). The footage is twelve real photographs
// (Unsplash License; public/part4/v1/youtube-shorts/attribution.json), one
// per sung line, cross-fading when the line changes and drifting very
// slowly so it reads as video. The song and the singer are named nowhere:
// the account is an ordinary private one (hers), with a private title and
// small numbers, and the sound row is its own original sound.

import { memo, useRef, useState } from "react";
import { LyricWords } from "../lyric-words";
import type { PhoneStateProps } from "../types";
import { ShortsOverlay, ShortsTabBar } from "./chrome";
import { useFit } from "./fit";
import styles from "./youtube-shorts.module.css";

// Whose Short it is: an ordinary private account — the woman of the song,
// posting about her ex to the few people who follow her.
const ACCOUNTS = [
  { handle: "@hana_0412", tint: "#8e96a8" },
  { handle: "@jiwoo.k97", tint: "#a99486" },
  { handle: "@minseo_j22", tint: "#8aa39a" },
  { handle: "@ellie_park03", tint: "#9c8fb0" },
  { handle: "@sora.y_", tint: "#b09a7c" },
  { handle: "@dahye1108", tint: "#7f9bb3" },
  { handle: "@yuna_c96", tint: "#a38a94" },
  { handle: "@noor.h_27", tint: "#8c9a86" },
] as const;

const STILLS = 12;
const stillSrc = (index: number) => `/part4/v1/youtube-shorts/${String(index + 1).padStart(2, "0")}.jpg`;

/** The still under line `cue` on a seat's phone: seats start on different stills and step by 5 (coprime with 12), so no two lines in a row share one. */
function stillOf(seat: number, cue: number) {
  return (((seat * 7 + cue * 5) % STILLS) + STILLS) % STILLS;
}

const TITLES = [
  "not over it",
  "posting this so i dont text him",
  "for no one in particular",
  "one year and i still know the words",
  "he knows",
  "dont ask",
  "found this in my drafts",
  "me at 3am again",
  "deleting this later",
  "anyway #ex",
  "still mad honestly",
  "if you see this no you didnt",
] as const;

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
  // A private account's numbers: 3 to about 200 likes, a handful of comments at most.
  const likes = Math.round(3 * 66 ** roll(1));
  const account = ACCOUNTS[seat % ACCOUNTS.length]!;
  return {
    ...account,
    initial: account.handle[1]!.toUpperCase(),
    title: TITLES[(h >>> 4) % TITLES.length]!,
    likes,
    comments: Math.min(12, Math.floor(likes * roll(2) * 0.12)),
    progress: 0.18 + roll(3) * 0.6,
  };
}

function YouTubeShortsState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const short = shortOf(seat);
  const line = lines.at(-1);
  // The line is kept inside its box at every text size.
  const lyric = useRef<HTMLParagraphElement>(null);
  const cue = line?.cueIndex;
  useFit(lyric, cue);
  // The footage: the line's still, over the one before it while it fades in.
  const stillNow = stillOf(seat, cue ?? -1);
  const [still, setStill] = useState(stillNow);
  const [under, setUnder] = useState<number | null>(null);
  if (still !== stillNow) {
    setUnder(still);
    setStill(stillNow);
  }
  const running = shown && !reducedMotion;

  return (
    <section className={styles.app} aria-label="YouTube Shorts" inert={!shown} data-running={running || undefined}>
      <div className={styles.feed}>
        {/* The video: night footage, dimmed just enough for the type, the line in the middle. */}
        <div className={styles.video}>
          {/* eslint-disable @next/next/no-img-element -- stills stand in for the playing video */}
          {under !== null && under !== still ? <img key={`still-${under}`} className={styles.still} data-drift={under % 2 ? "b" : "a"} src={stillSrc(under)} alt="" draggable={false} /> : null}
          <img key={`still-${still}`} className={styles.still} data-drift={still % 2 ? "b" : "a"} src={stillSrc(still)} alt="" draggable={false} onAnimationEnd={() => setUnder(null)} />
          {/* The next line's still, fetched ahead so the cross-fade has a picture. */}
          <img className={styles.ahead} src={stillSrc(stillOf(seat, (cue ?? -1) + 1))} alt="" />
          {/* eslint-enable @next/next/no-img-element */}
          <div className={styles.dim} aria-hidden="true" />
          {line ? (
            <p key={line.cueIndex} ref={lyric} data-lyric className={styles.lyric} aria-live="off">
              <span>
                <LyricWords line={line} rest="dim" />
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
