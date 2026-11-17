"use client";

import { useEffect } from "react";
import { useSongClock } from ".";
import { useSongTransport } from "./audio";
import { SECTIONS } from "../song/sections";
import styles from "./play-bar.module.css";

// The play bar along the bottom of the page: pause and resume, and a
// timeline of the song's sections to scrub (click or drag anywhere on it)
// and step through. Page chrome, in real pixels. Keys, unless a text
// field has focus: Space plays or pauses, ← / → step back and forward
// STEP_MS, ↑ / ↓ go to the previous and the next section. The page hides the
// bar with X; the keys keep working while it is hidden.

/** The bar's height; the page keeps its stage above it. */
export const PLAY_BAR_HEIGHT = 48;

const STEP_MS = 5_000;
/** Within this long of a section's start, "previous" goes to the section before rather than back to that start. */
const RESTART_WINDOW_MS = 1_500;

const stamp = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1_000) % 60).padStart(2, "0")}`;

export function PlayBar({ hidden = false }: { hidden?: boolean }) {
  const { song, currentTimeMs, isPlaying } = useSongClock();
  const { toggle, seek } = useSongTransport();

  /** Where each section begins, in song time; the first begins at 0. */
  const starts = SECTIONS.map((section, index) => (index === 0 ? 0 : song.lyrics[section.from]!.startMs));
  let current = 0;
  for (let index = 1; index < starts.length; index += 1) if (starts[index]! <= currentTimeMs) current = index;

  const step = (deltaMs: number) => void seek(currentTimeMs + deltaMs);
  const previous = () => void seek(starts[currentTimeMs - starts[current]! > RESTART_WINDOW_MS ? current : Math.max(0, current - 1)]!);
  const next = () => void seek(starts[Math.min(starts.length - 1, current + 1)]!);

  // The handlers read the clock, which moves every frame; the listener is rebound with them.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const action = { " ": toggle, ArrowLeft: () => step(-STEP_MS), ArrowRight: () => step(STEP_MS), ArrowUp: previous, ArrowDown: next }[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Hidden, the bar is gone but its keys still work.
  if (hidden) return null;

  return (
    <div className={styles.bar} role="group" aria-label="Playback" style={{ height: PLAY_BAR_HEIGHT }} data-parametric-play-control>
      <button type="button" aria-label="Previous section" onClick={previous}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 4v12M16 4 7.5 10 16 16Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </button>
      <button type="button" aria-label={isPlaying ? "Pause" : "Play"} onClick={toggle}>
        {isPlaying ? (
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M6 4v12M14 4v12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        ) : (
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M6 3.5v13l10.5-6.5Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
        )}
      </button>
      <button type="button" aria-label="Next section" onClick={next}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M15 4v12M4 4l8.5 6L4 16Z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
      </button>
      <span className={styles.time}>{stamp(currentTimeMs)}</span>
      <div className={styles.timeline}>
        {/* The song as its sections, to scale; the one playing is lit. */}
        <div className={styles.sections} aria-hidden="true">
          {SECTIONS.map((section, index) => (
            <span
              key={section.id}
              className={styles.segment}
              data-current={index === current || undefined}
              style={{ flexGrow: (starts[index + 1] ?? song.durationMs) - starts[index]! }}
            >
              {section.label}
            </span>
          ))}
        </div>
        <span className={styles.playhead} aria-hidden="true" style={{ left: `${(currentTimeMs / song.durationMs) * 100}%` }} />
        <input
          className={styles.scrub}
        type="range"
        aria-label="Song position"
        min={0}
        max={song.durationMs}
        step={100}
        value={currentTimeMs}
        onChange={(event) => void seek(Number(event.target.value))}
        // Keys belong to the page's shortcuts, not the slider.
        onKeyDown={(event) => event.preventDefault()}
        />
      </div>
      <span className={styles.time}>{stamp(song.durationMs)}</span>
    </div>
  );
}
