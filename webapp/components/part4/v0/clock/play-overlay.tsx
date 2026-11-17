"use client";

import { useSongClock } from ".";
import { useSongTransport } from "./audio";
import styles from "./play-overlay.module.css";

/** The round play button over the page until the first start. Page chrome: placed outside the surface. */
export function PlayOverlay() {
  const { hasStarted, song } = useSongClock();
  const { start } = useSongTransport();
  if (hasStarted) return null;

  return (
    <div className={styles.overlay}>
      <button
        aria-label={`Play ${song.title}`}
        className={styles.playButton}
        data-parametric-play-control
        onClick={(event) => {
          event.stopPropagation();
          void start();
        }}
        type="button"
      >
        <span aria-hidden="true" className={styles.playIcon} />
      </button>
    </div>
  );
}
