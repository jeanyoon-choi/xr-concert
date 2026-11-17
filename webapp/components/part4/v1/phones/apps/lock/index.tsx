"use client";

import { memo } from "react";
import { SONG_DATE } from "../../../clock/wall-clock";
import type { PhoneState } from "../../states";
import type { PhoneStateProps } from "../types";
import { wallpaperOf } from "../../wallpapers";
import { noticeOf, type Notice } from "./notify";
import styles from "./lock.module.css";

// The iOS 26 lock screen: padlock, date, clock, and at the bottom the stack
// of notifications above the flashlight and the camera. Every sung word is a
// notification from the app the phone was in (notify.ts): that app's icon
// and, where its name would stand, the word — no sender, no body, no time.
// One app's notifications are one group: the newest plate in front, the two
// before it as edges beneath it. Tapping the stack opens the app (held until
// the line changes).
//
// What this follows (read 2026-11-17), and what it could not find:
// [1] Apple Support, "Use notifications on your iPhone or iPad" —
//     https://support.apple.com/108781 and its picture
//     cdsassets.apple.com/live/7WUAS350/images/ios/ios-26-iphone-16-pro-lock-screen-notifications.png
//     (402 pt wide screen at 1.465 px/pt). "Stack: shows notifications
//     stacked at the bottom of the screen, with the most recent notification
//     at the top." Every metric called "measured" in lock.module.css was
//     taken from that picture's pixels: plate inset, radius, gap, fill, rim,
//     icon, type, and the two controls (now glass discs, larger and lower
//     than iOS 18's).
// [2] Apple Newsroom, iOS 16 (the release that moved notifications to the
//     bottom; iOS 26 keeps it): "Notifications have been redesigned to roll
//     up from the bottom" —
//     https://www.apple.com/newsroom/2022/06/apple-unveils-new-ways-to-share-and-communicate-in-ios-16/
// [3] Apple HIG, Materials — https://developer.apple.com/design/human-interface-guidelines/materials :
//     the regular Liquid Glass "blurs and adjusts the luminosity of
//     background content"; darker over dark content, lighter over light.
// [4] WWDC25 session 219, "Meet Liquid Glass" —
//     https://developer.apple.com/videos/play/wwdc2025/219/ : lensing,
//     highlights that define the silhouette; Reduced Motion "disables any
//     elastic properties". MacRumors: Lock Screen notifications "use a more
//     frosted variant of Liquid Glass" —
//     https://www.macrumors.com/guide/ios-26-liquid-glass/
// [5] Apple HIG, Notifications — https://developer.apple.com/design/human-interface-guidelines/notifications :
//     the app's icon at the leading edge, the title at the top.
// [6] Apple HIG, Typography — https://developer.apple.com/design/human-interface-guidelines/typography :
//     Subhead 15/20 at Large, 21/28 at xxxLarge, emphasized = semibold.
//
// Not found in any source, so approximated and to be read as such:
// - Apple publishes no numbers for the stack's motion. The steps here (each
//   plate back: 8 pt lower, 6% smaller, dimmer; two edges showing; the
//   third fading under them) are the grouped-notification stack as iOS has
//   drawn it since iOS 12, from memory, not measured on iOS 26. The entry
//   distance (60 pt) and the spring (critically damped, 0.5 s response, no
//   bounce) are likewise chosen, not sourced.
// - The glass is a blur, a 15% white fill and a hairline rim. It does not
//   refract, its highlights do not move with the device, and it does not
//   turn dark-on-light over a bright wallpaper as the real material does.
// - The clock stays the solid one; iOS 26's default numerals are glass and
//   taller ([1]).
//
// Glyphs drawn here: padlock, flashlight, camera, and the Messages icon.

function Glyph({ name }: { name: "padlock" | "flashlight" | "camera" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "padlock":
      return <svg aria-hidden="true" viewBox="0 0 16 20" width="14" height="18"><rect x="1.5" y="8.5" width="13" height="10" rx="2.6" fill="currentColor" /><path d="M4.5 8.5V6a3.5 3.5 0 0 1 7 0v2.5" {...stroke} strokeWidth={2.2} /></svg>;
    case "flashlight":
      return <svg aria-hidden="true" viewBox="0 0 16 26" width="18" height="29"><path d="M3 1.5h10v4.2l-2.5 4V24.5h-5V9.7L3 5.7Z" {...stroke} strokeWidth={1.8} /><path d="M3.4 5.2h9.2" {...stroke} strokeWidth={1.6} /><circle cx="8" cy="14.5" r="1.4" fill="currentColor" /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 28 22" width="30" height="23.5"><path d="M2 7a2.6 2.6 0 0 1 2.6-2.6h3.2l1.9-2.9h8.6l1.9 2.9h3.2A2.6 2.6 0 0 1 26 7v11.4a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 18.4Z" {...stroke} strokeWidth={1.8} /><circle cx="14" cy="12.4" r="4.6" {...stroke} strokeWidth={1.8} /></svg>;
  }
}

/** What a notification carries: the app's icon and, where the app's name would stand, the sung word. Nothing else. */
function Content({ notice }: { notice: Notice }) {
  return (
    <span className={styles.content}>
      <span className={styles.icon}>
        {notice.icon ? <img src={notice.icon} alt="" width={38} height={38} decoding="sync" /> : <MessagesIcon />}
      </span>
      <span data-lyric className={styles.title}>{notice.word}</span>
    </span>
  );
}

/** Messages has no store artwork; its icon as drawn on iOS. */
function MessagesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 60" width={38} height={38}>
      <defs>
        <linearGradient id="part4-lock-messages-icon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5df777" />
          <stop offset="1" stopColor="#0abd34" />
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill="url(#part4-lock-messages-icon)" />
      <path d="M30 13.5c-10.6 0-19.2 7-19.2 15.6 0 5 2.9 9.4 7.4 12.3-.4 2.5-1.7 4.8-3.6 6.6 3.6-.1 6.9-1.6 9.3-3.8 1.9.4 4 .6 6.1.6 10.6 0 19.2-7 19.2-15.7S40.6 13.5 30 13.5Z" fill="#fff" />
    </svg>
  );
}

/** Plates kept mounted: the one in front, the two edges, and two more that are fading out beneath them. */
const KEPT = 5;
/** The deepest place a plate is drawn at; anything older has the same, invisible, one. */
const GONE = 3;

function LockState({ seat, lines, clock, shown, reducedMotion, act, source }: PhoneStateProps) {
  const app: PhoneState = source && source !== "lock" ? source : "messages";
  // Every sung word is a notification of its own, keyed by its place in the
  // song, so a plate is the same element from the moment it rolls up until
  // it has left the stack: only its depth changes, and CSS moves it.
  const words = lines.flatMap((line) => line.words.slice(0, line.sung).map((word, index) => ({ key: `${line.cueIndex}-${index}`, word })));
  const kept = words.slice(-KEPT);
  const state = noticeOf(app, "").state;

  return (
    <section
      className={styles.lock}
      aria-label="Lock screen"
      inert={!shown}
      data-reduced-motion={reducedMotion || undefined}
      style={{ backgroundImage: wallpaperOf(seat).image }}
    >
      <span className={styles.padlock}>
        <Glyph name="padlock" />
      </span>
      <span className={styles.date}>{SONG_DATE}</span>
      <span className={styles.clock}>{clock}</span>

      {words.length > 0 ? (
        <button
          type="button"
          className={styles.stack}
          aria-label={`${Math.min(words.length, GONE)} notifications`}
          onClick={() => act({ kind: "open", state })}
        >
          {kept.map((entry, index) => (
            <span key={entry.key} className={styles.note} data-depth={Math.min(kept.length - 1 - index, GONE)}>
              <Content notice={noticeOf(app, entry.word)} />
            </span>
          ))}
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
