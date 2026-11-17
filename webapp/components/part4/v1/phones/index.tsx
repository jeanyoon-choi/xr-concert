"use client";

import { useEffect, useState } from "react";
import { AudioSongClock } from "../clock/audio";
import { isTyping } from "../clock/keys";
import { PLAY_BAR_HEIGHT, PlayBar } from "../clock/play-bar";
import { PlayOverlay } from "../clock/play-overlay";
import { Staged } from "../staged";
import { DesktopSurface, useSurface } from "../surface";
import { useLyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import { Controls, PHONE_COUNTS, type StateMode, type View } from "./controls";
import { PhoneGrid } from "./grid";
import { PHONE_HISTORY } from "./phone";
import { usePhoneScore } from "./score";
import { usePhoneClock } from "./use-phone-clock";
import styles from "./field.module.css";

// part4/v1: one song clock, two views, switched in the options control.
// - "phones": many phones on one field, each taking the sung line into the
//   interface the score gives its seat (v0).
// - "staged": the song staged section by section (../staged); a section
//   without a staging yet shows the phones.
// The stage is a desktop surface, so it scales with the width of the
// window. The options control, the play bar (pause, scrub, step by section;
// Space and the arrow keys) and the play button are page chrome: outside
// the surface, at a fixed size. X hides the bar and the options control. The staged view is the default; `?view=phones` opens the phones, `?phones=` sets their count.

const DEFAULT_PHONES = 12;

function query(name: string) {
  return typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get(name);
}

export default function Part4() {
  // The surface draws nothing on the server, so reading the query here cannot mismatch its render.
  const [phones, setPhones] = useState(() => {
    const requested = Math.round(Number(query("phones")));
    return requested >= 1 ? Math.min(Math.max(...PHONE_COUNTS), requested) : DEFAULT_PHONES;
  });
  const [mode, setMode] = useState<StateMode>("score");
  const [view, setView] = useState<View>(() => (query("view") === "phones" ? "phones" : "staged"));

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
      {/* The stage fills the page above the play bar, or all of it while the chrome is hidden. */}
      <div style={{ position: "fixed", inset: `0 0 ${chrome ? PLAY_BAR_HEIGHT : 0}px 0` }}>
        <DesktopSurface fill="parent">
          <Stage view={view} phones={phones} mode={mode} />
        </DesktopSurface>
      </div>
      {chrome ? <Controls view={view} phones={phones} mode={mode} onView={setView} onPhones={setPhones} onMode={setMode} /> : null}
      <PlayBar hidden={!chrome} />
      <PlayOverlay />
    </AudioSongClock>
  );
}

function Stage({ view, phones, mode }: { view: View; phones: number; mode: StateMode }) {
  const cue = useLyricCue();
  const field = <PhoneField phones={phones} mode={mode} />;
  return view === "staged" ? <Staged cue={cue} fallback={field} /> : field;
}

function PhoneField({ phones, mode }: { phones: number; mode: StateMode }) {
  const { width, height } = useSurface();
  const cue = useLyricCue();

  // This runs every frame while the song plays; everything handed to the
  // grid is stable between the moments a phone actually changes.
  const clock = usePhoneClock(cue);
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
