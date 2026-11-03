"use client";

import { useState } from "react";
import { AudioSongClock } from "../clock/audio";
import type { ParametricSong } from "../model/song";
import { useLyricCue } from "../timeline/use-lyric-cue";
import { Controls, PHONE_COUNTS, type StateMode } from "./controls";
import { PhoneGrid } from "./grid";
import styles from "./mobiles.module.css";

// v4/2 (2_mobiles): a copy of 1_mobiles to be adjusted further. Many phones on
// one field, one song clock. Every phone takes the sung line into the
// interface the score assigned its seat — a text thread, a note,
// a lock-screen notification — so one line is read many ways at once, while
// each phone stays an ordinary, usable phone. `?phones=` sets the count.

const DEFAULT_PHONES = 12;

export default function ParametricInterfaceV4Mobiles({ song }: { song?: ParametricSong }) {
  return (
    <AudioSongClock song={song}>
      <PhoneField />
    </AudioSongClock>
  );
}

function PhoneField() {
  const cue = useLyricCue();
  // Nothing phone-count dependent is drawn before the grid's first
  // measurement, so reading the query here cannot mismatch the server render.
  const [phones, setPhones] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PHONES;
    const requested = Math.round(Number(new URLSearchParams(window.location.search).get("phones")));
    return requested >= 1 ? Math.min(Math.max(...PHONE_COUNTS), requested) : DEFAULT_PHONES;
  });
  const [mode, setMode] = useState<StateMode>("score");

  return (
    <main className={styles.field}>
      <PhoneGrid cue={cue} phones={phones} mode={mode} />
      <Controls phones={phones} mode={mode} onPhones={setPhones} onMode={setMode} />
    </main>
  );
}
