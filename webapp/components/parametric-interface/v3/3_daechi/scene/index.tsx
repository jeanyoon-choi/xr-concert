"use client";

import { useEffect, useRef, useState } from "react";
import { useSignLyric } from "../timeline/use-sign-lyric";
import { loadSignFonts } from "./fonts";
import { ownNameSample } from "./lyric-rows";
import { createDaechi, type DaechiScene } from "./scene";
import styles from "./daechi.module.css";

// Client-only (loaded with ssr: false). The academy signs take the sung line
// one word per sign along each row of signs.
export default function DaechiStreet() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [street, setStreet] = useState<DaechiScene | null>(null);
  const { activeWordPosition, lyric } = useSignLyric();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let mounted: DaechiScene | null = null;
    let cancelled = false;
    // Signs are painted once at build time, so the typefaces must be in first.
    void loadSignFonts(ownNameSample).finally(() => {
      if (cancelled) return;
      mounted = createDaechi(container);
      setStreet(mounted);
    });
    return () => {
      cancelled = true;
      mounted?.dispose();
      setStreet(null);
    };
  }, []);

  useEffect(() => {
    street?.setLyric(lyric, activeWordPosition);
  }, [activeWordPosition, lyric, street]);

  return <div className={styles.street} ref={containerRef} />;
}
