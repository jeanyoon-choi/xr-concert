"use client";

import { memo } from "react";
import { SONG_DATE } from "../../clock-face";
import type { PhoneStateProps } from "../types";
import { contactFor } from "../types";
import { wallpaperOf } from "../../wallpapers";
import styles from "./ai-summary.module.css";

// The iOS 18 lock screen with Apple Intelligence notification summaries
// (iOS 18.1+, Settings › Notifications › Summarize Notifications). The ex has
// sent message after message; iOS groups them into one Messages stack and,
// instead of the newest message, the front card shows a one-line summary of
// the whole stack, set in italics (iOS 18.3) and led by the summary glyph,
// with "N more notifications" beneath. Lyric slot: the summary — as if Apple
// Intelligence boiled the ex's messages down to the line being sung, typed
// character by character. Each sung line is another message in the stack, so
// the count grows. Tapping the stack opens Messages, as on iOS.
//
// Layout and metrics are lock/'s (experiments-jyc SCC mobiles/1 os/lock.tsx:
// padlock, date, 108 pt clock, stack above flashlight and camera) and its
// wallpaper. The summary glyph is SF Symbols'
// text.line.first.and.arrowtriangle.forward, the symbol iOS 18 places before
// a summary; SF Symbols are not served as assets, so it is drawn to the
// symbol's proportions here, like lock/'s padlock, flashlight and camera.

/** Messages already in the stack before the song: last night's. */
const PRIOR = 3;
const PRIOR_SUMMARY = "Asking if you're still up; wants to talk tonight";

function Glyph({ name }: { name: "padlock" | "flashlight" | "camera" | "summary" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "padlock":
      return <svg aria-hidden="true" viewBox="0 0 16 20" width="14" height="18"><rect x="1.5" y="8.5" width="13" height="10" rx="2.6" fill="currentColor" /><path d="M4.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" {...stroke} strokeWidth={2.2} /></svg>;
    case "flashlight":
      return <svg aria-hidden="true" viewBox="0 0 16 26" width="15" height="24"><path d="M3 1.5h10v4.2l-2.5 4V24.5h-5V9.7L3 5.7Z" {...stroke} strokeWidth={1.8} /><path d="M3.4 5.2h9.2" {...stroke} strokeWidth={1.6} /><circle cx="8" cy="14.5" r="1.4" fill="currentColor" /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 28 22" width="26" height="20"><path d="M2 7a2.6 2.6 0 0 1 2.6-2.6h3.2l1.9-2.9h8.6l1.9 2.9h3.2A2.6 2.6 0 0 1 26 7v11.4a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 18.4Z" {...stroke} strokeWidth={1.8} /><circle cx="14" cy="12.4" r="4.6" {...stroke} strokeWidth={1.8} /></svg>;
    case "summary":
      return (
        <svg aria-hidden="true" className={styles.summaryGlyph} viewBox="0 0 16 13" width="15" height="12">
          <path d="M1 1.2v4.2l3.4-2.1Z" fill="currentColor" />
          <path d="M7 3.3h8M1.6 8h13.4M1.6 12h9.4" {...stroke} strokeWidth={1.6} />
        </svg>
      );
  }
}

/** Messages has no store artwork; its icon as drawn on iOS (as lock/). */
function MessagesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" width={38} height={38}>
      <defs>
        <linearGradient id="v4-3-ai-summary-messages-icon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5df777" />
          <stop offset="1" stopColor="#0abd34" />
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill="url(#v4-3-ai-summary-messages-icon)" />
      <path d="M30 13.5c-10.6 0-19.2 7-19.2 15.6 0 5 2.9 9.4 7.4 12.3-.4 2.5-1.7 4.8-3.6 6.6 3.6-.1 6.9-1.6 9.3-3.8 1.9.4 4 .6 6.1.6 10.6 0 19.2-7 19.2-15.7S40.6 13.5 30 13.5Z" fill="#fff" />
    </svg>
  );
}

function AiSummaryState({ seat, lines, clock, shown, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const newest = lines.at(-1);
  const total = PRIOR + lines.length;
  const more = total - 1;
  const summary = newest ? newest.text : PRIOR_SUMMARY;

  return (
    <section className={styles.lock} aria-label="Lock screen" inert={!shown} style={{ backgroundImage: wallpaperOf(seat).image }}>
      <span className={styles.padlock}>
        <Glyph name="padlock" />
      </span>
      <span className={styles.date}>{SONG_DATE}</span>
      <span className={styles.clock}>{clock}</span>

      <button
        type="button"
        className={styles.stack}
        data-tucked="2"
        aria-label={`${total} notifications from ${contact.name}, summarized`}
        onClick={() => act({ kind: "open", state: "messages" })}
      >
        <span className={styles.under} data-depth="2" />
        <span className={styles.under} data-depth="1" />
        <span key={newest?.cueIndex ?? -1} className={styles.front}>
          <span className={styles.card}>
            <span className={styles.icon}>
              <MessagesIcon />
            </span>
            <span className={styles.title}>{contact.name}</span>
            <span className={styles.age}>{newest ? "now" : "22h ago"}</span>
            <span className={styles.body}>
              <Glyph name="summary" />
              {summary}
            </span>
            <span className={styles.more}>{more} more notifications</span>
          </span>
        </span>
      </button>

      <span className={styles.button} data-side="left" aria-hidden="true">
        <Glyph name="flashlight" />
      </span>
      <span className={styles.button} data-side="right" aria-hidden="true">
        <Glyph name="camera" />
      </span>
    </section>
  );
}

export default memo(AiSummaryState);
