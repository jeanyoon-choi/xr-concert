"use client";

import { memo, useLayoutEffect, useMemo, useRef } from "react";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import styles from "./voice-memos.module.css";

// iOS 18 Voice Memos, dark appearance, a recording in progress in the
// expanded recording sheet with the transcript turned on (iOS 18's live
// transcription: the quote-bubble button at bottom left, active). She is
// recording the concert in the room; the transcript writes down what is sung.
// Lyric slot: the live transcript — each sung line a sentence of it, the
// newest growing character by character, older ones above; the transcript
// keeps its newest words in view. The waveform is static SVG bars that only
// slide by a CSS transform (no per-frame JS); the timer is derived from the
// song position, so it advances with the transcript.
//
// Sources: layout and colours from iOS 18 Voice Memos (Apple, iOS 18 User
// Guide "Record in Voice Memos" / "View a transcript" screenshots); system
// colours are Apple HIG dark values (systemRed #ff453a, secondary label
// #8e8e93, secondarySystemBackground #1c1c1e). SF Symbols are not served as
// assets, so quote.bubble, pause and the stop square are drawn to their
// SF Symbols proportions here.

/** The memo before this one in All Recordings. */
const RECORDING_NUMBER = 14;
/** The memo began this long before the song (the crowd, the lights going down). */
const LEAD_MS = 64_000;
/** When it was started: 64 s before the song's 21:30 (model/clock-face). */
const STARTED = "21:28";
/** Characters of a line arrive about every 55 ms. */
const CHAR_MS = 55;
const BARS = 39;
const PITCH = 5;

/** What the transcript had caught before the first line: the room. */
const PRIOR = ["Okay, I think it's recording.", "She's coming out now."];

function Glyph({ name }: { name: "transcript" | "pause" }) {
  switch (name) {
    case "transcript":
      return (
        <svg aria-hidden="true" viewBox="0 0 26 24" width="26" height="24">
          <path d="M13 1.5C6.6 1.5 1.5 5.7 1.5 11c0 3 1.7 5.7 4.3 7.4-.3 1.6-1.1 3.1-2.3 4.3 2.6-.1 4.9-1.1 6.5-2.6 1 .2 2 .4 3 .4 6.4 0 11.5-4.2 11.5-9.5S19.4 1.5 13 1.5Z" fill="currentColor" />
          <path d="M8.2 13.6c-.9 0-1.6-.8-1.6-1.9 0-1.6 1-3 2.6-3.6l.4.6c-.9.5-1.4 1.1-1.5 1.8.9 0 1.6.6 1.6 1.5s-.7 1.6-1.5 1.6Zm4.8 0c-.9 0-1.6-.8-1.6-1.9 0-1.6 1-3 2.6-3.6l.4.6c-.9.5-1.4 1.1-1.5 1.8.9 0 1.6.6 1.6 1.5S13.8 13.6 13 13.6Z" fill="var(--vm-sheet)" />
        </svg>
      );
    case "pause":
      return (
        <svg aria-hidden="true" viewBox="0 0 16 18" width="16" height="18">
          <rect x="1" y="1" width="4.6" height="16" rx="1.4" fill="currentColor" />
          <rect x="10.4" y="1" width="4.6" height="16" rx="1.4" fill="currentColor" />
        </svg>
      );
  }
}

/** A seat's own waveform: deterministic bar heights, the room's level. */
function barsOf(seat: number) {
  let s = (seat + 1) * 2654435761;
  const heights: number[] = [];
  for (let index = 0; index < BARS; index += 1) {
    s = (s * 1103515245 + 12345) >>> 0;
    const noise = (s >>> 8) / 0xffffff;
    const swell = 0.55 + 0.45 * Math.sin(index * 0.42 + seat);
    heights.push(Math.max(2, Math.round((6 + noise * 46) * swell)));
  }
  return heights;
}

function stopwatch(ms: number) {
  const centis = Math.floor(ms / 10);
  const minutes = Math.floor(centis / 6000);
  const seconds = Math.floor(centis / 100) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centis % 100).padStart(2, "0")}`;
}

function VoiceMemosState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const bars = useMemo(() => barsOf(seat), [seat]);
  const newest = lines.at(-1);
  const elapsed = LEAD_MS + (newest ? newest.startMs + newest.text.length * CHAR_MS : 0);

  // Newest words in view, as the live transcript scrolls itself.
  useLayoutEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript || !shown) return;
    follow(transcript, transcript.scrollHeight, reducedMotion);
  }, [lines, shown, reducedMotion]);

  // Two copies of the bars side by side, so the strip loops seamlessly.
  const width = BARS * PITCH;
  const strip = [...bars, ...bars];

  return (
    <section className={styles.app} aria-label="Voice Memos" inert={!shown}>
      <span className={styles.behind} aria-hidden="true" />
      <div className={styles.sheet}>
        <span className={styles.grabber} aria-hidden="true" />
        <h2 className={styles.title}>New Recording {RECORDING_NUMBER}</h2>
        <p className={styles.date}>Nov 3, 2026 at {STARTED}</p>

        <div ref={transcriptRef} className={styles.transcript} aria-live="off">
          {PRIOR.map((sentence) => (
            <p key={sentence} className={styles.sentence}>{sentence}</p>
          ))}
          {lines.map((line) => (
            <p key={line.cueIndex} className={styles.sentence} data-live={line.current || undefined}>
              {line.text}
            </p>
          ))}
        </div>

        <div className={styles.wave} aria-hidden="true">
          <span className={styles.recorded} style={{ width }}>
            <svg className={styles.strip} data-still={reducedMotion || undefined} viewBox={`0 0 ${width * 2} 56`} width={width * 2} height="56">
              {strip.map((height, index) => (
                <rect key={index} x={index * PITCH + 1} y={28 - height / 2} width="3" height={height} rx="1.5" />
              ))}
            </svg>
          </span>
          <span className={styles.playhead} />
          <span className={styles.ahead} />
        </div>

        <p className={styles.time}>{stopwatch(elapsed)}</p>

        <div className={styles.controls} aria-hidden="true">
          <span className={styles.transcriptButton} data-active>
            <Glyph name="transcript" />
          </span>
          <span className={styles.stop}>
            <span />
          </span>
          <span className={styles.pause}>
            <Glyph name="pause" />
          </span>
        </div>
      </div>
    </section>
  );
}

export default memo(VoiceMemosState);
