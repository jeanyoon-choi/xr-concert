"use client";

import { useState } from "react";
import type { PhoneState } from "../../model/score";
import { PHONE_STATE_ORDER, PHONE_STATES } from "../apps/registry";
import styles from "./controls.module.css";

// The page's one option control, bottom right (experiments-jyc design
// guideline: a 42 px round dark button that inverts when open, above a white
// panel with a heading and option chips). It never covers the play control.

export const PHONE_COUNTS = [1, 2, 4, 6, 9, 12, 16, 24] as const;
export type StateMode = "score" | PhoneState;

export function Controls({
  phones,
  mode,
  onPhones,
  onMode,
}: {
  phones: number;
  mode: StateMode;
  onPhones: (phones: number) => void;
  onMode: (mode: StateMode) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.control} data-parametric-play-control>
      {open ? (
        <div id="v4-2-mobiles-options" className={styles.panel} role="group" aria-label="Phones">
          <p className={styles.heading}>Phones</p>
          <div className={styles.chips} role="group" aria-label="Phone count">
            {PHONE_COUNTS.map((count) => (
              <button key={count} type="button" aria-pressed={phones === count} onClick={() => onPhones(count)}>
                {count}
              </button>
            ))}
          </div>
          <p className={styles.heading}>State</p>
          <div className={styles.chips} role="group" aria-label="Phone state">
            <button type="button" aria-pressed={mode === "score"} onClick={() => onMode("score")}>
              Score
            </button>
            {PHONE_STATE_ORDER.map((id) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => onMode(id)}>
                {PHONE_STATES[id].label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className={styles.trigger}
        aria-label="Phone options"
        aria-expanded={open}
        aria-controls="v4-2-mobiles-options"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <rect x="3" y="3" width="5.5" height="9.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <rect x="11.5" y="3" width="5.5" height="9.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M3 16.5h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
