"use client";

import { memo, useLayoutEffect, useRef, useState } from "react";
import { formatSongClock } from "../../../model/clock-face";
import type { PhoneStateProps } from "../types";
import styles from "./notes.module.css";

// iOS Notes, one note open. The note is what she writes down and does not
// send: each sung line is typed into it as its own line, word by word, the
// caret at its end. Notes makes the first line the note's title. The note is
// real text: the participant can keep writing under the song's lines, and
// what they write stays in the note.

function Glyph({ name }: { name: "back" | "share" | "more" | "checklist" | "table" | "attach" | "markup" | "compose" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 21" width="12" height="21"><path d="M10.5 1.5 1.8 10.5l8.7 9" {...stroke} strokeWidth={2.6} /></svg>;
    case "share":
      return <svg aria-hidden="true" viewBox="0 0 20 26" width="19" height="25"><path d="M10 16V2M5.5 6.2 10 1.8l4.5 4.4" {...stroke} /><path d="M6.5 10H3.8A1.8 1.8 0 0 0 2 11.8v10.4A1.8 1.8 0 0 0 3.8 24h12.4a1.8 1.8 0 0 0 1.8-1.8V11.8A1.8 1.8 0 0 0 16.2 10h-2.7" {...stroke} /></svg>;
    case "more":
      return <svg aria-hidden="true" viewBox="0 0 26 26" width="25" height="25"><circle cx="13" cy="13" r="11.5" {...stroke} strokeWidth={1.7} /><circle cx="8" cy="13" r="1.5" fill="currentColor" /><circle cx="13" cy="13" r="1.5" fill="currentColor" /><circle cx="18" cy="13" r="1.5" fill="currentColor" /></svg>;
    case "checklist":
      return <svg aria-hidden="true" viewBox="0 0 26 24" width="25" height="23"><circle cx="5" cy="6" r="3.2" {...stroke} strokeWidth={1.6} /><path d="m3.4 6 1.2 1.2 2.2-2.4" {...stroke} strokeWidth={1.4} /><circle cx="5" cy="17" r="3.2" {...stroke} strokeWidth={1.6} /><path d="M12 6h12M12 17h12" {...stroke} /></svg>;
    case "table":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="23" height="23"><rect x="2" y="3" width="20" height="18" rx="3" {...stroke} /><path d="M2 9.5h20M2 15h20M9 9.5V21M15 9.5V21" {...stroke} strokeWidth={1.5} /></svg>;
    case "attach":
      return <svg aria-hidden="true" viewBox="0 0 24 26" width="22" height="24"><path d="m20.5 12.6-8.4 8.6a5.6 5.6 0 0 1-8-7.9l9.2-9.4a3.8 3.8 0 0 1 5.4 5.3l-9.2 9.4a1.9 1.9 0 0 1-2.7-2.6l8.5-8.7" {...stroke} /></svg>;
    case "markup":
      return <svg aria-hidden="true" viewBox="0 0 26 26" width="25" height="25"><circle cx="13" cy="13" r="11.5" {...stroke} strokeWidth={1.7} /><path d="m9 17.5.7-3 6.7-6.7a1.5 1.5 0 0 1 2.2 2.1l-6.8 6.8Z" {...stroke} strokeWidth={1.6} /></svg>;
    case "compose":
      return <svg aria-hidden="true" viewBox="0 0 26 26" width="25" height="25"><path d="M21 14v7a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 21V7.5A2.5 2.5 0 0 1 5 5h7" {...stroke} /><path d="m10 16.5.8-3.4L20.4 3.5a1.9 1.9 0 0 1 2.7 2.7l-9.6 9.6Z" {...stroke} /></svg>;
  }
}

function NotesState({ seat, lines, shown, reducedMotion }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const [title, ...rest] = lines;

  // The note keeps its newest line in view, as the editor does while typing.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !shown) return;
    body.scrollTo({ top: body.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [lines, shown, reducedMotion]);

  return (
    <section className={styles.app} aria-label="Notes" inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Glyph name="back" />
          Notes
        </span>
        <span className={styles.actions}>
          <Glyph name="share" />
          <Glyph name="more" />
        </span>
      </header>

      <div ref={bodyRef} className={styles.body}>
        <p className={styles.date}>3 November 2026 at {formatSongClock(title?.startMs ?? 0)}</p>
        {title ? (
          <p className={styles.title} data-typing={(title.current && !draft) || undefined}>
            {title.text}
          </p>
        ) : null}
        {rest.map((line) => (
          <p key={line.cueIndex} className={styles.line} data-typing={(line.current && !draft) || undefined}>
            {line.text}
          </p>
        ))}
        <label className={styles.draft}>
          <span className={styles.visuallyHidden}>Note, seat {seat + 1}</span>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} spellCheck={false} />
        </label>
      </div>

      <footer className={styles.toolbar} aria-hidden="true">
        <Glyph name="checklist" />
        <Glyph name="table" />
        <Glyph name="attach" />
        <Glyph name="markup" />
        <Glyph name="compose" />
      </footer>
    </section>
  );
}

export default memo(NotesState);
