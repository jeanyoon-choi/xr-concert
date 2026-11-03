"use client";

import { useEffect, useState } from "react";
import type { ClockAnchor } from "../../clock";
import { FollowerSongClock } from "../../clock/follower";
import { INTERFACES } from "../../interfaces/registry";
import { roseScore, sectionAt } from "../../model/score";
import { useSongClock } from "../../clock";
import { COMPOSITION_CHANNEL, openTabChannel, TAB_HEARTBEAT_MS } from "../channel";
import styles from "./window.module.css";

// One lyric window (/parametric-interface/v4/tab). It follows a clock it does
// not own and shows, full window, the v2 interface the score assigns its
// seat. Two ways in:
// - Opened from the controller (/v4/tabs, `?slot=`) or by hand: it says
//   hello on the tab channel, follows the controller's clock and takes its
//   seat from the controller's roster.
// - Embedded in the composition (/v4, `?embed=<seat>&seats=<n>`): its seat
//   is fixed and it follows the composition's clock on its own channel.

type Seat = { seat: number; seats: number };

function readEmbed(): Seat | null {
  const query = new URLSearchParams(window.location.search);
  const seat = query.get("embed");
  const seats = query.get("seats");
  if (seat === null || seats === null || !/^\d{1,2}$/.test(seat) || !/^\d{1,2}$/.test(seats)) return null;
  return Number(seat) < Number(seats) ? { seat: Number(seat), seats: Number(seats) } : null;
}

export default function ParametricInterfaceV4Tab() {
  const [anchor, setAnchor] = useState<ClockAnchor | null>(null);
  const [seat, setSeat] = useState<Seat | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const id = crypto.randomUUID();
    const embed = readEmbed();
    const slotParam = new URLSearchParams(window.location.search).get("slot");
    const slot = slotParam !== null && /^\d{1,3}$/.test(slotParam) ? Number(slotParam) : null;

    const channel = openTabChannel(
      (message) => {
        if (message.kind === "clock") setAnchor(message.anchor);
        if (message.kind === "roster" && !embed) {
          const index = message.ids.indexOf(id);
          setSeat(index < 0 ? null : { seat: index, seats: message.ids.length });
        }
      },
      embed ? COMPOSITION_CHANNEL : undefined,
    );
    if (embed) setSeat(embed);
    const hello = () => channel.post({ kind: "hello", id, slot: embed ? null : slot });
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
      <SeatInterface seat={seat.seat} seats={seat.seats} />
    </FollowerSongClock>
  );
}

function SeatInterface({ seat, seats }: Seat) {
  const { currentTimeMs } = useSongClock();
  const key = sectionAt(roseScore, currentTimeMs).tab(seat, seats);
  const { Screen } = INTERFACES[key];
  // A new interface mounts fresh, as a new page would.
  return <Screen key={key} />;
}
