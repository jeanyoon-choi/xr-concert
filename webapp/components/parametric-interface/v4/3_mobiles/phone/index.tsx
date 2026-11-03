"use client";

import { memo, useCallback, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { SungLine } from "../../model/lines";
import type { PhoneState } from "../states";
import { PHONE_STATES } from "../apps/registry";
import type { PhoneAction, Reply } from "../apps/types";
import { MOVE_MS } from "../hops";
import styles from "./phone.module.css";

// One phone (after goldfishes pc/mobiles/1): someone's phone in use, moving
// between apps (hops.ts). A move is a scroll: the next app rises from below
// as the one before is carried up. On a lock line the lock screen comes
// down over the app, its notifications from that app, and goes back up after.
// Each phone has its own signal, Wi-Fi and battery.
//
// Drawn at native points (404 × 858, glass 390 × 844) and zoomed as one unit:
// CSS zoom, not a scale transform, so text rasterises at the shown size.

/** Lines a phone needs: the longest history any state keeps. */
export const PHONE_HISTORY = Math.max(...Object.values(PHONE_STATES).map((state) => state.history));

type Props = {
  seat: number;
  /** The sung lines, oldest first, at most PHONE_HISTORY; shared by every phone. */
  lines: readonly SungLine[];
  /** The app the phone is in. */
  app: PhoneState;
  /** The app it will move to next, mounted out of sight ahead of the move (null: none coming). */
  upcoming: PhoneState | null;
  /** Whether a lock line is being sung. */
  locked: boolean;
  /** Changes with each line: an app opened from the lock screen holds until then. */
  lineKey: string;
  clock: string;
  scale: number;
  reducedMotion: boolean;
};

/** A seat's status bar: signal bars (1–4), Wi-Fi arcs (1–3), battery (%). */
function statusOf(seat: number) {
  const roll = (salt: number) => ((Math.imul(seat + 3, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0) / 4_294_967_296;
  return {
    signal: 1 + Math.floor(roll(1) * 4),
    wifi: 1 + Math.floor(roll(2) * 3),
    battery: Math.round(6 + roll(3) * 94),
  };
}

function Signal({ bars }: { bars: number }) {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
      {[
        [0, 8, 4],
        [5, 5.5, 6.5],
        [10, 3, 9],
        [15, 0, 12],
      ].map(([x, y, h], index) => (
        <rect key={index} x={x} y={y} width="3" height={h} rx="0.8" opacity={index < bars ? 1 : 0.3} />
      ))}
    </svg>
  );
}

function Wifi({ arcs }: { arcs: number }) {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
      <path opacity={arcs >= 3 ? 1 : 0.3} d="M8 2.2c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.4 10.4 0 0 0 8 .5C5.2.5 2.6 1.6.6 3.5l1.2 1.2A8.7 8.7 0 0 1 8 2.2z" />
      <path opacity={arcs >= 2 ? 1 : 0.3} d="M8 5.6c1.5 0 2.8.6 3.8 1.5L13 5.9A7 7 0 0 0 8 3.9a7 7 0 0 0-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5z" />
      <path d="M8 9c.6 0 1.1.2 1.5.6L8 11.5 6.5 9.6c.4-.4.9-.6 1.5-.6z" />
    </svg>
  );
}

/**
 * The app open now. When it changes, the new app rises from below as the old
 * one is carried up with it, like one scrolled sheet; transform only. The
 * next app is mounted ahead, out of sight below, under the same key, so when
 * the move starts nothing mounts: the layer only starts moving. The old app
 * is dropped as soon as the move ends.
 */
function Slide({ id, children, next }: { id: string; children: ReactNode; next: { id: string; node: ReactNode } | null }) {
  const [current, setCurrent] = useState({ id, node: children });
  const [leaving, setLeaving] = useState<{ id: string; node: ReactNode } | null>(null);
  if (current.id !== id) {
    setLeaving({ id: current.id, node: current.node });
    setCurrent({ id, node: children });
  }
  const node = current.id === id ? children : current.node;
  return (
    <>
      {leaving ? (
        <div key={leaving.id} className={styles.slideLayer} data-phase="out">
          {leaving.node}
        </div>
      ) : null}
      <div
        key={id}
        className={styles.slideLayer}
        data-phase={leaving ? "in" : undefined}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setLeaving(null);
        }}
      >
        {node}
      </div>
      {next && next.id !== id && next.id !== leaving?.id ? (
        <div key={next.id} className={styles.slideLayer} data-phase="waiting" aria-hidden="true">
          {next.node}
        </div>
      ) : null}
    </>
  );
}

function PhoneView({ seat, lines, app, upcoming, locked, lineKey, clock, scale, reducedMotion }: Props) {
  const [replies, setReplies] = useState<readonly Reply[]>([]);
  const [opened, setOpened] = useState<{ lineKey: string; state: PhoneState } | null>(null);
  const openedNow = opened && opened.lineKey === lineKey ? opened.state : null;
  // A notification tapped on the lock screen unlocks into its app.
  const lockShown = locked && !openedNow;
  const appShown = openedNow && openedNow !== "lock" ? openedNow : app;
  const status = useMemo(() => statusOf(seat), [seat]);

  const act = useCallback(
    (action: PhoneAction) => {
      if (action.kind === "open") {
        setOpened({ lineKey, state: action.state });
        return;
      }
      setReplies((current) => [
        ...current.slice(-23),
        { id: (current.at(-1)?.id ?? 0) + 1, text: action.text, afterCue: lines.at(-1)?.cueIndex ?? -1 },
      ]);
    },
    [lineKey, lines],
  );

  const slice = (state: PhoneState) => {
    const { history } = PHONE_STATES[state];
    return lines.length > history ? lines.slice(-history) : lines;
  };
  const renderApp = (state: PhoneState, shown: boolean) => {
    const { Screen } = PHONE_STATES[state];
    return (
      <div className={styles.layer} data-state={state} data-shown={shown || undefined}>
        <Screen seat={seat} lines={slice(state)} replies={replies} clock={clock} shown={shown} reducedMotion={reducedMotion} act={act} />
      </div>
    );
  };
  const { Screen: Lock } = PHONE_STATES.lock;
  const tone = PHONE_STATES[lockShown ? "lock" : appShown].statusTone;

  return (
    <div className={styles.phone} style={{ zoom: scale, "--move-ms": `${MOVE_MS}ms` } as CSSProperties} data-reduced-motion={reducedMotion || undefined}>
      <div className={styles.glass}>
        <Slide id={appShown} next={upcoming && !openedNow ? { id: upcoming, node: renderApp(upcoming, false) } : null}>
          {renderApp(appShown, !lockShown)}
        </Slide>
        <div className={styles.lockLayer} data-state="lock" data-shown={lockShown || undefined}>
          <Lock seat={seat} lines={slice("lock")} replies={replies} clock={clock} shown={lockShown} reducedMotion={reducedMotion} act={act} source={app} />
        </div>
        <div className={styles.statusBar} data-tone={tone} aria-hidden="true">
          <span className={styles.statusTime}>{clock}</span>
          <span />
          <span className={styles.statusRight}>
            <Signal bars={status.signal} />
            <Wifi arcs={status.wifi} />
            <span className={styles.battery} data-low={status.battery <= 20 || undefined}>
              <span className={styles.batteryLevel} style={{ width: `${status.battery}%` }} />
            </span>
          </span>
        </div>
        <span className={styles.island} aria-hidden="true" />
        <span className={styles.homeIndicator} data-tone={tone} aria-hidden="true" />
      </div>
    </div>
  );
}

export const Phone = memo(PhoneView);
