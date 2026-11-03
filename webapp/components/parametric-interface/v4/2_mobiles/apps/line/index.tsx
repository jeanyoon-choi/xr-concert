"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import type { SungLine } from "../../../model/lines";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./line.module.css";
import { follow } from "../follow";

// LINE (iOS, English UI, light), a 1:1 chat with the ex. Here the phone's own
// side is the singer: the line being sung is typed into the composer word by
// word, and when the next line starts it is sent — a green bubble on the
// right, "Read" beside it at once. The ex answers rarely and briefly ("?",
// "what", "ok"), as a person does to a string of texts at night. The
// participant can type and send too; their messages are green bubbles after
// the line they followed.
//
// Sources: layout, colours and metrics from current LINE iOS chat frames
// (default chat background, white incoming bubbles with a round profile,
// green own bubbles with "Read" over the time, the + / camera / photo
// composer with the "Aa" field and smiley, mic → send). LINE publishes only
// its logo; the bar glyphs are drawn to those frames, not downloaded. The
// profile is a monogram rather than a photo.

const SEND_LIMIT = 80;

/** The ex's few replies, said after a sent line now and then. */
const EX_SAYS = ["?", "what", "ok", "lol what", "are you drunk", "stop", "…"] as const;

function exReplyAfter(cueIndex: number, seat: number) {
  if ((cueIndex * 7 + seat * 3) % 9 !== 4) return null;
  return EX_SAYS[(cueIndex + seat) % EX_SAYS.length]!;
}

/** "21:31" → "9:31 PM". */
function englishStamp(clock: string) {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

type Entry =
  | { kind: "out"; key: string; at: number; text: string; time: string }
  | { kind: "in"; key: string; at: number; text: string; time: string };

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
  const [focused, setFocused] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const typing: SungLine | undefined = lines.at(-1)?.current ? lines.at(-1) : undefined;
  const composing = focused || draft.length > 0;
  const lyricInField = !composing && typing ? typing.text : "";
  const hasText = composing ? draft.trim().length > 0 : lyricInField.length > 0;

  const entries = useMemo(() => {
    const list: Entry[] = [];
    for (const line of lines) {
      if (line.current) continue;
      const time = englishStamp(formatSongClock(line.startMs));
      list.push({ kind: "out", key: `l${line.cueIndex}`, at: line.cueIndex, text: line.full, time });
      const said = exReplyAfter(line.cueIndex, seat);
      if (said) list.push({ kind: "in", key: `x${line.cueIndex}`, at: line.cueIndex + 0.7, text: said, time });
    }
    for (const reply of replies) {
      const after = lines.find((line) => line.cueIndex === reply.afterCue);
      list.push({ kind: "out", key: `r${reply.id}`, at: reply.afterCue + 0.5, text: reply.text, time: englishStamp(formatSongClock(after?.startMs ?? 0)) });
    }
    return list.sort((a, b) => a.at - b.at);
  }, [lines, replies, seat]);

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
          <p className={styles.date}>Yesterday</p>
          <div className={styles.incoming}>
            <span className={styles.avatar} aria-hidden="true" style={{ background: contact.tint }}>{contact.initials}</span>
            <div className={styles.column}>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in" data-head>did you get the box</p>
              </div>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in">your stuff is all in there</p>
                <span className={styles.meta}><span>6:12 PM</span></span>
              </div>
            </div>
          </div>
          <div className={styles.line} data-side="out">
            <span className={styles.meta} data-side="out"><span>Read</span><span>6:40 PM</span></span>
            <p className={styles.bubble} data-side="out" data-head>yeah. thanks</p>
          </div>

          {lines.length ? <p className={styles.date}>Today</p> : null}

          {entries.map((entry, index) => {
            const previous = index > 0 ? entries[index - 1] : undefined;
            const head = previous?.kind !== entry.kind;
            if (entry.kind === "out") {
              return (
                <div key={entry.key} className={styles.line} data-side="out" data-follow={!head || undefined}>
                  <span className={styles.meta} data-side="out"><span>Read</span><span>{entry.time}</span></span>
                  <p className={styles.bubble} data-side="out" data-head={head || undefined} data-arriving={index === entries.length - 1 || undefined}>
                    {entry.text}
                  </p>
                </div>
              );
            }
            return (
              <div key={entry.key} className={styles.incoming}>
                <span className={styles.avatar} aria-hidden="true" style={{ background: contact.tint }}>{contact.initials}</span>
                <div className={styles.column}>
                  <div className={styles.line}>
                    <p className={styles.bubble} data-side="in" data-head>{entry.text}</p>
                    <span className={styles.meta}><span>{entry.time}</span></span>
                  </div>
                </div>
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
        <label className={styles.field} data-lyric={lyricInField ? true : undefined}>
          <span className={styles.visuallyHidden}>Message {contact.name}</span>
          {lyricInField ? <span className={styles.typed} aria-hidden="true">{lyricInField}</span> : null}
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={lyricInField ? "" : "Aa"}
            enterKeyHint="send"
            autoComplete="off"
          />
          <span className={styles.emoji} aria-hidden="true"><Glyph name="emoji" /></span>
        </label>
        {hasText ? (
          <button type="submit" className={styles.send} aria-label="Send" disabled={!composing}>
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
