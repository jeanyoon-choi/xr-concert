"use client";

import { memo } from "react";
import { SONG_DATE } from "../../../model/clock-face";
import type { PhoneState } from "../../../model/score";
import type { PhoneStateProps } from "../types";
import { noticeOf, type Notice } from "./notify";
import styles from "./lock.module.css";

// The iOS 18 lock screen, laid out as experiments-jyc SCC mobiles/1's
// measured one (os/lock.tsx: padlock, date, clock, the stack above the
// flashlight and camera). The sung line arrives as a notification from the
// app the phone was in (notify.ts), in that app's wording under its icon,
// typed character by character. iOS groups one app's notifications into a
// stack: the newest card in front, the earlier ones as cards tucked beneath
// it. Tapping the stack opens the app (held until the line changes).

/** iOS's "Color" wallpapers: one hue, lighter at the top. A different one per phone. */
const WALLPAPERS = [
  "linear-gradient(180deg, #5d8fd8 0%, #2a5bab 55%, #173d7e 100%)",
  "linear-gradient(180deg, #e8a0b4 0%, #c56d89 55%, #94445f 100%)",
  "linear-gradient(180deg, #8fc3a2 0%, #4f8f6b 55%, #2d6347 100%)",
  "linear-gradient(180deg, #f0b27a 0%, #d27d3f 55%, #a2531f 100%)",
  "linear-gradient(180deg, #a99ae0 0%, #7461bf 55%, #4c3a93 100%)",
  "linear-gradient(180deg, #9aa4b1 0%, #66717f 55%, #414a55 100%)",
  "linear-gradient(180deg, #7fc8d6 0%, #3f97aa 55%, #22687a 100%)",
] as const;

function Glyph({ name }: { name: "padlock" | "flashlight" | "camera" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "padlock":
      return <svg aria-hidden="true" viewBox="0 0 16 20" width="14" height="18"><rect x="1.5" y="8.5" width="13" height="10" rx="2.6" fill="currentColor" /><path d="M4.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" {...stroke} strokeWidth={2.2} /></svg>;
    case "flashlight":
      return <svg aria-hidden="true" viewBox="0 0 16 26" width="15" height="24"><path d="M3 1.5h10v4.2l-2.5 4V24.5h-5V9.7L3 5.7Z" {...stroke} strokeWidth={1.8} /><path d="M3.4 5.2h9.2" {...stroke} strokeWidth={1.6} /><circle cx="8" cy="14.5" r="1.4" fill="currentColor" /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 28 22" width="26" height="20"><path d="M2 7a2.6 2.6 0 0 1 2.6-2.6h3.2l1.9-2.9h8.6l1.9 2.9h3.2A2.6 2.6 0 0 1 26 7v11.4a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 18.4Z" {...stroke} strokeWidth={1.8} /><circle cx="14" cy="12.4" r="4.6" {...stroke} strokeWidth={1.8} /></svg>;
  }
}

function Card({ notice, age }: { notice: Notice; age: string }) {
  return (
    <span className={styles.card}>
      <span className={styles.icon}>
        {notice.icon ? <img src={notice.icon} alt="" width={38} height={38} decoding="sync" /> : <MessagesIcon />}
      </span>
      <span className={styles.title}>{notice.title}</span>
      <span className={styles.age}>{age}</span>
      <span className={styles.body}>{notice.body}</span>
    </span>
  );
}

/** Messages has no store artwork; its icon as drawn on iOS. */
function MessagesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" width={38} height={38}>
      <defs>
        <linearGradient id="v4-2-messages-icon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5df777" />
          <stop offset="1" stopColor="#0abd34" />
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill="url(#v4-2-messages-icon)" />
      <path d="M30 13.5c-10.6 0-19.2 7-19.2 15.6 0 5 2.9 9.4 7.4 12.3-.4 2.5-1.7 4.8-3.6 6.6 3.6-.1 6.9-1.6 9.3-3.8 1.9.4 4 .6 6.1.6 10.6 0 19.2-7 19.2-15.7S40.6 13.5 30 13.5Z" fill="#fff" />
    </svg>
  );
}

function LockState({ seat, lines, clock, shown, act, source }: PhoneStateProps) {
  const app: PhoneState = source && source !== "lock" ? source : "messages";
  const newest = lines.at(-1);
  // The group: the newest notification in front, up to two tucked beneath.
  const tucked = Math.min(2, lines.length - 1);
  const notice = newest ? noticeOf(app, seat, newest) : null;

  return (
    <section className={styles.lock} aria-label="Lock screen" inert={!shown} style={{ background: WALLPAPERS[seat % WALLPAPERS.length] }}>
      <span className={styles.padlock}>
        <Glyph name="padlock" />
      </span>
      <span className={styles.date}>{SONG_DATE}</span>
      <span className={styles.clock}>{clock}</span>

      {notice ? (
        <button
          type="button"
          className={styles.stack}
          data-tucked={tucked}
          aria-label={`${tucked + 1} notifications from ${notice.title}`}
          onClick={() => act({ kind: "open", state: notice.state })}
        >
          {tucked > 1 ? <span className={styles.under} data-depth="2" /> : null}
          {tucked > 0 ? <span className={styles.under} data-depth="1" /> : null}
          <span key={newest!.cueIndex} className={styles.front}>
            <Card notice={notice} age="now" />
          </span>
        </button>
      ) : null}

      <span className={styles.button} data-side="left" aria-hidden="true">
        <Glyph name="flashlight" />
      </span>
      <span className={styles.button} data-side="right" aria-hidden="true">
        <Glyph name="camera" />
      </span>
    </section>
  );
}

export default memo(LockState);
