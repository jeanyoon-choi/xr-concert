"use client";

import { useState } from "react";
import { ALL_APPS, STATE_GROUPS, type PhoneState } from "../states";
import { PHONE_STATES } from "../apps/registry";
import { TEXT_SCALES, type LyricStyle } from "../phone";
import styles from "./controls.module.css";

// The page's one option control, bottom right (experiments-jyc design
// guideline: a 42 px round dark button that inverts when open, above a white
// panel with a heading and option chips). It never covers the play control.

export const PHONE_COUNTS = [1, 2, 4, 6, 9, 12, 16, 24] as const;
/** What the page shows: the phone grid, or the song staged section by section. */
export type View = "phones" | "staged";
const VIEWS: readonly { id: View; label: string }[] = [
  { id: "phones", label: "Phones" },
  { id: "staged", label: "Staged" },
];

export function Controls({
  view,
  lyric,
  phones,
  pool,
  locked,
  onView,
  onLyric,
  onPhones,
  onPool,
  onLocked,
}: {
  view: View;
  onView: (view: View) => void;
  /** How every phone sets the lyric (phone/index.tsx PhoneLyricStyle). */
  lyric: LyricStyle;
  onLyric: (lyric: LyricStyle) => void;
  phones: number;
  /** The apps the phones are dealt from; empty deals the default. */
  pool: readonly PhoneState[];
  /** Hold every phone on its lock screen. */
  locked: boolean;
  onPhones: (phones: number) => void;
  onPool: (pool: readonly PhoneState[]) => void;
  onLocked: (locked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.control} data-parametric-play-control>
      {open ? (
        <div id="part4-phone-options" className={styles.panel} role="group" aria-label="Phones">
          <p className={styles.heading}>View</p>
          <div className={styles.chips} role="group" aria-label="View">
            {VIEWS.map((entry) => (
              <button key={entry.id} type="button" aria-pressed={view === entry.id} onClick={() => onView(entry.id)}>
                {entry.label}
              </button>
            ))}
          </div>
          <p className={styles.heading}>Text size</p>
          <div className={styles.chips} role="group" aria-label="Text size">
            {TEXT_SCALES.map((scale) => (
              <button key={scale} type="button" aria-pressed={lyric.scale === scale} onClick={() => onLyric({ ...lyric, scale })}>
                {scale}×
              </button>
            ))}
            <button type="button" aria-pressed={lyric.bold} onClick={() => onLyric({ ...lyric, bold: !lyric.bold })}>
              Bold
            </button>
          </div>
          <p className={styles.heading}>Phones</p>
          <div className={styles.chips} role="group" aria-label="Phone count">
            {PHONE_COUNTS.map((count) => (
              <button key={count} type="button" aria-pressed={phones === count} onClick={() => onPhones(count)}>
                {count}
              </button>
            ))}
          </div>
          {/* Apps: the pool the phones are dealt from. A chip puts an app in or
              takes it out; a group's name does the same for the whole group. */}
          <p className={styles.heading}>Apps</p>
          <div className={styles.chips} role="group" aria-label="All apps">
            <button type="button" aria-pressed={pool.length === ALL_APPS.length} onClick={() => onPool(ALL_APPS)}>
              All
            </button>
            <button type="button" aria-pressed={pool.length === 0} onClick={() => onPool([])}>
              None
            </button>
            <button type="button" aria-pressed={locked} onClick={() => onLocked(!locked)}>
              {PHONE_STATES.lock.label}
            </button>
          </div>
          {STATE_GROUPS.map((group) => {
            const apps = group.states.filter((id): id is PhoneState => id !== "lock");
            const chosen = apps.filter((id) => pool.includes(id));
            // Kept in group order, so the same choice always deals the same grid.
            const set = (ids: readonly PhoneState[], on: boolean) =>
              onPool(ALL_APPS.filter((id) => (ids.includes(id) ? on : pool.includes(id))));
            return (
              <div key={group.id} className={styles.group} role="group" aria-label={group.label}>
                <button
                  type="button"
                  className={styles.groupName}
                  aria-pressed={chosen.length === apps.length ? true : chosen.length > 0 ? "mixed" : false}
                  onClick={() => set(apps, chosen.length < apps.length)}
                >
                  {group.label}
                </button>
                <div className={styles.chips}>
                  {apps.map((id) => (
                    <button key={id} type="button" aria-pressed={pool.includes(id)} onClick={() => set([id], !pool.includes(id))}>
                      {PHONE_STATES[id].label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      <button
        type="button"
        className={styles.trigger}
        aria-label="Phone options"
        aria-expanded={open}
        aria-controls="part4-phone-options"
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
