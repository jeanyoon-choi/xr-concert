"use client";

// The YouTube Shorts player's interface — everything but the video — shared
// by the three Shorts variants (youtube-shorts, -2, -3) so their chrome is
// one and the same. Metrics and styles: chrome.module.css.
//
// SOURCES (checked 2026-11-17)
// - Glyphs are YouTube's own served icon files, copied path for path:
//   · heart (like): https://www.gstatic.com/youtube/img/icons/mweb/youtube_fill/shorts-heart/v1/24px.svg
//   · comments / share / search / ⋮ / home / Shorts (selected) / subscriptions
//     / + / music note: https://fonts.gstatic.com/s/i/youtube_{fill|outline}_experimental/
//     {text_bubble/v4, share/v13, search/v16, overflow_vertical/v14, home/v11,
//     shorts/v3, subscriptions/v12, add/v10, audio/v15}/24px.svg — the icon
//     set m.youtube.com serves today (its page config has
//     enable_web_delhi_icons: true and maps SHORTS_COMMENT → text_bubble,
//     SHORTS_SHARE → share, TAB_HOME → home, TAB_SHORTS → shorts …).
//   · remix: https://fonts.gstatic.com/s/i/youtube_fill/youtube_shorts_remix/v2/32px.svg
//     (YouTube's Shorts-rail remix glyph; the newer set has only an outline
//     remix and which of the two the iOS rail shows was not checked).
//   No glyph in this file is drawn by hand.
// - The like button is a heart and there is no Dislike button: YouTube
//   announced both on 2026-06-25 for the Shorts player on every surface, and
//   m.youtube.com's served config has enable_shorts_heart_icon_in_shorts_watch_page
//   and use_white_filled_heart_icon_in_shorts_watch_page set.
// - Metrics taken from the stylesheet m.youtube.com serves for its Shorts
//   player (the same design system as the app): the action bar is 56 wide,
//   4 from the right edge, its labels Roboto 12/16 weight 500, each action
//   padded 4 above and 8 below; the caption block sits 16 from the left and
//   the bottom with 8 between its rows; the title is Roboto 14/20 regular;
//   Subscribe is the small filled button (32 high, radius 16, 12 px weight
//   500, 12 px side padding, white with black text); the played part of the
//   progress line runs #f03 → #ff2791 over white at 30%.
//
// NOT CHECKED against the iOS app itself (no iOS frame could be fetched;
// these are the values the mobile web player or this file's authors use):
// the 48-pt button box around each 32-pt rail glyph; the top bar's contents
// (search and ⋮ at the right) and its 48-pt height; the 32-pt avatar and the
// handle at 14/20 medium (mobile web serves 12/18); the sound row's type and
// the square sound tile on the rail (the 2026 player moves the audio track
// into a carousel under the title, whose look was not obtained); the 2-pt
// progress line; the whole tab bar's metrics (48 pt, 10-pt labels, the 36-pt
// round + button, the avatar for You); the liked heart's red; the Subscribed
// state. The account shown is fictional.

import { useState, type ReactNode } from "react";
import styles from "./chrome.module.css";

const ICONS = {
  heart: [24, "M16.25 3.5c3.223 0 5.75 2.735 5.75 6 0 3.99-2.529 6.995-4.862 8.929-2.355 1.95-4.703 2.972-4.74 2.988l-.398.174-.398-.174c-.037-.016-2.385-1.038-4.74-2.988C4.53 16.496 2 13.49 2 9.5c0-3.265 2.527-6 5.75-6 1.697 0 3.206.765 4.25 1.96 1.044-1.195 2.553-1.96 4.25-1.96z"],
  comment: [24, "M5 2a4 4 0 00-4 4v10a4 4 0 004 4h2v1.604a1.41 1.41 0 002.095 1.232L14.2 20H19a4 4 0 004-4V6a4 4 0 00-4-4H5Zm2 6h10a1 1 0 110 2H7a1 1 0 010-2Zm-1 5a1 1 0 011-1h6a1 1 0 010 2H7a1 1 0 01-1-1Z"],
  share: [24, "M10 3.16v4.35c-5.86.24-8.706 4.333-8.978 13.06-.015.472.577.683.879.319 3.13-3.784 4.349-4.343 8.1-4.387v4.345a1 1 0 001.645.763L23 12.003 11.646 2.397A1 1 0 0010 3.16Z"],
  remix: [32, "M12.05 12.933h1.949c.82 0 1.29 1.007.8 1.722l-2.55 3.665-2.95 4.249c-.4.574-1.2.574-1.6 0l-2.95-4.249-2.55-3.665c-.49-.705-.02-1.722.8-1.722H5.02c.006-1.525.512-4.152 2.38-6.263 2.07-2.346 5.63-4.108 10-3.574.4.05.47.604.1.765-2.057.865-5.439 3.214-5.45 9.072Zm16.959 6.136h-2.021c-.005 1.523-.508 4.156-2.38 6.27-2.07 2.345-5.63 4.106-10 3.573-.4-.05-.47-.604-.1-.765 2.058-.864 5.442-3.215 5.45-9.078h-1.949c-.82 0-1.29-1.006-.8-1.721l2.55-3.663 2.95-4.247c.4-.574 1.2-.574 1.6 0l2.95 4.247 2.55 3.663c.49.705.02 1.721-.8 1.721Z"],
  search: [24, "M11 2a9 9 0 105.641 16.01.966.966 0 00.152.197l3.5 3.5a1 1 0 101.414-1.414l-3.5-3.5a1 1 0 00-.197-.153A8.96 8.96 0 0020 11a9 9 0 00-9-9Zm0 2a7 7 0 110 14 7 7 0 010-14Z"],
  more: [24, "M12 4a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Zm0 6a2 2 0 100 4 2 2 0 000-4Z"],
  home: [24, "m11.485 2.143-8 4.8-2 1.2a1 1 0 001.03 1.714L3 9.567V20a2 2 0 002 2h6v-7h2v7h6a2 2 0 002-2V9.567l.485.29a1 1 0 001.03-1.714l-2-1.2-8-4.8a1 1 0 00-1.03 0ZM5 8.366l7-4.2 7 4.2V20h-4v-5.5a1.5 1.5 0 00-1.5-1.5h-3A1.5 1.5 0 009 14.5V20H5V8.366Z"],
  shorts: [24, "m13.974 2.052-8 4.7a4 4 0 00.385 7.097l.942.423-1.327.78a4 4 0 004.052 6.897l8-4.7a4.001 4.001 0 00-.384-7.096L16.7 9.73l1.326-.78a4 4 0 10-4.052-6.897ZM10 15V9l5 3-5 3Z"],
  subscriptions: [24, "M18 1H6a2 2 0 00-2 2h16a2 2 0 00-2-2Zm3 4H3a2 2 0 00-2 2v13a2 2 0 002 2h18a2 2 0 002-2V7a2 2 0 00-2-2ZM3 20V7h18v13H3Zm13-6.5L10 10v7l6-3.5Z"],
  plus: [24, "M12 3a1 1 0 00-1 1v7H4a1 1 0 000 2h7v7a1 1 0 002 0v-7h7a1 1 0 000-2h-7V4a1 1 0 00-1-1Z"],
  note: [24, "M12.514 1.909A1 1 0 0011 2.766v10.992a4.5 4.5 0 102 3.742V9.2l5.485 3.291A1 1 0 0020 11.634V6.966a1 1 0 00-.485-.857l-7-4.2h-.001Z"],
} as const satisfies Record<string, readonly [number, string]>;

type IconName = keyof typeof ICONS;

function Icon({ name }: { name: IconName }) {
  const [size, d] = ICONS[name];
  return (
    <svg viewBox={`0 0 ${size} ${size}`} fill="currentColor" aria-hidden="true" focusable="false">
      <path d={d} />
    </svg>
  );
}

/** The Short on screen: whose it is, its caption and its numbers. */
export type Short = {
  readonly handle: string;
  readonly tint: string;
  readonly initial: string;
  readonly title: string;
  /** A hashtag after the title, set in medium. */
  readonly tag?: string;
  readonly likes: number;
  readonly comments: number;
  /** How much of the Short has played, 0–1. */
  readonly progress: number;
};

/** YouTube counts: plain under 1,000; one decimal up to 10K / 10M; whole K and M above. */
export function count(value: number) {
  if (value < 1000) return String(value);
  const unit = value < 1_000_000 ? "K" : "M";
  const scaled = value / (value < 1_000_000 ? 1000 : 1_000_000);
  // 9,960 is "10K", not "10.0K": the decimal goes once the figure rounds to two digits.
  if (scaled >= 9.95) return `${Math.floor(scaled)}${unit}`;
  return `${(Math.floor(scaled * 10) / 10).toFixed(1).replace(/\.0$/, "")}${unit}`;
}

function Action({ icon, label }: { icon: IconName; label: ReactNode }) {
  return (
    <span className={styles.action}>
      <i>
        <Icon name={icon} />
      </i>
      <span>{label}</span>
    </span>
  );
}

/** What lies over the video: the top bar, the action rail, the caption block and the progress line. Goes inside the feed, after the video. */
export function ShortsOverlay({ short, running }: { short: Short; /** Whether the phone shows this app and motion is allowed (the sound row scrolls). */ running: boolean }) {
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const sound = `Original sound · ${short.handle}`;

  return (
    <div className={styles.overlay} data-running={running || undefined}>
      <header className={styles.top} aria-hidden="true">
        <span className={styles.topIcon}>
          <Icon name="search" />
        </span>
        <span className={styles.topIcon}>
          <Icon name="more" />
        </span>
      </header>

      <div className={styles.rail}>
        <button type="button" className={styles.action} data-on={liked || undefined} aria-pressed={liked} aria-label="Like" onClick={() => setLiked((value) => !value)}>
          <i>
            <Icon name="heart" />
          </i>
          <span>{count(short.likes + Number(liked))}</span>
        </button>
        <Action icon="comment" label={count(short.comments)} />
        <Action icon="share" label="Share" />
        <Action icon="remix" label="Remix" />
        <span className={styles.soundThumb} style={{ background: short.tint }} aria-hidden="true">
          {short.initial}
        </span>
      </div>

      <div className={styles.info}>
        <div className={styles.channel}>
          <span className={styles.avatar} style={{ background: short.tint }} aria-hidden="true">
            {short.initial}
          </span>
          <strong className={styles.handle}>{short.handle}</strong>
          <button type="button" className={styles.subscribe} data-done={subscribed || undefined} aria-pressed={subscribed} onClick={() => setSubscribed((value) => !value)}>
            {subscribed ? "Subscribed" : "Subscribe"}
          </button>
        </div>
        <p className={styles.title}>
          {short.title}
          {short.tag ? <b> {short.tag}</b> : null}
        </p>
        <div className={styles.sound}>
          <Icon name="note" />
          <span className={styles.marquee}>
            <span>
              <span>{sound}</span>
              <span aria-hidden="true">{sound}</span>
            </span>
          </span>
        </div>
      </div>

      <span className={styles.progress} aria-hidden="true">
        <span style={{ transform: `scaleX(${short.progress.toFixed(3)})` }} />
      </span>
    </div>
  );
}

function NavItem({ label, icon, active }: { label: string; icon: IconName; active?: boolean }) {
  return (
    <span className={styles.navItem} data-active={active || undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </span>
  );
}

/** The app's tab bar, under the feed. */
export function ShortsTabBar() {
  return (
    <nav className={styles.tabBar} aria-label="Main">
      <NavItem label="Home" icon="home" />
      <NavItem label="Shorts" icon="shorts" active />
      <span className={styles.navItem}>
        <span className={styles.create}>
          <Icon name="plus" />
        </span>
      </span>
      <NavItem label="Subscriptions" icon="subscriptions" />
      <span className={styles.navItem}>
        <span className={styles.you} aria-hidden="true">
          Y
        </span>
        <span>You</span>
      </span>
    </nav>
  );
}
