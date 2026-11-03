// Ported from experiments-jyc SCC components/mobile/clone/12/screen/icons.tsx, which
// redrew each glyph against TikTok's App Store iPhone frames (feed rail, top bar,
// tab bar) and the September 2026 newsroom comment-sheet image. Only the glyphs the
// For You feed and its comment sheet use are kept.

export type IconName =
  | "home"
  | "friends"
  | "inbox"
  | "profile"
  | "plus"
  | "search"
  | "live"
  | "heart"
  | "comment"
  | "bookmark"
  | "share"
  | "note"
  | "close"
  | "image"
  | "emoji"
  | "at"
  | "arrowUp"
  | "dislike"
  | "check";

const FILLED = new Set<IconName>(["heart", "comment", "bookmark", "share", "live"]);

export function Icon({ name, filled }: { name: IconName; filled?: boolean }) {
  const fill = filled ?? FILLED.has(name);
  const common = {
    fill: fill ? "currentColor" : "none",
    stroke: fill ? "none" : "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>
      {glyph(name, fill)}
    </svg>
  );
}

function glyph(name: IconName, fill: boolean) {
  switch (name) {
    case "home":
      return fill ? (
        <path d="M12 2.6 2.7 10c-.45.36-.7.9-.7 1.47v8.4c0 .9.73 1.63 1.63 1.63H9.3v-6.1h5.4v6.1h5.67c.9 0 1.63-.73 1.63-1.63v-8.4c0-.57-.25-1.1-.7-1.47Z" />
      ) : (
        <path d="M3 11.3 12 4l9 7.3V20a1 1 0 0 1-1 1h-5v-6.2H9V21H4a1 1 0 0 1-1-1Z" />
      );
    case "friends":
      return (
        <g fill="none" stroke="currentColor">
          <circle cx="8.6" cy="8" r="3.7" />
          <path d="M2.2 20.2c.4-3.9 3-6.2 6.4-6.2s6 2.3 6.4 6.2" />
          <circle cx="17" cy="9.4" r="2.7" />
          <path d="M16.6 14.4c2.9.1 4.7 2 5.1 4.9" />
        </g>
      );
    case "inbox":
      return (
        <>
          <path d="M4.2 4h15.6c.66 0 1.2.54 1.2 1.2v11.1c0 .66-.54 1.2-1.2 1.2h-5.1L12 20.3l-2.7-2.8H4.2c-.66 0-1.2-.54-1.2-1.2V5.2C3 4.54 3.54 4 4.2 4Z" />
          <path d="M9 10.6h6" />
        </>
      );
    case "profile":
      return (
        <>
          <circle cx="12" cy="7.8" r="4.1" />
          <path d="M4 21c.5-4.2 3.8-6.9 8-6.9s7.5 2.7 8 6.9" />
        </>
      );
    case "plus":
      return <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" />;
    case "search":
      return (
        <>
          <circle cx="10.6" cy="10.6" r="7" />
          <path d="m15.8 15.8 5 5" />
        </>
      );
    case "live":
      return (
        <g fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="m8.3 2.8 3.7 3 3.7-3" />
          <rect x="2.6" y="5.8" width="18.8" height="15" rx="3" />
          <text x="12" y="16.7" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.4" fontWeight="800" fontFamily="inherit">
            LIVE
          </text>
        </g>
      );
    case "heart":
      return (
        <path d="M12 21.2c-.3 0-.6-.1-.85-.28C7.2 18.1 2 13.9 2 8.9 2 5.9 4.3 3.6 7.1 3.6c2 0 3.7 1.05 4.9 2.8 1.2-1.75 2.9-2.8 4.9-2.8 2.8 0 5.1 2.3 5.1 5.3 0 5-5.2 9.2-9.15 12.02-.25.18-.55.28-.85.28Z" />
      );
    case "comment":
      return (
        <path
          fillRule="evenodd"
          d="M12 2.9c5.6 0 10 3.85 10 8.75s-4.4 8.75-10 8.75c-.84 0-1.65-.08-2.43-.24L5.1 22.1c-.5.2-1-.27-.84-.78l1.08-3.6C3.3 16.15 2 14.03 2 11.65 2 6.75 6.4 2.9 12 2.9ZM7.3 10.3a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm4.7 0a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Zm4.7 0a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9Z"
        />
      );
    case "bookmark":
      return <path d="M6.4 2.6h11.2c.9 0 1.6.7 1.6 1.6v16.9c0 .7-.8 1.1-1.35.7L12 17.4l-5.85 4.4c-.55.4-1.35 0-1.35-.7V4.2c0-.9.7-1.6 1.6-1.6Z" />;
    case "share":
      return <path d="M13.3 3.5c0-.6.7-.9 1.15-.5l8.05 7.6c.3.3.3.8 0 1.1l-8.05 7.6c-.45.4-1.15.1-1.15-.5v-3.9c-5.2.1-8.6 1.6-10.8 4.9-.3.4-.95.2-.9-.3.9-6.5 4.9-10.8 11.7-11.6Z" />;
    case "note":
      return (
        <>
          <path d="M9 17.5V5.6l11-2.1v11.7" />
          <circle cx="6.3" cy="17.6" r="2.7" />
          <circle cx="17.3" cy="15.4" r="2.7" />
        </>
      );
    case "close":
      return <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" />;
    case "image":
      return (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          <circle cx="9" cy="9" r="1.6" />
          <path d="m4 17.5 5-5 4.2 4.2 2.6-2.6 4.2 4.2" />
        </>
      );
    case "emoji":
      return (
        <>
          <circle cx="12" cy="12" r="8.8" />
          <path d="M8.3 14.2c.9 1.4 2.2 2.1 3.7 2.1s2.8-.7 3.7-2.1" />
          <path d="M9 9.6v.6M15 9.6v.6" strokeWidth="2.4" />
        </>
      );
    case "at":
      return (
        <>
          <circle cx="12" cy="12" r="3.6" />
          <path d="M15.6 9v4.2c0 1.6 1 2.6 2.4 2.6 1.6 0 2.8-1.5 2.8-3.8a8.8 8.8 0 1 0-3.4 7" />
        </>
      );
    case "arrowUp":
      return <path d="M12 19V5m0 0-6 6m6-6 6 6" strokeWidth="2.6" />;
    case "dislike":
      return <path d="M7.5 4h9.6c.9 0 1.7.6 1.9 1.5l1.4 6.2c.3 1.3-.7 2.5-2 2.5h-4.5l.6 3.4c.2 1.3-.8 2.4-2 2.4L7.5 14V4Zm0 0H4v10h3.5" />;
    case "check":
      return <path d="m4 12 5 5L20 6" />;
  }
}
