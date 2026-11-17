"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { dateLabel, formatSongClock } from "../../../clock/wall-clock";
import { follow } from "../follow";
import { contactFor, type PhoneStateProps } from "../types";
import { Glyph, Meta } from ".";
import styles from "./kakaotalk.module.css";

// KakaoTalk, a 1:1 room with the ex, empty until the song. Every sung line
// is a message this phone's owner sends — her own yellow bubbles, one after
// another, each filling as it is typed — and the ex never answers: every
// bubble keeps its unread "1". Same frame, colours and metrics as the group
// room (./index.tsx), in KakaoTalk's English setting: "1:14 PM" stamps and a
// "Tuesday, November 17, 2026" date line.

const SEND_LIMIT = 80;

/** A bubble set larger: type and bubble scaled together, kept on one line whatever the usual bubble width. */
const SCALED = (scale: number) => ({ zoom: scale, maxWidth: "none", whiteSpace: "nowrap" }) as const;
const TODAY = dateLabel("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

/** "13:14" → "1:14 PM", KakaoTalk's English stamp. */
function englishStamp(clock: string) {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function KakaoTalkDirectState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const ex = contactFor(seat).name;
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // The sung lines and whatever the participant sends, in the order sent.
  const entries = useMemo(
    () =>
      [
        ...lines.map((line) => ({ key: `l${line.cueIndex}`, at: line.cueIndex, text: line.text, startMs: line.startMs, scale: line.scale ?? 1 })),
        ...replies.map((reply) => ({
          key: `r${reply.id}`,
          at: reply.afterCue + 0.5,
          text: reply.text,
          startMs: lines.find((line) => line.cueIndex === reply.afterCue)?.startMs ?? 0,
          scale: 1,
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
                <p className={styles.bubble} data-side="out" data-head={index === 0 || undefined} style={entry.scale === 1 ? undefined : SCALED(entry.scale)}>
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

export default memo(KakaoTalkDirectState);
