"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { mountAirportHall } from "./stage";
import styles from "./airport-hall.module.css";

// Client-only (loaded with ssr: false): the display element is created here and
// handed to the CSS3D layer, while React keeps rendering the interface into it.
export default function AirportHall({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [displayElement] = useState(() => {
    const element = document.createElement("div");
    element.className = styles.display;
    return element;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    return mountAirportHall(container, displayElement, { background: styles.background, display: styles.displayLayer, foreground: styles.foreground });
  }, [displayElement]);

  return (
    <div className={styles.hall} ref={containerRef}>
      {createPortal(children, displayElement)}
    </div>
  );
}
