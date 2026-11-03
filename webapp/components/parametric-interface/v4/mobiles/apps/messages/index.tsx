"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./messages.module.css";

// iOS Messages, one thread per seat with that seat's contact. As in v2/7,
// the lyric is the other person double texting: each sung line arrives as
// its own incoming bubble and fills word by word while it is sung. The input
// bar is real: what the participant sends lands as an outgoing bubble after
// the line it answered, and stays in the thread.

type Row =
  | { kind: "in"; key: string; text: string; tail: boolean; arriving: boolean }
  | { kind: "out"; key: string; text: string; tail: boolean; receipt: boolean };

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

  // Lines and replies merged in order: a reply sits after the line it followed.
  const rows = useMemo(() => {
    const merged: ({ at: number; kind: "in"; text: string; key: string } | { at: number; kind: "out"; text: string; key: string })[] = [
      ...lines.map((line) => ({ at: line.cueIndex, kind: "in" as const, text: line.text, key: `l${line.cueIndex}` })),
      ...replies.map((reply) => ({ at: reply.afterCue + 0.5, kind: "out" as const, text: reply.text, key: `r${reply.id}` })),
    ].sort((a, b) => a.at - b.at);
    const lastLineKey = lines.at(-1) ? `l${lines.at(-1)!.cueIndex}` : null;
    const lastReplyKey = replies.at(-1) ? `r${replies.at(-1)!.id}` : null;

    return merged.map((entry, index): Row => {
      const next = merged[index + 1];
      if (entry.kind === "in") {
        return { kind: "in", key: entry.key, text: entry.text, tail: !next || next.kind !== "in", arriving: entry.key === lastLineKey };
      }
      return { kind: "out", key: entry.key, text: entry.text, tail: !next || next.kind !== "out", receipt: entry.key === lastReplyKey };
    });
  }, [replies, lines]);

  // The thread keeps its newest message in view, as Messages does.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
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
          <p className={styles.stamp}>
            <b>Yesterday</b> 23:48
          </p>
          <p className={styles.bubble} data-side="in">are you still up</p>
          <p className={styles.bubble} data-side="in" data-tail>
            can we talk
          </p>
          <p className={styles.bubble} data-side="out" data-tail>
            Not tonight.
          </p>
          <span className={styles.receipt}>Read 23:52</span>
          {lines.length ? (
            <p className={styles.stamp}>
              <b>Today</b> {formatSongClock(lines[0]!.startMs)}
            </p>
          ) : null}
          {rows.map((row) =>
            row.kind === "in" ? (
              <p key={row.key} className={styles.bubble} data-side="in" data-tail={row.tail || undefined} data-arriving={row.arriving || undefined}>
                {row.text}
              </p>
            ) : (
              <div key={row.key} className={styles.outgoing}>
                <p className={styles.bubble} data-side="out" data-tail={row.tail || undefined}>
                  {row.text}
                </p>
                {row.receipt ? <span className={styles.receipt}>Delivered</span> : null}
              </div>
            ),
          )}
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
