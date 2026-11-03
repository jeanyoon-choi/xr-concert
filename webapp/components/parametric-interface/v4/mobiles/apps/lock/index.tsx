"use client";

import { memo } from "react";
import { SONG_DATE } from "../../../model/clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./lock.module.css";

// The iOS lock screen. Each sung line arrives as a Messages notification
// from the seat's contact and fills word by word, newest on top of the
// stack at the bottom of the glass, older ones folding beneath. Tapping a
// notification opens the thread (the phone holds it open until the score's
// next section).

const EXPANDED = 3;

// Each seat's own wallpaper, so the grid reads as many people's phones.
const WALLPAPERS = [
  "radial-gradient(120% 80% at 20% 10%, #6d7f99 0%, #2c3646 55%, #12161d 100%)",
  "radial-gradient(120% 80% at 80% 0%, #b38a72 0%, #5a3f35 50%, #1c1412 100%)",
  "radial-gradient(130% 90% at 30% 20%, #5f8c84 0%, #23403d 55%, #0d1716 100%)",
  "radial-gradient(120% 80% at 70% 15%, #8a7aa6 0%, #3b3150 55%, #15111d 100%)",
  "radial-gradient(120% 80% at 25% 0%, #a39a73 0%, #4d4832 55%, #191710 100%)",
  "radial-gradient(130% 90% at 60% 10%, #6f93b5 0%, #26394c 55%, #0c131a 100%)",
] as const;

export function MessagesIcon({ size }: { size: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" width={size} height={size}>
      <defs>
        <linearGradient id="v4-messages-icon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5df777" />
          <stop offset="1" stopColor="#0abd34" />
        </linearGradient>
      </defs>
      <rect width="60" height="60" rx="13.5" fill="url(#v4-messages-icon)" />
      <path
        d="M30 13.5c-10.6 0-19.2 7-19.2 15.6 0 5 2.9 9.4 7.4 12.3-.4 2.5-1.7 4.8-3.6 6.6 3.6-.1 6.9-1.6 9.3-3.8 1.9.4 4 .6 6.1.6 10.6 0 19.2-7 19.2-15.7S40.6 13.5 30 13.5Z"
        fill="#fff"
      />
    </svg>
  );
}

function LockState({ seat, lines, clock, shown, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const newestFirst = lines.slice(-EXPANDED - 2).reverse();
  const expanded = newestFirst.slice(0, EXPANDED);
  const folded = Math.min(2, newestFirst.length - expanded.length);
  const newestStart = lines.at(-1)?.startMs ?? 0;

  return (
    <section className={styles.lock} aria-label="Lock screen" inert={!shown} style={{ background: WALLPAPERS[seat % WALLPAPERS.length] }}>
      <div className={styles.time}>
        <span className={styles.date}>{SONG_DATE}</span>
        <span className={styles.clock}>{clock}</span>
      </div>

      <ol className={styles.stack} aria-label="Notifications">
        {expanded.map((line, index) => (
          <li key={line.cueIndex} className={styles.item} data-newest={index === 0 || undefined}>
            <button type="button" className={styles.notification} onClick={() => act({ kind: "open", state: "messages" })}>
              <span className={styles.icon}>
                <MessagesIcon size={38} />
              </span>
              <span className={styles.text}>
                <span className={styles.head}>
                  <b>{contact.name}</b>
                  <small>{index === 0 ? "now" : `${Math.max(1, Math.round((newestStart - line.startMs) / 1_000))}s ago`}</small>
                </span>
                <span className={styles.body}>{line.text}</span>
              </span>
            </button>
          </li>
        ))}
        {Array.from({ length: folded }, (_, index) => (
          <li key={`fold-${index}`} className={styles.fold} data-depth={index} aria-hidden="true" />
        ))}
      </ol>

      <div className={styles.quick} aria-hidden="true">
        <span className={styles.quickButton}>
          <svg viewBox="0 0 16 24" width="15" height="23"><path d="M3 1h10v4l-2.4 4v13H5.4V9L3 5Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="8" cy="13" r="1.4" fill="currentColor" /></svg>
        </span>
        <span className={styles.quickButton}>
          <svg viewBox="0 0 26 20" width="25" height="19"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h3l2-3h7l2 3h3A2.5 2.5 0 0 1 24 6.5V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><circle cx="13" cy="11.2" r="4.3" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        </span>
      </div>
    </section>
  );
}

export default memo(LockState);
