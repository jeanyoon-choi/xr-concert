"use client";

import type { ReactNode } from "react";
import { useSongClock } from "../../clock";

// v2's interfaces, copied here unchanged, wrap themselves in `SongPlayback`
// and read `useSongPlayback`. In v4 a window never owns the audio: the clock
// is v4's (the controller's, followed over the tab channel, or the
// composition's own), so playback here is only that clock under v2's names.

export function SongPlayback({ children }: { children: ReactNode; song?: unknown }) {
  return <>{children}</>;
}

export function useSongPlayback() {
  return useSongClock();
}
