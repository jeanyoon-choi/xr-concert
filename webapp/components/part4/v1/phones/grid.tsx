"use client";

import { memo } from "react";
import type { SungLine } from "../song/lines";
import { fitPhoneGrid } from "./layout";
import { Phone } from "./phone";
import type { PhoneScore } from "./score";
import styles from "./field.module.css";

// The phones, fitted into the box they are given (after goldfishes
// pc/mobiles/1). Seats run in reading order. Every prop changes only when
// something on a phone does — a typed character, a move, a lock line, the
// minute — never per frame.

type Props = {
  /** The box, in the points of the surface the grid sits on. */
  width: number;
  height: number;
  phones: number;
  /** Hold every phone on its lock screen, whatever is sung. */
  locked: boolean;
  score: PhoneScore;
  /** The sung lines, oldest first; shared by every phone. */
  lines: readonly SungLine[];
  /** Changes with each line. */
  lineKey: string;
  clock: string;
  reducedMotion: boolean;
};

function PhoneGridView({ width, height, phones, locked, score, lines, lineKey, clock, reducedMotion }: Props) {
  const layout = fitPhoneGrid(width, height, phones);
  if (layout.width <= 0) return null;

  return (
    <div className={styles.box}>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${layout.columns}, ${layout.width}px)`, gridAutoRows: `${layout.height}px`, gap: layout.gap }}
      >
        {Array.from({ length: phones }, (_, seat) => (
          <div key={seat} className={styles.seat}>
            <Phone
              seat={seat}
              width={layout.width}
              lines={lines}
              app={score.apps[seat]!}
              upcoming={score.upcoming[seat]!}
              locked={locked || score.locked}
              lineKey={lineKey}
              clock={clock}
              reducedMotion={reducedMotion}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export const PhoneGrid = memo(PhoneGridView);
