"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { PhoneStateProps } from "../types";
import styles from "./character-ai.module.css";
import { follow } from "../follow";

// The Character.AI iOS app, dark (its default), one chat open with a
// character another user made: “Ezra — your ex. still has your hoodie.”
// She is talking to a role-played ex, and the role-play speaks the song:
// every sung line is the character's next message, streamed character by
// character, with its avatar and name; under the latest one, once it is
// written, the rating stars and the swipe-for-another-reply arrow. The
// composer is real: what the participant sends lands as her own bubble on
// the right after the line it followed.
//
// Sources: layout follows the current Character.AI iOS chat — the
// creator header (avatar, name, “By @creator”), per-message avatar + name +
// “c.ai” tag, *asterisk actions* in italic grey, the “This is A.I. and not a
// real person…” notice over the “Message <name>…” composer. Character.AI
// publishes no icon set or press kit glyphs, so the chrome glyphs are drawn
// on a 24 pt grid at a 1.8 pt stroke matching the app by eye. The character's
// avatar is an abstract illustrated placeholder, not a photo.

const SEND_LIMIT = 120;
const CHARACTER = { name: "Ezra", creator: "@midnightdrafts", tagline: "your ex. still has your hoodie." } as const;

type GlyphName = "back" | "call" | "more" | "star" | "swipe" | "send" | "mic";

function Glyph({ name }: { name: GlyphName }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M15 5 8 12l7 7" {...stroke} strokeWidth={2.2} /></svg>;
    case "call":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5.2 3.5h3.1l1.6 4.2-2.1 1.4a10.6 10.6 0 0 0 7.1 7.1l1.4-2.1 4.2 1.6v3.1a1.9 1.9 0 0 1-2 1.9A16.2 16.2 0 0 1 3.3 5.5a1.9 1.9 0 0 1 1.9-2Z" {...stroke} /></svg>;
    case "more":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><circle cx="5" cy="12" r="1.7" fill="currentColor" /><circle cx="12" cy="12" r="1.7" fill="currentColor" /><circle cx="19" cy="12" r="1.7" fill="currentColor" /></svg>;
    case "star":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z" {...stroke} strokeWidth={1.6} /></svg>;
    case "swipe":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="m9 5 7 7-7 7" {...stroke} strokeWidth={2} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M12 19V5.5M6 11.5l6-6 6 6" {...stroke} strokeWidth={2.4} /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><rect x="9" y="3" width="6" height="11" rx="3" {...stroke} /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...stroke} /></svg>;
  }
}

/** The character's avatar: an illustrated, abstract figure, flat tones only. */
function Avatar({ size }: { size: number }) {
  return (
    <svg className={styles.avatar} aria-hidden="true" viewBox="0 0 64 64" width={size} height={size}>
      <rect width="64" height="64" fill="#3a3346" />
      <circle cx="49" cy="15" r="9" fill="#5b4f6e" />
      <path d="M12 64c1.5-13 10-20.5 20-20.5S50.5 51 52 64Z" fill="#c9a98f" />
      <path d="M12 64c1.5-13 10-20.5 20-20.5 3.2 0 6.2.8 8.8 2.2L30 64Z" fill="#1e1b24" />
      <circle cx="32" cy="29" r="11" fill="#e2c3a6" />
      <path d="M20.6 28.4c-.6-8 4.6-13.4 11.6-13.4 7.4 0 12 5.2 11.2 12.6-3.6-.4-7.6-2.6-10-6-2.6 4-7.6 6.4-12.8 6.8Z" fill="#1e1b24" />
    </svg>
  );
}

/** Character.AI sets *actions* in italic grey, as the narration between speech. */
function Styled({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  text.split(/(\*[^*]+\*)/g).forEach((part, index) => {
    if (!part) return;
    parts.push(
      part.startsWith("*") && part.endsWith("*") && part.length > 2 ? (
        <em key={index} className={styles.action}>
          {part.slice(1, -1)}
        </em>
      ) : (
        part
      ),
    );
  });
  return <>{parts}</>;
}

/** The chat before the song: the character's greeting and a few turns. */
const PRIOR: readonly { from: "char" | "me"; text: string }[] = [
  { from: "char", text: "*leans in the doorway, keys still in hand* You kept the hoodie. Of course you did." },
  { from: "me", text: "it's just a hoodie" },
  { from: "char", text: "*laughs softly* Sure. And you're just here to talk." },
  { from: "me", text: "why do i keep coming back to this" },
];

type Row =
  | { kind: "char"; key: string; text: string; streaming: boolean }
  | { kind: "me"; key: string; text: string };

function CharacterAiState({ lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const entries: { at: number; row: Row }[] = PRIOR.map((message, index) => ({
      at: -100 + index,
      row: message.from === "char" ? { kind: "char", key: `p${index}`, text: message.text, streaming: false } : { kind: "me", key: `p${index}`, text: message.text },
    }));
    for (const line of lines) entries.push({ at: line.cueIndex, row: { kind: "char", key: `l${line.cueIndex}`, text: line.text, streaming: line.current } });
    for (const reply of replies) entries.push({ at: reply.afterCue + 0.5, row: { kind: "me", key: `r${reply.id}`, text: reply.text } });
    return entries.sort((a, b) => a.at - b.at).map((entry) => entry.row);
  }, [lines, replies]);

  let latestChar = -1;
  rows.forEach((row, index) => {
    if (row.kind === "char") latestChar = index;
  });

  // The chat keeps its newest message in view, as the app does while a reply streams.
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
    <section className={styles.app} aria-label="Character.AI" inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.icon}>
          <Glyph name="back" />
        </span>
        <span className={styles.who}>
          <Avatar size={36} />
          <span className={styles.whoText}>
            <span className={styles.whoName}>{CHARACTER.name}</span>
            <span className={styles.whoBy}>By {CHARACTER.creator}</span>
          </span>
        </span>
        <span className={styles.icon}>
          <Glyph name="call" />
        </span>
        <span className={styles.icon}>
          <Glyph name="more" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread}>
        <div className={styles.messages}>
          <div className={styles.intro}>
            <Avatar size={72} />
            <p className={styles.introName}>{CHARACTER.name}</p>
            <p className={styles.introTagline}>{CHARACTER.tagline}</p>
            <p className={styles.introBy}>By {CHARACTER.creator}</p>
          </div>
          {rows.map((row, index) =>
            row.kind === "me" ? (
              <p key={row.key} className={styles.me}>
                <Styled text={row.text} />
              </p>
            ) : (
              <div key={row.key} className={styles.char}>
                <Avatar size={28} />
                <div className={styles.charBody}>
                  <p className={styles.charName}>
                    {CHARACTER.name}
                    <span className={styles.tag}>c.ai</span>
                  </p>
                  <div className={styles.charRow}>
                    <p className={styles.bubble} data-streaming={row.streaming || undefined}>
                      <Styled text={row.text} />
                    </p>
                    {index === latestChar && !row.streaming ? (
                      <span className={styles.swipe} aria-hidden="true">
                        <Glyph name="swipe" />
                      </span>
                    ) : null}
                  </div>
                  {index === latestChar && !row.streaming ? (
                    <div className={styles.rating} aria-hidden="true">
                      <Glyph name="star" />
                      <Glyph name="star" />
                      <Glyph name="star" />
                      <Glyph name="star" />
                    </div>
                  ) : null}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <p className={styles.notice}>This is A.I. and not a real person. Treat everything it says as fiction</p>
        <div className={styles.box}>
          <label className={styles.field}>
            <span className={styles.visuallyHidden}>Message {CHARACTER.name}</span>
            <input
              value={draft}
              maxLength={SEND_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Message ${CHARACTER.name}...`}
              enterKeyHint="send"
              autoComplete="off"
            />
          </label>
          {draft.trim() ? (
            <button type="submit" className={styles.send} aria-label="Send message">
              <Glyph name="send" />
            </button>
          ) : (
            <span className={styles.tool} aria-hidden="true">
              <Glyph name="mic" />
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

export default memo(CharacterAiState);
