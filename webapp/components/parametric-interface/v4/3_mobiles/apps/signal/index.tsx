"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./signal.module.css";
import { follow } from "../follow";

// Signal for iOS, light, a 1:1 chat with the seat's ex, disappearing messages
// on (30 seconds). The lyric is what the ex says and cannot leave behind:
// each sung line is an incoming message with Signal's countdown timer in its
// footer, the timer draining as later lines arrive; a line two lines old has
// disappeared from the chat, as Signal deletes it. What the participant sends
// disappears the same way. Before the song the chat holds only what a
// disappearing chat keeps: the date and the timer system row.
//
// Sources (fetched 2026-11-03 from github.com/signalapp/Signal-iOS, main):
// every glyph is Signal's own Symbols.xcassets template PDF, converted to SVG
// path-for-path (chevron-left-bold-28, video, phone, timer-compact, timer,
// plus, sticker, camera, mic, arrow-up, messagetimer-00…60,
// messagestatus-delivered/read). Metrics and copy from the same source:
// ConversationHeaderView (title 17 semibold, subtitle 13 medium = timer16 +
// thin space + "30s", avatar 36, spacing 8), ConversationStyle (gutters 16,
// incoming bubble #E9E9E9, outgoing "ultramarine" gradient #0552F0→#2C6BED,
// outgoing secondary text white 80 %), ConversationInputToolbar (toolbar 56,
// text box 40, placeholder "Message"), MessageTimerUpdater (12 quantised
// levels over the interval), en.lproj strings ("%@ set disappearing message
// time to %@."). Bubble radius 18 / clustered corner 4 and footer 12 pt follow
// the iOS app and are not measured from a capture. Layout is the pre–iOS 26
// (non-glass) navigation bar.

const SEND_LIMIT = 80;
const PREFIX = "/parametric-interface/v4/apps/signal";
/** The disappearing timer, seconds. */
const TIMER_S = 30;
/** Lines still in the chat: the one being sung and the two before it. */
const KEEP = 3;

type Entry =
  | { kind: "in"; key: string; text: string; time: string; at: number; timer: number; arriving: boolean }
  | { kind: "out"; key: string; text: string; time: string; at: number; timer: number; read: boolean };

type Row = Entry & { first: boolean; last: boolean };

function Icon({ name, className }: { name: string; className: string }) {
  return <span aria-hidden="true" className={className} style={{ ["--src" as string]: `url(${PREFIX}/${name}.svg)` }} />;
}

/** Signal's quantised timer: 12 = just started, 0 = about to go. */
function timerLevel(startMs: number, nowMs: number) {
  const left = TIMER_S * 1000 - Math.max(0, nowMs - startMs);
  const step = (TIMER_S * 1000) / 12;
  return Math.max(1, Math.min(12, Math.floor((left + step / 2) / step)));
}

function timerIcon(level: number) {
  return `messagetimer-${String(level * 5).padStart(2, "0")}`;
}

function SignalState({ seat, lines, replies, clock, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const kept = lines.slice(-KEEP);
    const last = lines.at(-1);
    const nowMs = last ? last.startMs : 0;
    const oldest = kept[0]?.cueIndex ?? -Infinity;
    const startOf = new Map(lines.map((line) => [line.cueIndex, line.startMs]));
    const entries: Entry[] = [
      ...kept.map((line): Entry => ({
        kind: "in",
        key: `l${line.cueIndex}`,
        text: line.text,
        time: formatSongClock(line.startMs),
        at: line.cueIndex,
        timer: timerLevel(line.startMs, nowMs),
        arriving: line.cueIndex === last?.cueIndex,
      })),
      // A reply disappears with the line it answered.
      ...replies
        .filter((reply) => reply.afterCue >= oldest)
        .slice(-8)
        .map((reply): Entry => {
          const startMs = startOf.get(reply.afterCue);
          return {
            kind: "out",
            key: `r${reply.id}`,
            text: reply.text,
            time: startMs === undefined ? clock : formatSongClock(startMs),
            at: reply.afterCue + 0.5,
            timer: startMs === undefined ? 12 : timerLevel(startMs, nowMs),
            read: lines.some((line) => line.cueIndex > reply.afterCue),
          };
        }),
    ].sort((a, b) => a.at - b.at);

    return entries.map((entry, index): Row => ({
      ...entry,
      first: entries[index - 1]?.kind !== entry.kind,
      last: entries[index + 1]?.kind !== entry.kind,
    }));
  }, [lines, replies, clock]);

  // The chat keeps its newest message in view, as Signal does.
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
    <section className={styles.app} aria-label={`Signal chat with ${contact.name}`} inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Icon name="chevron-left-bold-28" className={styles.chevron} />
        </span>
        <span className={styles.peer}>
          <span className={styles.avatar} aria-hidden="true">{contact.initials}</span>
          <span className={styles.peerText}>
            <span className={styles.peerName}>{contact.name}</span>
            <span className={styles.peerStatus}>
              <Icon name="timer-compact" className={styles.timer16} />
              {" "}
              {TIMER_S}s
            </span>
          </span>
        </span>
        <span className={styles.calls}>
          <Icon name="video" className={styles.navIcon} />
          <Icon name="phone" className={styles.navIcon} />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          <p className={styles.date}>Today</p>
          <p className={styles.system}>
            <Icon name="timer" className={styles.systemIcon} />
            {contact.name} set disappearing message time to {TIMER_S} seconds.
          </p>
          {rows.map((row) => (
            <div
              key={row.key}
              className={styles.bubble}
              data-side={row.kind}
              data-first={row.first || undefined}
              data-last={row.last || undefined}
              data-arriving={(row.kind === "in" && row.arriving) || undefined}
            >
              <span className={styles.body}>{row.text}</span>
              <span className={styles.footer}>
                {row.time}
                <Icon name={timerIcon(row.timer)} className={styles.messageTimer} />
                {row.kind === "out" ? <Icon name={row.read ? "messagestatus-read" : "messagestatus-delivered"} className={styles.status} /> : null}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.attach} aria-label="Attachments" tabIndex={-1}>
          <Icon name="plus" className={styles.toolIcon} />
        </button>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Message {contact.name}</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message"
            enterKeyHint="send"
            autoComplete="off"
          />
          <Icon name="sticker" className={styles.sticker} />
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.send} aria-label="Send">
            <Icon name="arrow-up" className={styles.sendArrow} />
          </button>
        ) : (
          <span className={styles.media} aria-hidden="true">
            <Icon name="camera" className={styles.toolIcon} />
            <Icon name="mic" className={styles.toolIcon} />
          </span>
        )}
      </form>
    </section>
  );
}

export default memo(SignalState);
