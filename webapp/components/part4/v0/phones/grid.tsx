"use client";

import { memo } from "react";
import type { SungLine } from "../song/lines";
import type { StateMode } from "./controls";
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
  mode: StateMode;
  score: PhoneScore;
  /** The sung lines, oldest first; shared by every phone. */
  lines: readonly SungLine[];
  /** Changes with each line. */
  lineKey: string;
  clock: string;
  reducedMotion: boolean;
};

function PhoneGridView({ width, height, phones, mode, score, lines, lineKey, clock, reducedMotion }: Props) {
  const layout = fitPhoneGrid(width, height, phones);
  if (layout.width <= 0) return null;
  // "score" and "lock" follow the score's apps; any other mode pins every phone to that app.
  const scored = mode === "score" || mode === "lock";
  const locked = mode === "lock" || (mode === "score" && score.locked);

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
              app={scored ? score.apps[seat]! : mode}
              upcoming={scored ? score.upcoming[seat]! : null}
              locked={locked}
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
