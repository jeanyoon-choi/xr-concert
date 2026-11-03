"use client";

import { useEffect, useRef, useState } from "react";
import { formatSongClock } from "../model/clock-face";
import { roseScore, sectionAt } from "../model/score";
import type { LyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import type { StateMode } from "./controls";
import { fitPhoneGrid } from "./layout";
import { Phone, PHONE_HISTORY } from "./phone";
import styles from "./mobiles.module.css";

// The phones, fitted into whatever box holds them (after goldfishes
// pc/mobiles/1): the whole page in /v4/mobiles, one side of the composition
// in /v4. Seats run in reading order; the score gives each its state.

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
  const section = sectionAt(roseScore, cue.currentTimeMs);
  const clock = formatSongClock(cue.currentTimeMs);

  return (
    <div ref={container} className={styles.box}>
      {layout.width > 0 ? (
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`, gridAutoRows: `${layout.height}px`, gap: layout.gap }}
        >
          {Array.from({ length: phones }, (_, seat) => (
            <div key={seat} className={styles.seat}>
              <Phone
                seat={seat}
                lines={lines}
                assigned={mode === "score" ? section.phone(seat, phones) : mode}
                sectionId={mode === "score" ? section.id : mode}
                clock={clock}
                scale={layout.width / 404}
                reducedMotion={cue.reducedMotion}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
