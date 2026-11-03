"use client";

import Link from "next/link";
import { AudioSongClock } from "../clock/audio";
import { formatSongClock } from "../model/clock-face";
import { roseScore, sectionAt } from "../model/score";
import type { ParametricSong } from "../model/song";
import { PhoneGrid } from "../mobiles/grid";
import { Desk, DeskWindow } from "../tabs/desk";
import { BrowserFrame } from "../tabs/frame";
import { PAGE_HISTORY } from "../tabs/pages/types";
import type { ScreenRect } from "../tabs/windows";
import { useLyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import styles from "./composition.module.css";

// v4 (/parametric-interface/v4): one compositional state (1031 NRF XR idea).
// The main screen's browser windows and the audience's phones on one field,
// one clock. Every surface takes the same sung line into the interface the
// score gives it for this section — a search, a headline, a poster, a text,
// an assistant's answer, a notification — so the line is read many ways at
// once; each chorus pulls them into unison. The real multi-window and
// many-phone versions are /v4/tabs and /v4/mobiles.

const SCREEN: ScreenRect = { x: 0, y: 0, width: 1512, height: 945 };
const MENU_BAR = 28;
const WINDOWS = 6;
const PHONES = 6;
// Three across, two down: the screen read as two rows of a sentence.
const WINDOW_COLUMNS = 3;
const WINDOW_PLAN: ScreenRect[] = (() => {
  const frame = { x: 8, y: MENU_BAR + 8, width: SCREEN.width - 16, height: SCREEN.height - MENU_BAR - 16 };
  const rows = Math.ceil(WINDOWS / WINDOW_COLUMNS);
  const width = frame.width / WINDOW_COLUMNS;
  const height = frame.height / rows;
  return Array.from({ length: WINDOWS }, (_, index) => ({
    x: frame.x + (index % WINDOW_COLUMNS) * width,
    y: frame.y + Math.floor(index / WINDOW_COLUMNS) * height,
    width,
    height,
  }));
})();

export default function ParametricInterfaceV4({ song }: { song?: ParametricSong }) {
  return (
    <AudioSongClock song={song}>
      <Composition />
    </AudioSongClock>
  );
}

function Composition() {
  const cue = useLyricCue();
  const lines = useSungLines(cue, PAGE_HISTORY);
  const section = sectionAt(roseScore, cue.currentTimeMs);
  const clock = formatSongClock(cue.currentTimeMs);

  return (
    <main className={styles.field}>
      <section className={styles.screenPane} aria-label="Main screen">
        <Desk screen={SCREEN} className={styles.desk}>
          <div className={styles.menuBar} aria-hidden="true">
            <span>
              <b>Browser</b> File Edit View History Window
            </span>
            <span>
              {"Tue 3 Nov"} {clock}
            </span>
          </div>
          {WINDOW_PLAN.map((rect, seat) => (
            <DeskWindow key={seat} screen={SCREEN} rect={rect}>
              <BrowserFrame seat={seat} state={section.tab(seat, WINDOWS)} lines={lines} clock={clock} focused={seat === WINDOWS - 1} />
            </DeskWindow>
          ))}
        </Desk>
        <footer className={styles.caption}>
          <span className={styles.section}>{section.label}</span>
          <span className={styles.line}>{lines.at(-1)?.full ?? "toxic till the end"}</span>
          <nav className={styles.links}>
            <Link href="/parametric-interface/v4/tabs">Real windows</Link>
            <Link href="/parametric-interface/v4/mobiles">Phones only</Link>
          </nav>
        </footer>
      </section>
      <section className={styles.phonePane} aria-label="Phones">
        <PhoneGrid cue={cue} phones={PHONES} />
      </section>
    </main>
  );
}
