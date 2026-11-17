"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../clock/wall-clock";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./line.module.css";
import { follow } from "../follow";

// LINE (iOS, English UI, light), a 1:1 chat with the ex, empty until the
// song. Every sung line is a message this phone's owner sends — her own green
// bubbles on the right, one after another, each filling as it is typed — and
// the ex never answers: no bubble ever gets LINE's "Read" over its time.
// Stamps follow LINE's rule: messages sent in the same minute share one time,
// beside the last; the bubble tail is on the first of a run. What the
// participant sends from the composer is one more green bubble, in order with
// the lines. A line marked bold is set in bold.
//
// Sources: layout, colours and metrics from current LINE iOS chat frames
// (default chat background, green own bubbles with the time beside them, the
// date pill, the + / camera / photo composer with the "Aa" field and smiley,
// mic → send). LINE publishes only its logo; the bar glyphs are drawn to
// those frames, not downloaded.

const SEND_LIMIT = 80;

/** "21:31" → "9:31 PM". */
function englishStamp(clock: string) {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function Glyph({ name }: { name: "back" | "search" | "call" | "menu" | "plus" | "camera" | "photo" | "emoji" | "mic" | "send" | "more" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 20" width="12" height="20"><path d="M10 1.5 1.8 10l8.2 8.5" {...stroke} strokeWidth={2.1} /></svg>;
    case "search":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="10.5" cy="10.5" r="7" {...stroke} strokeWidth={1.8} /><path d="m15.6 15.6 5.4 5.4" {...stroke} strokeWidth={1.8} /></svg>;
    case "call":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M6.6 3.5h2.6l1.6 4.3-2 1.5a11 11 0 0 0 5.9 5.9l1.5-2 4.3 1.6v2.6a2 2 0 0 1-2.1 2A16.5 16.5 0 0 1 4.5 5.6a2 2 0 0 1 2.1-2.1Z" {...stroke} strokeWidth={1.7} /></svg>;
    case "menu":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 5.5h17M3.5 12h17M3.5 18.5h17" {...stroke} strokeWidth={1.8} /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M12 4v16M4 12h16" {...stroke} strokeWidth={1.8} /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 26 24" width="26" height="24"><path d="M3 8.2A2.2 2.2 0 0 1 5.2 6h3l1.7-2.4h6.2L17.8 6h3A2.2 2.2 0 0 1 23 8.2v10.6a2.2 2.2 0 0 1-2.2 2.2H5.2A2.2 2.2 0 0 1 3 18.8Z" {...stroke} strokeWidth={1.7} /><circle cx="13" cy="13.3" r="4" {...stroke} strokeWidth={1.7} /></svg>;
    case "photo":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="4" width="18" height="16" rx="2.4" {...stroke} strokeWidth={1.7} /><circle cx="8.6" cy="9.4" r="1.6" {...stroke} strokeWidth={1.5} /><path d="m3.6 17.4 5.2-4.6 3.6 3.2 3-2.6 4.9 4.2" {...stroke} strokeWidth={1.7} /></svg>;
    case "emoji":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9" {...stroke} strokeWidth={1.6} /><circle cx="8.9" cy="10" r="1.15" fill="currentColor" /><circle cx="15.1" cy="10" r="1.15" fill="currentColor" /><path d="M8.2 14.2a4.4 4.4 0 0 0 7.6 0" {...stroke} strokeWidth={1.6} /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect x="8.6" y="3" width="6.8" height="11.4" rx="3.4" {...stroke} strokeWidth={1.7} /><path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8V21" {...stroke} strokeWidth={1.7} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M4 4.6 21 12 4 19.4l2.6-7.4Z" fill="currentColor" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" /><path d="M6.6 12H12" stroke="#fff" strokeWidth={1.6} strokeLinecap="round" /></svg>;
    case "more":
      return <svg aria-hidden="true" viewBox="0 0 12 20" width="12" height="20"><path d="m2 1.5 8.2 8.5L2 18.5" {...stroke} strokeWidth={2} /></svg>;
  }
}

function LineState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const hasText = draft.trim().length > 0;

  // The sung lines and whatever the participant sends, in the order sent: all hers.
  const entries = useMemo(
    () =>
      [
        ...lines.map((line) => ({ key: `l${line.cueIndex}`, at: line.cueIndex, text: line.text, startMs: line.startMs, bold: Boolean(line.bold) })),
        ...replies.map((reply) => ({
          key: `r${reply.id}`,
          at: reply.afterCue + 0.5,
          text: reply.text,
          startMs: lines.find((line) => line.cueIndex === reply.afterCue)?.startMs ?? 0,
          bold: false,
        })),
      ].sort((a, b) => a.at - b.at),
    [lines, replies],
  );

  // The chat keeps its newest message in view, as LINE does.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
  }, [entries, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`LINE chat with ${contact.name}`} inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.back}>
          <Glyph name="back" />
          <span className={styles.backCount}>{3 + (seat % 9)}</span>
        </span>
        <span className={styles.title}>{contact.name}</span>
        <span className={styles.actions}>
          <Glyph name="search" />
          <Glyph name="call" />
          <Glyph name="menu" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          {entries.length ? <p className={styles.date}>Today</p> : null}

          {entries.map((entry, index) => {
            // As LINE does: messages sent in the same minute share one time, beside the last of them.
            const time = englishStamp(formatSongClock(entry.startMs));
            const next = entries[index + 1];
            const stamped = !next || englishStamp(formatSongClock(next.startMs)) !== time;
            return (
              <div key={entry.key} className={styles.line} data-side="out" data-follow={index > 0 || undefined}>
                <span className={styles.meta} data-side="out">{stamped ? <span>{time}</span> : null}</span>
                <p data-lyric className={styles.bubble} data-side="out" data-head={index === 0 || undefined} style={entry.bold ? { fontWeight: 700 } : undefined}>
                  {entry.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send} data-filled={hasText || undefined}>
        {hasText ? (
          <span className={styles.tool} aria-hidden="true"><Glyph name="more" /></span>
        ) : (
          <>
            <span className={styles.tool} aria-hidden="true"><Glyph name="plus" /></span>
            <span className={styles.tool} aria-hidden="true"><Glyph name="camera" /></span>
            <span className={styles.tool} aria-hidden="true"><Glyph name="photo" /></span>
          </>
        )}
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Message {contact.name}</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Aa"
            enterKeyHint="send"
            autoComplete="off"
          />
          <span className={styles.emoji} aria-hidden="true"><Glyph name="emoji" /></span>
        </label>
        {hasText ? (
          <button type="submit" className={styles.send} aria-label="Send">
            <Glyph name="send" />
          </button>
        ) : (
          <span className={styles.tool} aria-hidden="true"><Glyph name="mic" /></span>
        )}
      </form>
    </section>
  );
}

export default memo(LineState);
