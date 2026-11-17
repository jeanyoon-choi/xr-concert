// iOS 18 Safari's bottom bar (the default “Bottom” tab-bar layout), light:
// the floating address field over the page — page-menu button, the domain,
// reload — and the toolbar under it (back, forward, share, bookmarks, tabs).
// Shared by the states that are web pages in Safari (safari, naver). The
// glyphs are redrawn on SF Symbols' geometry (chevron.left/right,
// square.and.arrow.up, book, square.on.square, arrow.clockwise) at the
// toolbar's regular weight; Safari serves no assets to take them from.

import styles from "./chrome.module.css";

type BarGlyph = "page" | "reload" | "back" | "forward" | "share" | "book" | "tabs";

function Glyph({ name }: { name: BarGlyph }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "page":
      return (
        <svg aria-hidden="true" viewBox="0 0 22 18" width="22" height="18">
          <rect x="1.2" y="1.2" width="19.6" height="15.6" rx="3.4" {...stroke} strokeWidth={1.6} />
          <path d="M5.4 6h11.2M5.4 9h11.2M5.4 12h7" {...stroke} strokeWidth={1.6} />
        </svg>
      );
    case "reload":
      return (
        <svg aria-hidden="true" viewBox="0 0 18 20" width="16" height="18">
          <path d="M15.6 11.4A6.7 6.7 0 1 1 9 4.3h3.4" {...stroke} strokeWidth={1.8} />
          <path d="m9.8 1.2 3.1 3.1-3.1 3.1" {...stroke} strokeWidth={1.8} />
        </svg>
      );
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 13 22" width="13" height="22"><path d="M11 1.8 2 11l9 9.2" {...stroke} strokeWidth={2.3} /></svg>;
    case "forward":
      return <svg aria-hidden="true" viewBox="0 0 13 22" width="13" height="22"><path d="m2 1.8 9 9.2-9 9.2" {...stroke} strokeWidth={2.3} /></svg>;
    case "share":
      return (
        <svg aria-hidden="true" viewBox="0 0 20 26" width="19" height="25">
          <path d="M10 16V2M5.5 6.2 10 1.8l4.5 4.4" {...stroke} />
          <path d="M6.5 10H3.8A1.8 1.8 0 0 0 2 11.8v10.4A1.8 1.8 0 0 0 3.8 24h12.4a1.8 1.8 0 0 0 1.8-1.8V11.8A1.8 1.8 0 0 0 16.2 10h-2.7" {...stroke} />
        </svg>
      );
    case "book":
      return (
        <svg aria-hidden="true" viewBox="0 0 26 22" width="25" height="21">
          <path d="M13 4.2C10.6 2.4 7.4 1.8 2 2v16.4c5.4-.2 8.6.4 11 2.2 2.4-1.8 5.6-2.4 11-2.2V2c-5.4-.2-8.6.4-11 2.2Z" {...stroke} strokeWidth={1.8} />
          <path d="M13 4.2v16.2" {...stroke} strokeWidth={1.8} />
        </svg>
      );
    case "tabs":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23">
          <rect x="7" y="7" width="15" height="15" rx="3" {...stroke} strokeWidth={1.8} />
          <path d="M17 3.6A2.6 2.6 0 0 0 14.6 2H5a3 3 0 0 0-3 3v9.6A2.6 2.6 0 0 0 3.6 17" {...stroke} strokeWidth={1.8} />
        </svg>
      );
  }
}

export function SafariBar({ domain }: { domain: string }) {
  return (
    <footer className={styles.bar} aria-label="Safari">
      <div className={styles.field}>
        <span className={styles.page}><Glyph name="page" /></span>
        <span className={styles.domain}>{domain}</span>
        <span className={styles.reload}><Glyph name="reload" /></span>
      </div>
      <nav className={styles.toolbar} aria-hidden="true">
        <span><Glyph name="back" /></span>
        <span className={styles.disabled}><Glyph name="forward" /></span>
        <span><Glyph name="share" /></span>
        <span><Glyph name="book" /></span>
        <span><Glyph name="tabs" /></span>
      </nav>
    </footer>
  );
}
