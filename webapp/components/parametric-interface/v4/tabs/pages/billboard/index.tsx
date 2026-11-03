"use client";

import { memo, type CSSProperties } from "react";
import type { TabPageProps } from "../types";
import styles from "./billboard.module.css";

// A street poster (the 1031 idea's street ads): the whole line set as one
// block of type filling the window, each word turning solid as it is sung.
// Every seat is printed in its own colours, so a grid of windows reads as a
// wall of posters. Before the song it is the night's announcement.

const INKS = [
  { paper: "#e9ff3b", ink: "#0b0b0b" },
  { paper: "#ff3d1f", ink: "#fff5ee" },
  { paper: "#0b0b0b", ink: "#f3efe6" },
  { paper: "#2243ff", ink: "#ffffff" },
  { paper: "#f3efe6", ink: "#0b0b0b" },
  { paper: "#ff86c8", ink: "#0b0b0b" },
] as const;

const IDLE = ["Tonight", "21:30"] as const;

/** Rows the line should break into for a landscape and a portrait window. */
function rows(chars: number) {
  return { landscape: Math.max(1, Math.round(Math.sqrt(chars / 7))), portrait: Math.max(1, Math.round(Math.sqrt(chars / 2.6))) };
}

function BillboardPage({ seat, lines }: TabPageProps) {
  const { paper, ink } = INKS[seat % INKS.length]!;
  const current = lines.at(-1);
  const words = current ? current.words : IDLE;
  const sung = current ? current.sung : IDLE.length;
  const chars = words.join(" ").length;
  const { landscape, portrait } = rows(chars);

  return (
    <div
      className={styles.page}
      style={
        {
          "--paper": paper,
          "--ink": ink,
          "--chars": chars,
          "--rows-landscape": landscape,
          "--rows-portrait": portrait,
        } as CSSProperties
      }
    >
      <div className={styles.top}>
        <span>toxic till the end</span>
        <span>No. {String(seat + 1).padStart(2, "0")}</span>
      </div>
      <p className={styles.line} key={current?.cueIndex ?? "idle"}>
        {words.map((word, index) => (
          <span key={index} data-sung={index < sung || undefined}>
            {word}{" "}
          </span>
        ))}
      </p>
      <div className={styles.bottom}>
        <span>Tuesday, Nov 3 — 21:30</span>
        <span>tilltheend.city</span>
      </div>
    </div>
  );
}

export default memo(BillboardPage);
