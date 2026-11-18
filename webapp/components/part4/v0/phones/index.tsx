"use client";

import { useEffect, useState } from "react";
import { AudioSongClock } from "../clock/audio";
import { isTyping } from "../clock/keys";
import { PLAY_BAR_HEIGHT, PlayBar } from "../clock/play-bar";
import { PlayOverlay } from "../clock/play-overlay";
import { anchorSongClock, formatSongClock } from "../clock/wall-clock";
import { DesktopSurface, useSurface } from "../surface";
import { useLyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import { Controls, PHONE_COUNTS, type StateMode } from "./controls";
import { PhoneGrid } from "./grid";
import { PHONE_HISTORY } from "./phone";
import { usePhoneScore } from "./score";
import styles from "./field.module.css";

// part4/v0 phones: many phones on one field, one song clock. Every phone
// takes the sung line into the interface the score gives its seat — a text
// thread, a note, a lock-screen notification — so one line is read many ways
// at once, while each phone stays an ordinary, usable phone. `?phones=` sets
// the count. The field is a desktop surface, so the phones scale with the
// width of the window. The options control, the play bar (pause, scrub, step
// by section; Space and the arrow keys) and the play button are page chrome,
// not interfaces: they sit outside the surface at a fixed size. X hides the
// bar and the options control.

const DEFAULT_PHONES = 12;

export default function Part4Phones() {
  // The surface draws nothing on the server, so reading the query here cannot mismatch its render.
  const [phones, setPhones] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PHONES;
    const requested = Math.round(Number(new URLSearchParams(window.location.search).get("phones")));
    return requested >= 1 ? Math.min(Math.max(...PHONE_COUNTS), requested) : DEFAULT_PHONES;
  });
  const [mode, setMode] = useState<StateMode>("score");

  // X hides the page chrome (the play bar and the options control) and brings it back.
  const [chrome, setChrome] = useState(true);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "x" || isTyping(event)) return;
      setChrome((shown) => !shown);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AudioSongClock>
      {/* The field fills the page above the play bar, or all of it while the chrome is hidden. */}
      <div style={{ position: "fixed", inset: `0 0 ${chrome ? PLAY_BAR_HEIGHT : 0}px 0` }}>
        <DesktopSurface fill="parent">
          <PhoneField phones={phones} mode={mode} />
        </DesktopSurface>
      </div>
      {chrome ? <Controls phones={phones} mode={mode} onPhones={setPhones} onMode={setMode} /> : null}
      <PlayBar hidden={!chrome} />
      <PlayOverlay />
    </AudioSongClock>
  );
}

/** Re-renders when the wall clock's minute turns, even while the song is stopped. */
function useWallMinute() {
  const [, setMinute] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000)), 5_000);
    return () => window.clearInterval(timer);
  }, []);
}

function PhoneField({ phones, mode }: { phones: number; mode: StateMode }) {
  const { width, height } = useSurface();
  const cue = useLyricCue();

  // This runs every frame while the song plays; everything handed to the
  // grid is stable between the moments a phone actually changes.
  useWallMinute();
  anchorSongClock(cue.currentTimeMs);
  const clock = formatSongClock(cue.currentTimeMs);
  const lines = useSungLines(cue, PHONE_HISTORY);
  const score = usePhoneScore(cue, phones);

  return (
    <main className={styles.field}>
      <PhoneGrid
        width={width}
        height={height}
        phones={phones}
        mode={mode}
        score={score}
        lines={lines}
        lineKey={`${cue.cueIndex}`}
        clock={clock}
        reducedMotion={cue.reducedMotion}
      />
    </main>
  );
}
