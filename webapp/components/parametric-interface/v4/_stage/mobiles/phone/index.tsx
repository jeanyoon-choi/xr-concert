"use client";

import { memo, useCallback, useState, type CSSProperties } from "react";
import type { SungLine } from "../../model/lines";
import type { PhoneState } from "../../model/score";
import { PHONE_STATE_ORDER, PHONE_STATES } from "../apps/registry";
import type { PhoneAction, Reply } from "../apps/types";
import styles from "./phone.module.css";

// One phone: the iOS frame (after goldfishes pc/mobiles/1) around the state
// the score assigned to its seat. Every state stays mounted, so a thread's
// scroll and draft survive the score moving the seat away and back; only the
// shown one is interactable. Every phone takes the same sung lines (v2's
// rule); what differs is the interface the score gives it, and its own
// contact and wallpaper. The phone keeps what its participant did —
// replies sent, a notification opened — and that holds until the score's
// next section reassigns the seat.
//
// Drawn at native points (404 × 858, glass 390 × 844) and zoomed as one unit:
// CSS zoom, not a scale transform, so text rasterises at the shown size.

/** Lines a phone needs: the longest history any state keeps. */
export const PHONE_HISTORY = Math.max(...Object.values(PHONE_STATES).map((state) => state.history));

type Props = {
  seat: number;
  /** The sung lines, oldest first, at most PHONE_HISTORY; shared by every phone. */
  lines: readonly SungLine[];
  /** The state the score assigns now, and the section that assigned it. */
  assigned: PhoneState;
  sectionId: string;
  clock: string;
  scale: number;
  reducedMotion: boolean;
};

function PhoneView({ seat, lines, assigned, sectionId, clock, scale, reducedMotion }: Props) {
  const [replies, setReplies] = useState<readonly Reply[]>([]);
  const [opened, setOpened] = useState<{ sectionId: string; state: PhoneState } | null>(null);
  const shownState = opened && opened.sectionId === sectionId ? opened.state : assigned;

  const act = useCallback(
    (action: PhoneAction) => {
      if (action.kind === "open") {
        setOpened({ sectionId, state: action.state });
        return;
      }
      setReplies((current) => [
        ...current.slice(-23),
        { id: (current.at(-1)?.id ?? 0) + 1, text: action.text, afterCue: lines.at(-1)?.cueIndex ?? -1 },
      ]);
    },
    [sectionId, lines],
  );

  const tone = PHONE_STATES[shownState].statusTone;

  return (
    <div className={styles.phone} style={{ zoom: scale } as CSSProperties} data-reduced-motion={reducedMotion || undefined}>
      <div className={styles.glass}>
        {PHONE_STATE_ORDER.map((id) => {
          const { Screen, history } = PHONE_STATES[id];
          const shown = id === shownState;
          return (
            <div key={id} className={styles.layer} data-state={id} data-shown={shown || undefined}>
              <Screen
                seat={seat}
                lines={lines.length > history ? lines.slice(-history) : lines}
                replies={replies}
                clock={clock}
                shown={shown}
                reducedMotion={reducedMotion}
                act={act}
              />
            </div>
          );
        })}
        <div className={styles.statusBar} data-tone={tone} aria-hidden="true">
          <span className={styles.statusTime}>{clock}</span>
          <span />
          <span className={styles.statusRight}>
            <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
              <rect x="0" y="8" width="3" height="4" rx="0.8" />
              <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
              <rect x="10" y="3" width="3" height="9" rx="0.8" />
              <rect x="15" y="0" width="3" height="12" rx="0.8" />
            </svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
              <path d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .5C5.2.5 2.6 1.6.6 3.5l1.2 1.2A8.7 8.7 0 0 1 8 2.2z" />
              <path d="M8 5.6c1.5 0 2.8.6 3.8 1.5L13 5.9A7 7 0 0 0 8 3.9a7 7 0 0 0-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5z" />
              <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.5 6.5 9.6c.4-.4.9-.6 1.5-.6z" />
            </svg>
            <span className={styles.battery}>
              <span className={styles.batteryLevel} />
            </span>
          </span>
        </div>
        <span className={styles.island} aria-hidden="true" />
        <span className={styles.homeIndicator} data-tone={tone} aria-hidden="true" />
      </div>
    </div>
  );
}

export const Phone = memo(PhoneView);
