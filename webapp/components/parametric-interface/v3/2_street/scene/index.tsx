"use client";

import { useEffect, useRef, useState } from "react";
import { useSignLyric } from "../timeline/use-sign-lyric";
import { mountStreet, type Street } from "./stage";
import styles from "./street.module.css";

// Client-only (loaded with ssr: false). Every projecting sign takes the sung
// word as its name, all at once.
export default function EuljiroAlley() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [street, setStreet] = useState<Street | null>(null);
  const { word } = useSignLyric();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const mounted = mountStreet(container, styles.canvas);
    setStreet(mounted);
    return () => {
      mounted.dispose();
      setStreet(null);
    };
  }, []);

  useEffect(() => {
    street?.setWord(word);
  }, [street, word]);

  return <div className={styles.street} ref={containerRef} />;
}
