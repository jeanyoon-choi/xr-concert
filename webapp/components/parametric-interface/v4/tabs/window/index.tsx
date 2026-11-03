"use client";

import { useEffect, useState } from "react";
import type { ClockAnchor } from "../../clock";
import { FollowerSongClock } from "../../clock/follower";
import { formatSongClock } from "../../model/clock-face";
import { roseScore, sectionAt } from "../../model/score";
import { useLyricCue } from "../../timeline/use-lyric-cue";
import { useSungLines } from "../../timeline/use-sung-lines";
import { openTabChannel, TAB_HEARTBEAT_MS } from "../channel";
import { tabTitle } from "../frame";
import { TAB_PAGES } from "../pages/registry";
import { PAGE_HISTORY } from "../pages/types";
import styles from "./window.module.css";

// One lyric tab (/parametric-interface/v4/tab). It follows the controller's
// clock, takes its seat from the controller's roster, and shows the page the
// score assigns that seat, with the sung line as its own tab title. Opened by
// the controller it carries `?slot=`; opened by hand it joins after them, in
// the order it arrived.

type Seat = { seat: number; seats: number };

export default function ParametricInterfaceV4Tab() {
  const [anchor, setAnchor] = useState<ClockAnchor | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const id = crypto.randomUUID();
    const slotParam = new URLSearchParams(window.location.search).get("slot");
    const slot = slotParam !== null && /^\d{1,3}$/.test(slotParam) ? Number(slotParam) : null;

    const channel = openTabChannel((message) => {
      if (message.kind === "clock") setAnchor(message.anchor);
      if (message.kind === "roster") {
        const index = message.ids.indexOf(id);
        setSeat(index < 0 ? null : { seat: index, seats: message.ids.length });
      }
    });
    const hello = () => channel.post({ kind: "hello", id, slot });
    const leave = () => channel.post({ kind: "bye", id });

    hello();
    const heartbeat = window.setInterval(hello, TAB_HEARTBEAT_MS);
    const patience = window.setTimeout(() => setWaiting(true), 1_600);
    window.addEventListener("pagehide", leave);

    return () => {
      leave();
      window.clearInterval(heartbeat);
      window.clearTimeout(patience);
      window.removeEventListener("pagehide", leave);
      channel.close();
    };
  }, []);

  if (!anchor || !seat) {
    return (
      <main className={styles.idle}>
        {waiting ? <p>Waiting for the controller at /parametric-interface/v4/tabs</p> : null}
      </main>
    );
  }

  return (
    <FollowerSongClock anchor={anchor}>
      <SeatPage seat={seat.seat} seats={seat.seats} />
    </FollowerSongClock>
  );
}

function SeatPage({ seat, seats }: Seat) {
  const cue = useLyricCue();
  const lines = useSungLines(cue, PAGE_HISTORY);
  const state = sectionAt(roseScore, cue.currentTimeMs).tab(seat, seats);
  const { Page } = TAB_PAGES[state];
  const title = tabTitle(lines, state);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <main className={styles.fill}>
      <Page seat={seat} lines={lines} clock={formatSongClock(cue.currentTimeMs)} />
    </main>
  );
}
