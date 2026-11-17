"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import styles from "./surface.module.css";

// Every interface in part4 is drawn once, at design points, and shown at
// whatever width it is given: a desktop interface on a 1440-point-wide
// sheet, a phone on its 404 × 858 frame. The sheet is zoomed as one unit
// (CSS zoom, not a transform, so text rasterises at the shown size), so
// nothing below a surface reads the viewport, a media query or a real pixel:
// inside, 1px is one design point and 100cqw / 100cqh are the sheet.

/** The width every desktop interface is drawn at, in design points. */
export const DESKTOP_WIDTH = 1440;

/** The phone frame in design points (iOS points); the glass inside is 390 × 844. */
export const PHONE_FRAME = { width: 404, height: 858 } as const;

export type SurfaceSize = {
  /** The sheet in design points. */
  readonly width: number;
  readonly height: number;
  /** Real pixels per design point, through every surface above this one. */
  readonly scale: number;
};

const SurfaceContext = createContext<SurfaceSize | null>(null);

/** The sheet an interface is drawn on, in design points. */
export function useSurface() {
  const surface = useContext(SurfaceContext);
  if (!surface) throw new Error("useSurface must be used within a part4 surface");
  return surface;
}

function Sheet({ width, height, zoom, children }: { width: number; height: number; zoom: number; children: ReactNode }) {
  const outer = useContext(SurfaceContext)?.scale ?? 1;
  const surface = useMemo(() => ({ width, height, scale: outer * zoom }), [height, outer, width, zoom]);
  return (
    <div className={styles.sheet} style={{ width, height, zoom }}>
      <SurfaceContext.Provider value={surface}>{children}</SurfaceContext.Provider>
    </div>
  );
}

/**
 * A desktop interface at the width it is given: the box this fills (the
 * viewport by default, or its positioned parent). The sheet is always
 * DESKTOP_WIDTH points wide; its height follows the box's shape.
 */
export function DesktopSurface({ children, fill = "viewport" }: { children: ReactNode; fill?: "viewport" | "parent" }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = (width: number, height: number) =>
      setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
    measure(element.clientWidth, element.clientHeight);
    const observer = new ResizeObserver(([entry]) => measure(entry!.contentRect.width, entry!.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const zoom = size ? size.width / DESKTOP_WIDTH : 0;

  return (
    <div ref={box} className={styles.box} data-fill={fill}>
      {zoom > 0 ? (
        <Sheet width={DESKTOP_WIDTH} height={size!.height / zoom} zoom={zoom}>
          {children}
        </Sheet>
      ) : null}
    </div>
  );
}

/** A phone at the width it is given, in the points of the surface it sits on. */
export function PhoneSurface({ width, children }: { width: number; children: ReactNode }) {
  return (
    <Sheet width={PHONE_FRAME.width} height={PHONE_FRAME.height} zoom={width / PHONE_FRAME.width}>
      {children}
    </Sheet>
  );
}
