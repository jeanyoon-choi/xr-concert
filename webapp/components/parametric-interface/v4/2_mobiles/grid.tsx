"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatSongClock } from "../model/clock-face";
import { isLockLine } from "../model/score";
import type { LyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import type { StateMode } from "./controls";
import { fitPhoneGrid } from "./layout";
import { plansAt } from "./hops";
import { Phone, PHONE_HISTORY } from "./phone";
import styles from "./mobiles.module.css";

// The phones, fitted into whatever box holds them (after goldfishes
// pc/mobiles/1). Seats run in reading order; each phone moves between apps
// on its own at line ends (hops.ts), and every “We were toxic …” line
// locks them all.

export function PhoneGrid({ cue, phones, mode = "score" }: { cue: LyricCue; phones: number; mode?: StateMode }) {
  const container = useRef<HTMLDivElement>(null);
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
  const clock = formatSongClock(cue.currentTimeMs);
  const locked = mode === "score" && isLockLine(cue.lyric);
  const plans = useMemo(() => plansAt(phones, cue.cueIndex), [phones, cue.cueIndex]);

  return (
    <div ref={container} className={styles.box}>
      {layout.width > 0 ? (
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`, gridAutoRows: `${layout.height}px`, gap: layout.gap }}
        >
          {Array.from({ length: phones }, (_, seat) => {
            // Each phone moves between apps on its own (hops.ts); a held mode pins every phone.
            const plan = mode === "score" ? plans[seat]! : null;
            const app = mode === "score" ? plans[seat]!.app : mode === "lock" ? plansAt(phones, -1)[seat]!.app : mode;
            return (
              <div key={seat} className={styles.seat}>
                <Phone
                  seat={seat}
                  lines={lines}
                  app={app}
                  hop={plan && plan.since >= 0 ? plan.kind : "slide"}
                  hopKey={plan ? `${plan.app}:${plan.since}` : app}
                  hopFresh={Boolean(plan && plan.since === cue.cueIndex && plan.since >= 0)}
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
