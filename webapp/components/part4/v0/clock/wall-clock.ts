// The phones' clock is the real one: every time a phone shows — status bar,
// lock screen, message stamps — is the wall clock now. A song position maps
// to the wall time at which it is (or was) sung: the grid anchors song time
// zero to the wall clock on every render (anchorSongClock), so a stamp for
// the line sung 40 s ago reads the minute it was sung.

let songZeroWallMs = Date.now();

/** Called by the grid with the song position now. */
export function anchorSongClock(songMs: number) {
  songZeroWallMs = Date.now() - Math.max(0, songMs);
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "HH:MM" (24 h) for a song position, on the wall clock. */
export function formatSongClock(songMs: number) {
  const date = new Date(songZeroWallMs + Math.max(0, songMs));
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Today, as the lock screen writes it: "Tuesday, November 3". */
export const SONG_DATE = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

/** "HH:MM" (24 h) on the wall clock, `minutes` before now: for content from before the song. */
export function clockAgo(minutes: number) {
  const date = new Date(Date.now() - minutes * 60_000);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Today (or `offsetDays` from it) in a locale's own format, e.g. dateLabel("ko-KR", { month: "long", day: "numeric" }). */
export function dateLabel(locale: string, options: Intl.DateTimeFormatOptions, offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString(locale, options);
}
