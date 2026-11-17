"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { dateLabel, formatSongClock } from "../../../clock/wall-clock";
import { follow } from "../follow";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./kakaotalk.module.css";

// KakaoTalk (iOS, 기본 테마, light), a 1:1 room with the ex, empty until the
// song. Every sung line is a message this phone's owner sends — her own
// yellow bubbles, one after another, each filling as it is typed — and the
// ex never answers: every bubble keeps its unread "1". In KakaoTalk's
// English setting: "1:14 PM" stamps and a "Tuesday, November 17, 2026" date
// line.
//
// Sources: layout, colours and metrics from current KakaoTalk iOS chat-room
// frames (room background #BACEE0, own bubble #FEE500, yellow unread digits,
// date pill with calendar glyph, composer + / field / emoji / #). Kakao
// publishes no in-app icon set, so the bar glyphs are drawn to those frames,
// not downloaded.

const SEND_LIMIT = 80;

const TODAY = dateLabel("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

/** "13:14" → "1:14 PM", KakaoTalk's English stamp. */
function englishStamp(clock: string) {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function Glyph({ name }: { name: "back" | "search" | "menu" | "calendar" | "plus" | "emoji" | "hash" | "send" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 20" width="12" height="20"><path d="M10 1.5 1.8 10l8.2 8.5" {...stroke} strokeWidth={2} /></svg>;
    case "search":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="10.5" cy="10.5" r="7" {...stroke} strokeWidth={1.8} /><path d="m15.6 15.6 5.4 5.4" {...stroke} strokeWidth={1.8} /></svg>;
    case "menu":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 5.5h17M3.5 12h17M3.5 18.5h17" {...stroke} strokeWidth={1.8} /></svg>;
    case "calendar":
      return <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11"><rect x="1" y="2" width="10" height="9" rx="1.6" {...stroke} strokeWidth={1.1} /><path d="M1 4.8h10M3.8 1v2M8.2 1v2" {...stroke} strokeWidth={1.1} /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M12 3.5v17M3.5 12h17" {...stroke} strokeWidth={1.7} /></svg>;
    case "emoji":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9.2" {...stroke} strokeWidth={1.6} /><circle cx="8.9" cy="10" r="1.15" fill="currentColor" /><circle cx="15.1" cy="10" r="1.15" fill="currentColor" /><path d="M8.2 14.2a4.4 4.4 0 0 0 7.6 0" {...stroke} strokeWidth={1.6} /></svg>;
    case "hash":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M9.6 3.5 7.8 20.5M16.2 3.5l-1.8 17M4.2 8.6h16M3.6 15.4h16" {...stroke} strokeWidth={1.7} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M10 16V4.4M4.8 9.4 10 4.2l5.2 5.2" {...stroke} strokeWidth={2.1} /></svg>;
  }
}


function Meta({ unread, time, side }: { unread: number; time: string; side: "in" | "out" }) {
  return (
    <span className={styles.meta} data-side={side}>
      {unread > 0 ? <span className={styles.unread}>{unread}</span> : null}
      <span className={styles.time}>{time}</span>
    </span>
  );
}


function KakaoTalkState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const ex = contactFor(seat).name;
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // The sung lines and whatever the participant sends, in the order sent.
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
      ].sort((x, y) => x.at - y.at),
    [lines, replies],
  );

  // The room keeps its newest message in view, as KakaoTalk does.
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
    <section className={styles.app} aria-label={`KakaoTalk, ${ex}`} inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.back}>
          <Glyph name="back" />
        </span>
        <span className={styles.title}>{ex}</span>
        <span className={styles.actions}>
          <Glyph name="search" />
          <Glyph name="menu" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          {entries.length > 0 ? (
            <p className={styles.date}>
              <Glyph name="calendar" />
              {TODAY}
            </p>
          ) : null}

          {entries.map((entry, index) => {
            // As KakaoTalk does: messages sent in the same minute share one stamp, on the last of them.
            const time = englishStamp(formatSongClock(entry.startMs));
            const next = entries[index + 1];
            const stamped = !next || englishStamp(formatSongClock(next.startMs)) !== time;
            return (
            <div key={entry.key} className={styles.outgoing} data-follow={index > 0 || undefined}>
              <div className={styles.line} data-side="out">
                <Meta unread={1} time={stamped ? time : ""} side="out" />
                <p data-lyric className={styles.bubble} data-side="out" data-head={index === 0 || undefined} style={entry.bold ? { fontWeight: 700 } : undefined}>
                  {entry.text}
                </p>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.plus} aria-label="More" tabIndex={-1}>
          <Glyph name="plus" />
        </button>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Message</span>
          <input value={draft} maxLength={SEND_LIMIT} onChange={(event) => setDraft(event.target.value)} enterKeyHint="send" autoComplete="off" />
          <span className={styles.emoji} aria-hidden="true">
            <Glyph name="emoji" />
          </span>
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.send} aria-label="Send">
            <Glyph name="send" />
          </button>
        ) : (
          <span className={styles.hash} aria-hidden="true">
            <Glyph name="hash" />
          </span>
        )}
      </form>
    </section>
  );
}

export default memo(KakaoTalkState);
