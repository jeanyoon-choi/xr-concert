"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ClockAnchor } from "../../clock";
import { AudioSongClock, useSongTransport } from "../../clock/audio";
import { formatSongClock } from "../../model/clock-face";
import { roseScore, sectionAt } from "../../model/score";
import { useLyricCue } from "../../timeline/use-lyric-cue";
import { useSungLines } from "../../timeline/use-sung-lines";
import { Desk, DeskWindow } from "../desk";
import { BrowserFrame, tabTitle } from "../frame";
import { PAGE_HISTORY } from "../pages/types";
import { createRoster, openTabChannel, TAB_HEARTBEAT_MS, type TabMessage } from "../channel";
import {
  closeWindows,
  measureScreen,
  openWindowCount,
  openWindows,
  planWindows,
  TAB_LAYOUTS,
  type ScreenRect,
  type TabLayout,
} from "../windows";
import styles from "./controller.module.css";

// v4 multi-tab controller (/parametric-interface/v4/tabs). It owns the audio
// and the roster of lyric tabs, opens the windows from one click (after
// SCC desktop-collage), and mirrors what every seat shows: each planned
// window drawn at real size with the page the score gives its seat. The windows follow
// its clock over a BroadcastChannel; nothing passes through a server.

const COUNT_RANGE = { min: 1, max: 16 } as const;
const FALLBACK_SCREEN: ScreenRect = { x: 0, y: 0, width: 1440, height: 900 };

const noSubscription = () => () => {};
let measuredScreen: ScreenRect | undefined;
const readScreen = () => (measuredScreen ??= measureScreen());

export default function ParametricInterfaceV4Tabs() {
  const channelRef = useRef<ReturnType<typeof openTabChannel> | null>(null);
  const anchorRef = useRef<(() => ClockAnchor) | null>(null);
  const [ids, setIds] = useState<readonly string[]>([]);

  useEffect(() => {
    const roster = createRoster();
    const publish = () => {
      const next = roster.ids();
      setIds(next);
      channel.post({ kind: "roster", ids: next });
    };
    const channel = openTabChannel((message: TabMessage) => {
      if (message.kind === "hello") {
        if (roster.seen(message.id, message.slot, Date.now())) publish();
        const anchor = anchorRef.current?.();
        if (anchor) channel.post({ kind: "clock", anchor });
      }
      if (message.kind === "bye" && roster.remove(message.id)) publish();
    });
    channelRef.current = channel;
    const prune = window.setInterval(() => {
      if (roster.prune(Date.now())) publish();
    }, TAB_HEARTBEAT_MS);
    const stop = () => {
      const anchor = anchorRef.current?.();
      if (anchor) channel.post({ kind: "clock", anchor: { ...anchor, playing: false } });
    };
    window.addEventListener("pagehide", stop);

    return () => {
      stop();
      window.removeEventListener("pagehide", stop);
      window.clearInterval(prune);
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const broadcast = useCallback((anchor: ClockAnchor) => channelRef.current?.post({ kind: "clock", anchor }), []);

  return (
    <AudioSongClock overlay={false} onAnchor={broadcast}>
      <Controller anchorRef={anchorRef} following={ids.length} />
    </AudioSongClock>
  );
}

function Controller({
  anchorRef,
  following,
}: {
  anchorRef: { current: (() => ClockAnchor) | null };
  following: number;
}) {
  const transport = useSongTransport();
  const cue = useLyricCue();
  const screen = useSyncExternalStore(noSubscription, readScreen, () => FALLBACK_SCREEN);
  const [count, setCount] = useState(8);
  const [layout, setLayout] = useState<TabLayout>("grid");
  const [blocked, setBlocked] = useState(0);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    anchorRef.current = transport.anchor;
  }, [anchorRef, transport.anchor]);

  useEffect(() => {
    const timer = window.setInterval(() => setOpenCount(openWindowCount()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const seats = following > 0 ? following : count;
  const plan = planWindows(layout, seats, screen);
  const lines = useSungLines(cue, PAGE_HISTORY);
  const section = sectionAt(roseScore, cue.currentTimeMs);
  const clock = formatSongClock(cue.currentTimeMs);
  const states = Array.from({ length: seats }, (_, seat) => section.tab(seat, seats));

  const open = () => {
    setBlocked(openWindows(layout, count));
    setOpenCount(openWindowCount());
  };

  const status = blocked
    ? `${blocked} of ${count} blocked. Allow pop-ups for ${typeof window === "undefined" ? "this site" : window.location.host}, then open again.`
    : following
      ? `${following} ${following === 1 ? "tab" : "tabs"} following`
      : "No tabs yet";

  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.crumbs}>
          <Link href="/parametric-interface">parametric-interface</Link>
          <span aria-hidden="true">/</span>
          <span>v4</span>
          <span aria-hidden="true">/</span>
          <span>tabs</span>
        </h1>
      </header>

      <div className={styles.body}>
        <section className={styles.previewArea} aria-label="Windows on this screen">
          <Desk screen={screen} className={styles.screen}>
            {layout === "tabs" ? (
              <DeskWindow screen={screen} rect={screen}>
                <BrowserFrame
                  seat={0}
                  state={states[0]!}
                  lines={lines}
                  clock={clock}
                  focused
                  strip={states.slice(1).map((state) => ({ state, title: tabTitle(lines, state) }))}
                />
              </DeskWindow>
            ) : (
              plan.map((rect, seat) =>
                rect ? (
                  <DeskWindow key={seat} screen={screen} rect={rect}>
                    <BrowserFrame seat={seat} state={states[seat]!} lines={lines} clock={clock} focused={seat === seats - 1} />
                  </DeskWindow>
                ) : null,
              )
            )}
          </Desk>
          <p className={styles.section}>{section.label}</p>
          <p className={styles.lyric} aria-live="off">
            {cue.lyric.map((word, position) => (
              <span key={position} data-sung={position <= cue.activeWordPosition || undefined}>
                {word}
              </span>
            ))}
          </p>
        </section>

        <aside className={styles.panel} aria-label="Tabs">
          <div className={styles.row}>
            <span className={styles.label} id="v4-tab-count">Windows</span>
            <div className={styles.stepper} role="group" aria-labelledby="v4-tab-count">
              <button type="button" aria-label="Fewer windows" disabled={count <= COUNT_RANGE.min} onClick={() => setCount((value) => Math.max(COUNT_RANGE.min, value - 1))}>
                −
              </button>
              <output aria-live="polite">{count}</output>
              <button type="button" aria-label="More windows" disabled={count >= COUNT_RANGE.max} onClick={() => setCount((value) => Math.min(COUNT_RANGE.max, value + 1))}>
                +
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <span className={styles.label} id="v4-tab-layout">Layout</span>
            <div className={styles.chips} role="group" aria-labelledby="v4-tab-layout">
              {TAB_LAYOUTS.map((option) => (
                <button key={option.id} type="button" aria-pressed={layout === option.id} onClick={() => setLayout(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.primary} onClick={open}>
              Open {count} {layout === "tabs" ? (count === 1 ? "tab" : "tabs") : count === 1 ? "window" : "windows"}
            </button>
            <div className={styles.pair}>
              <button type="button" onClick={() => void transport.start()}>
                {cue.hasStarted ? "Restart" : "Play"}
              </button>
              <button type="button" disabled={!cue.hasStarted} onClick={transport.toggle}>
                {cue.isPlaying ? "Pause" : "Resume"}
              </button>
            </div>
            <button
              type="button"
              disabled={openCount === 0}
              onClick={() => {
                closeWindows();
                setOpenCount(0);
                setBlocked(0);
              }}
            >
              Close windows
            </button>
          </div>

          <p className={styles.status} role="status">
            {status}
          </p>
        </aside>
      </div>
    </main>
  );
}
