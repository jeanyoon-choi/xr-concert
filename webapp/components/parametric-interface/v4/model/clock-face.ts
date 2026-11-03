// The fiction's wall clock: the song starts at 21:30 (as in v2/7), so every
// device's status bar and message stamps read the same evening.
const CLOCK_BASE_MINUTES = 21 * 60 + 30;

export function formatSongClock(songMs: number) {
  const minutes = CLOCK_BASE_MINUTES + Math.floor(Math.max(0, songMs) / 60_000);
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export const SONG_DATE = "Tuesday, November 3";
