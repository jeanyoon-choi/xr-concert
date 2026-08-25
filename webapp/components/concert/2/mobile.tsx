"use client";

import { useConcertSocket } from "@/hooks/use-concert-socket";
import { useCameraCollagePublisher } from "./transport/use-camera-collage-publisher";
import styles from "./mobile.module.css";

export default function CameraCollageMobile() {
  const { socket } = useConcertSocket("mobile");
  const { active, error, facingMode, previewRef, selectFacingMode, start, stop } = useCameraCollagePublisher(socket);

  return (
    <main className={styles.page}>
      <video autoPlay className={styles.preview} muted playsInline ref={previewRef} />
      <div className={styles.controls}>
        <div aria-label="Camera selection" className={styles.cameraOptions}>
          <button
            aria-pressed={facingMode === "user"}
            className={styles.option}
            onClick={() => void selectFacingMode("user")}
            type="button"
          >
            Front
          </button>
          <button
            aria-pressed={facingMode === "environment"}
            className={styles.option}
            onClick={() => void selectFacingMode("environment")}
            type="button"
          >
            Back
          </button>
        </div>
        <button className={styles.button} onClick={active ? stop : () => void start()} type="button">
          {active ? "Stop camera" : "Start front camera"}
        </button>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
      </div>
    </main>
  );
}
