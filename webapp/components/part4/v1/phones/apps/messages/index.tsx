"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../clock/wall-clock";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./messages.module.css";
import { follow } from "../follow";

// iOS Messages, one thread per seat with that seat's ex, empty until the
// song (a new conversation: nothing above the first message). Every sung line
// is an iMessage this phone's owner sends — her own blue bubbles, one after
// another, each filling as it is typed — and the ex never answers: the last
// bubble stays "Delivered", never "Read". The thread opens with Messages' own
// "iMessage / Today 13:14" header; consecutive bubbles group, the tail on the
// last. What the participant sends from the input bar is one more blue bubble,
// in order with the lines. A line marked bold is set in bold.
//
// The glyphs (back, video, plus, mic, send, chevron) are drawn here to the
// iOS 18 Messages frames, not downloaded.

const SEND_LIMIT = 80;

function Glyph({ name }: { name: "back" | "video" | "plus" | "mic" | "send" | "chevron" }) {
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 21" width="12" height="21"><path d="M10.5 1.5 1.8 10.5l8.7 9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "video":
      return <svg aria-hidden="true" viewBox="0 0 30 20" width="30" height="20"><rect x="1.2" y="2.2" width="19" height="15.6" rx="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m21.6 8 6.4-4.1v12.2L21.6 12Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path d="M8 1.5v13M1.5 8h13" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 14 20" width="14" height="20"><rect x="3.6" y="1" width="6.8" height="11.6" rx="3.4" fill="currentColor" /><path d="M1 9.4a6 6 0 0 0 12 0M7 15.4V19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 28 28" width="28" height="28"><circle cx="14" cy="14" r="14" fill="currentColor" /><path d="M14 20.5V8M8.8 13 14 7.8l5.2 5.2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "chevron":
      return <svg aria-hidden="true" viewBox="0 0 6 10" width="6" height="10"><path d="m1 1 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

function MessagesState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // The sung lines and whatever the participant sends, in the order sent: all hers.
  const rows = useMemo(
    () =>
      [
        ...lines.map((line) => ({ at: line.cueIndex, key: `l${line.cueIndex}`, text: line.text, bold: Boolean(line.bold) })),
        ...replies.map((reply) => ({ at: reply.afterCue + 0.5, key: `r${reply.id}`, text: reply.text, bold: false })),
      ].sort((a, b) => a.at - b.at),
    [replies, lines],
  );
  const firstMs = lines[0]?.startMs ?? 0;

  // The thread keeps its newest message in view, as Messages does.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
  }, [rows, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`Messages with ${contact.name}`} inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Glyph name="back" />
          <span className={styles.backCount}>{12 + (seat % 7)}</span>
        </span>
        <span className={styles.contact}>
          <span className={styles.avatar} aria-hidden="true" style={{ background: contact.tint }}>{contact.initials}</span>
          <span className={styles.contactName}>
            {contact.name}
            <Glyph name="chevron" />
          </span>
        </span>
        <span className={styles.video}>
          <Glyph name="video" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          {rows.length ? (
            <p className={styles.stamp}>
              <b>iMessage</b>
              <br />
              <b>Today</b> {formatSongClock(firstMs)}
            </p>
          ) : null}
          {rows.map((row, index) => {
            const last = index === rows.length - 1;
            return (
              <div key={row.key} className={styles.outgoing}>
                <p data-lyric className={styles.bubble} data-side="out" data-tail={last || undefined} style={row.bold ? { fontWeight: 700 } : undefined}>
                  {row.text}
                </p>
                {last ? <span className={styles.receipt}>Delivered</span> : null}
              </div>
            );
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.plus} aria-label="Apps" tabIndex={-1}>
          <Glyph name="plus" />
        </button>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Message {contact.name}</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="iMessage"
            enterKeyHint="send"
            autoComplete="off"
          />
          {draft.trim() ? (
            <button type="submit" className={styles.send} aria-label="Send">
              <Glyph name="send" />
            </button>
          ) : (
            <span className={styles.mic} aria-hidden="true">
              <Glyph name="mic" />
            </span>
          )}
        </label>
      </form>
    </section>
  );
}

export default memo(MessagesState);
