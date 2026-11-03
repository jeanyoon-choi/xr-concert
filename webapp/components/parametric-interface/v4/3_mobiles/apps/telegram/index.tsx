"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { formatSongClock } from "../../../model/clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./telegram.module.css";
import { follow } from "../follow";

// Telegram for iOS, default ("Classic") theme, one private chat with the
// seat's ex. The lyric is Telegram's own move: a message edited in place.
// When a line starts the ex sends its first word, then edits that same
// message word by word as the line is sung, so it reads "edited" beside its
// time. The next line is a new message; the history is a column of edited
// messages. While a message is being edited the ex is "online". The input
// panel is real: what the participant sends lands as an outgoing bubble with
// one check, two once the ex starts on a later line.
//
// Sources, all from Telegram's open-source clients:
// - TelegramMessenger/Telegram-iOS (master): DefaultDayPresentationTheme.swift
//   (Classic: gradient 0xdbddbb/0x6ba587/0xd5d88d/0x88b884 under the default
//   pattern at intensity 50; incoming 0xffffff, outgoing 0xe1ffc7, stroke
//   black 0.2; date text 0x77828C / 0x008c09 @0.8; checks 0x19c700; accent
//   0x0088ff; nav 0xf2f2f2 @0.9, secondary 0x787878; input stroke black 0.1,
//   placeholder black 0.4), SoftwareGradientBackground.swift (the gradient,
//   rendered once to gradient.png with its exact weighting and swirl),
//   ChatMessageBubbleImages.swift (bubble: 16 pt corners, 8 pt merged, tail
//   from the 33 pt form: fill rect, quad curve, cut ellipse), ChatMessageItem-
//   Common.swift (compact: text insets 6.33/11/5.67/11, edge inset 3),
//   ChatMessageDateAndStatusNode.swift + PresentationThemeEssentialGraphics
//   .swift (11 pt date, "edited" label, 11 × 9 check paths, 6 pt check
//   offset), ChatTitleView.swift (17 pt semibold title, 13 pt subtitle),
//   PresentationResourcesChat.swift (33 pt send button paths), AvatarNode
//   .swift (avatar gradients), Images.xcassets (IconAttachment,
//   AccessoryIconStickers, IconMicrophone), NavigationBackArrowLight@2x.png.
// - Ajaxy/telegram-tt: src/assets/pattern.svg (the default wallpaper pattern).

const SEND_LIMIT = 80;

/** AvatarNode.gradientColors: [bottom, top]. */
const AVATAR_GRADIENTS = [
  ["#ff516a", "#ff885e"],
  ["#ffa85c", "#ffcd6a"],
  ["#665fff", "#82b1ff"],
  ["#54cb68", "#a0de7e"],
  ["#4acccd", "#00fcfd"],
  ["#2a9ef1", "#72d5fd"],
  ["#d669ed", "#e0a2f3"],
] as const;

type Entry =
  | { kind: "in"; key: string; text: string; time: string; at: number; edited: boolean }
  | { kind: "out"; key: string; text: string; time: string; at: number; read: boolean };

type Row = Entry & { first: boolean; last: boolean };

function TelegramState({ seat, lines, replies, clock, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const editing = Boolean(lines.at(-1)?.current);

  const rows = useMemo(() => {
    const startOf = new Map(lines.map((line) => [line.cueIndex, line.startMs]));
    const entries: Entry[] = [
      ...lines.map((line): Entry => ({
        kind: "in",
        key: `l${line.cueIndex}`,
        text: line.text,
        time: formatSongClock(line.startMs),
        at: line.cueIndex,
        // Sent as its first word; every word after is an edit.
        edited: line.sung > 1,
      })),
      ...replies.slice(-24).map((reply): Entry => {
        const startMs = startOf.get(reply.afterCue);
        return {
          kind: "out",
          key: `r${reply.id}`,
          text: reply.text,
          time: startMs === undefined ? clock : formatSongClock(startMs),
          at: reply.afterCue + 0.5,
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

  // The chat keeps its newest message in view, as Telegram does.
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

  const [bottom, top] = AVATAR_GRADIENTS[seat % AVATAR_GRADIENTS.length]!;

  return (
    <section className={styles.app} aria-label={`Telegram chat with ${contact.name}`} inert={!shown} data-reduced-motion={reducedMotion || undefined}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <span className={styles.backArrow} aria-hidden="true" />
          Chats
        </span>
        <span className={styles.title}>
          <span className={styles.titleName}>{contact.name}</span>
          <span className={styles.titleStatus} data-online={editing || undefined}>
            {editing ? "online" : "last seen recently"}
          </span>
        </span>
        <span className={styles.avatar} aria-hidden="true" style={{ background: `linear-gradient(to top, ${bottom}, ${top})` }}>
          {contact.initials}
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          <p className={styles.date}><span>Yesterday</span></p>
          <Bubble side="in" first last text="i didn't mean that" meta={<Meta time="22:14" edited />} />
          <Bubble side="out" first last text="You always say that." meta={<Meta time="22:31" status="read" />} />
          {lines.length ? <p className={styles.date}><span>Today</span></p> : null}
          {rows.map((row) => (
            <Bubble
              key={row.key}
              side={row.kind}
              first={row.first}
              last={row.last}
              text={row.text}
              meta={row.kind === "in" ? <Meta time={row.time} edited={row.edited} /> : <Meta time={row.time} status={row.read ? "read" : "sent"} />}
            />
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.attach} aria-label="Attach" tabIndex={-1}>
          <span className={styles.attachIcon} aria-hidden="true" />
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
          <span className={styles.stickerIcon} aria-hidden="true" />
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.send} aria-label="Send">
            <svg aria-hidden="true" viewBox="0 0 33 33" width="33" height="33">
              <circle cx="16.5" cy="16.5" r="16.5" fill="currentColor" />
              <g transform="translate(-0.33 0)">
                <path d="M11 14.667 16.431 9.4a.1.1 0 0 1 .138 0L22 14.667" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.5 9.333a1 1 0 0 1 1 1V24a1 1 0 0 1-2 0V10.333a1 1 0 0 1 1-1Z" fill="#fff" />
              </g>
            </svg>
          </button>
        ) : (
          <span className={styles.mic} aria-hidden="true">
            <span className={styles.micIcon} />
          </span>
        )}
      </form>
    </section>
  );
}

/**
 * A message bubble: 16 pt corners, 8 pt where it meets a neighbour from the
 * same side, and on the last of a run the tail drawn from Telegram's 33 pt
 * bubble form (fill rect + quad curve, cut by an ellipse), with its stroke.
 */
function Bubble({ side, first, last, text, meta }: { side: "in" | "out"; first: boolean; last: boolean; text: string; meta: ReactNode }) {
  return (
    <p className={styles.bubble} data-side={side} data-first={first || undefined} data-last={last || undefined}>
      {last ? (
        <svg className={styles.tail} aria-hidden="true" viewBox="16.5 15.5 23 18" width="23" height="18">
          <path d="M33 16v8.5a11.5 10.5 0 0 0 4.73 8.5h-.23q-7.7 0-11 -2.76" fill="none" stroke="rgb(0 0 0 / 0.2)" strokeWidth="1" />
          <path d="M16.5 16H33v8.5a11.5 10.5 0 0 0 4.73 8.5h-.23Q24 33 24 24.5h-7.5Z" fill="currentColor" />
        </svg>
      ) : null}
      {text}
      {meta}
    </p>
  );
}

/** Date (with "edited") and checks, bottom right; an invisible twin reserves their room on the last line. */
function Meta({ time, edited, status }: { time: string; edited?: boolean; status?: "sent" | "read" }) {
  const content = (
    <>
      {edited ? `edited ${time}` : time}
      {status ? (
        <svg className={styles.checks} aria-hidden="true" viewBox="0 0 18 9" width="18" height="9">
          <path d="M2 5l2.95 2.95a.06.06 0 0 0 .1 0L11.5 1" />
          {status === "read" ? <path d="M8.5 8 15 1" /> : null}
        </svg>
      ) : null}
    </>
  );
  return (
    <>
      <span className={styles.metaSpace} aria-hidden="true">{content}</span>
      <span className={styles.meta}>{content}</span>
    </>
  );
}

export default memo(TelegramState);
