"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ScreenRect } from "../windows";
import styles from "./desk.module.css";

// A screen drawn at its real size in CSS px and zoomed as one unit to fit
// its box (as the phones are), so windows inside it are laid out exactly as
// they open on the real screen. Children are positioned in screen px.

export function Desk({ screen, children, className }: { screen: ScreenRect; children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry!.contentRect.width, height: entry!.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(size.width / screen.width, size.height / screen.height);

  return (
    <div ref={box} className={`${styles.box} ${className ?? ""}`}>
      {scale > 0 ? (
        <div className={styles.screen} style={{ width: screen.width, height: screen.height, zoom: scale }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** A window's place on the desk, in the desk's px. */
export function DeskWindow({ screen, rect, children }: { screen: ScreenRect; rect: ScreenRect; children: ReactNode }) {
  return (
    <div className={styles.slot} style={{ left: rect.x - screen.x, top: rect.y - screen.y, width: rect.width, height: rect.height }}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
