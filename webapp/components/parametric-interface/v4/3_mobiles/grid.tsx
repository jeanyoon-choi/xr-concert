"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { anchorSongClock, formatSongClock } from "./clock-face";
import { isLockLine } from "../model/score";
import type { LyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import type { StateMode } from "./controls";
import { fitPhoneGrid } from "./layout";
import { appsAt, MOVE_MS, PASSAGES, PRELOAD_MS } from "./hops";
import { Phone, PHONE_HISTORY } from "./phone";
import styles from "./mobiles.module.css";

// The phones, fitted into whatever box holds them (after goldfishes
// pc/mobiles/1). Seats run in reading order; when a passage of the lyric
// ends the phones either all move to other apps together or stay (hops.ts), and
// every “We were toxic …” line locks them all.

export function PhoneGrid({ cue, phones, mode = "score" }: { cue: LyricCue; phones: number; mode?: StateMode }) {
  const container = useRef<HTMLDivElement>(null);
  // The phones' clock is the wall clock: tick each minute even while the song is stopped.
  const [, setMinute] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000)), 5_000);
    return () => window.clearInterval(timer);
  }, []);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry!.contentRect.width, height: entry!.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const lines = useSungLines(cue, PHONE_HISTORY);
  const layout = fitPhoneGrid(box.width, box.height, phones);
  anchorSongClock(cue.currentTimeMs);
  const clock = formatSongClock(cue.currentTimeMs);
  const locked = mode === "score" && isLockLine(cue.lyric);
  // Passage starts in song time; a move is centred on each (hops.ts MOVE_MS).
  const passageStarts = useMemo(
    () => PASSAGES.map((cueIndex) => cue.wordTimings.find((word) => word.cueIndex === cueIndex)?.startMs ?? 0),
    [cue.wordTimings],
  );
  const playing = cue.wordIndex >= 0 || cue.currentTimeMs > 0;
  /** The passage whose apps show at time `t`: its move started MOVE_MS / 2 before it begins. */
  const passageAt = (t: number) => {
    if (!playing) return 0;
    let passage = 0;
    for (let index = 1; index < passageStarts.length; index += 1) if (passageStarts[index]! - MOVE_MS / 2 <= t) passage = index;
    return passage;
  };
  const passage = passageAt(cue.currentTimeMs);
  const apps = useMemo(() => appsAt(phones, passage), [phones, passage]);

  return (
    <div ref={container} className={styles.box}>
      {layout.width > 0 ? (
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`, gridAutoRows: `${layout.height}px`, gap: layout.gap }}
        >
          {Array.from({ length: phones }, (_, seat) => {
            // The grid moves between apps together, by passage (hops.ts); a held mode pins every phone.
            const held = mode === "score" || mode === "lock";
            const app = held ? apps[seat]! : mode;
            // The next passage's app, mounted out of sight ahead of the move; phones spread their mounts.
            const ahead = held ? passageAt(cue.currentTimeMs + PRELOAD_MS - seat * 40) : passage;
            const upcoming = ahead !== passage ? appsAt(phones, ahead)[seat]! : null;
            return (
              <div key={seat} className={styles.seat}>
                <Phone
                  seat={seat}
                  lines={lines}
                  app={app}
                  upcoming={upcoming && upcoming !== app ? upcoming : null}
                  locked={locked || mode === "lock"}
                  lineKey={`${cue.cueIndex}`}
                  clock={clock}
                  scale={layout.width / 404}
                  reducedMotion={cue.reducedMotion}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
