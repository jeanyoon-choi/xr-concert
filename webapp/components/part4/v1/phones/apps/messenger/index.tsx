"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../clock/wall-clock";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./messenger.module.css";
import { follow } from "../follow";

// Messenger for iOS, light, one chat with the ex, new: nothing above the
// first message but the profile block Messenger opens a conversation with.
// Every sung line is a message this phone's owner sends — her own gradient
// bubbles, one after another, each filling as it is typed — and they stay
// sent. The ex never answers and never opens them: the last bubble keeps the
// small grey "delivered" check, never his seen avatar. What the participant
// sends from the composer is one more bubble, in order with the lines. A line
// marked bold is set in bold.
//
// Sources: Messenger iOS chat chrome (header, composer's +, camera, gallery,
// mic, "Aa", emoji and like; 18 pt bubbles grouped by 4 pt inner corners;
// the filled grey delivered check beside the last sent message; the centred
// profile block of a new chat). The outgoing bubble is the default theme's
// gradient laid over the whole screen and seen through each bubble, so a
// bubble shifts from purple at the top to blue at the bottom as it scrolls,
// as Messenger does; the endpoint colours are measured by eye from the app,
// Facebook publishes no spec for them. Logo-free; every glyph, the delivered
// check included, is redrawn here on Messenger's 24 pt grid, not downloaded.

const SEND_LIMIT = 80;

type GlyphName = "back" | "phone" | "video" | "plus" | "camera" | "gallery" | "mic" | "emoji" | "like" | "send" | "expand";

function Glyph({ name }: { name: GlyphName }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28"><path d="m15 4.5-7.5 7.5 7.5 7.5" {...stroke} strokeWidth={2.4} /></svg>;
    case "phone":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M7.1 2.6c.6-.2 1.3.1 1.6.7l1.6 3.5c.3.6.1 1.3-.4 1.7L8.4 9.7a12.6 12.6 0 0 0 5.9 5.9l1.2-1.5c.4-.5 1.1-.7 1.7-.4l3.5 1.6c.6.3.9 1 .7 1.6l-.7 2.6c-.2.8-1 1.4-1.8 1.3C10 20.2 3.8 14 3.2 5.1c-.1-.8.5-1.6 1.3-1.8Z" /></svg>;
    case "video":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M2 7.8A2.8 2.8 0 0 1 4.8 5h8.4A2.8 2.8 0 0 1 16 7.8v8.4a2.8 2.8 0 0 1-2.8 2.8H4.8A2.8 2.8 0 0 1 2 16.2Zm15.5 2.1 3-2.4c.7-.6 1.5-.1 1.5.8v7.4c0 .9-.8 1.4-1.5.8l-3-2.4Z" /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="M12 7.5v9M7.5 12h9" stroke="#fff" strokeWidth={2} strokeLinecap="round" /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M9.2 3.5h5.6c.6 0 1.1.3 1.4.8l1 1.7h2.3A2.5 2.5 0 0 1 22 8.5v9.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18V8.5A2.5 2.5 0 0 1 4.5 6h2.3l1-1.7c.3-.5.8-.8 1.4-.8ZM12 17.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /></svg>;
    case "gallery":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" fillRule="evenodd" d="M5 3h14a2.5 2.5 0 0 1 2.5 2.5v13A2.5 2.5 0 0 1 19 21H5a2.5 2.5 0 0 1-2.5-2.5v-13A2.5 2.5 0 0 1 5 3Zm3.5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-4 8.2c0 .4.3.8.8.8h13.4c.4 0 .8-.4.8-.8v-2.6l-4.2-4.4a1 1 0 0 0-1.5 0L10 15.4l-1.8-1.8a1 1 0 0 0-1.4 0l-2.3 2.3Z" /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect x="8" y="2" width="8" height="13" rx="4" fill="currentColor" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" {...stroke} /></svg>;
    case "emoji":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" fillRule="evenodd" d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm-3.4 6.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm6.8 0a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Zm-8 5.1a.8.8 0 0 0-.7 1.1 5.7 5.7 0 0 0 10.6 0 .8.8 0 0 0-.7-1.1Z" /></svg>;
    case "like":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M2 11.2C2 10.5 2.5 10 3.2 10h2.3c.7 0 1.2.5 1.2 1.2v8.6c0 .7-.5 1.2-1.2 1.2H3.2C2.5 21 2 20.5 2 19.8Zm6.2 8.9V10.8l3.4-6.9a1.6 1.6 0 0 1 3 1l-.8 4.6h5.5a2.4 2.4 0 0 1 2.3 3l-1.8 6.4a2.6 2.6 0 0 1-2.5 2H9.4c-.7 0-1.2-.4-1.2-.8Z" /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="26" height="26"><path fill="currentColor" d="M3.4 3.2c-.6-.3-1.3.3-1 1l2.6 6.4c.1.3.4.5.7.5l8 .9-8 .9a.8.8 0 0 0-.7.5l-2.6 6.4c-.3.7.4 1.3 1 1l17.7-8.3c.6-.3.6-1.1 0-1.4Z" /></svg>;
    case "expand":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m9 5.5 6.5 6.5L9 18.5" {...stroke} strokeWidth={2.4} /></svg>;
  }
}

function MessengerState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // The sung lines and whatever the participant sends, in the order sent: all hers, all kept.
  const rows = useMemo(
    () =>
      [
        ...lines.map((line) => ({ at: line.cueIndex, key: `l${line.cueIndex}`, text: line.text, bold: Boolean(line.bold) })),
        ...replies.map((reply) => ({ at: reply.afterCue + 0.5, key: `r${reply.id}`, text: reply.text, bold: false })),
      ].sort((a, b) => a.at - b.at),
    [lines, replies],
  );
  const firstMs = lines[0]?.startMs ?? 0;

  // The gradient belongs to the screen: each outgoing bubble shows the slice behind it.
  // Measured on the glass (390 × 844) and divided by the lyric scale, which zooms a bubble and its background with it.
  const paint = useCallback(() => {
    const thread = threadRef.current;
    const glass = thread?.parentElement?.getBoundingClientRect();
    if (!thread || !glass || glass.height === 0) return;
    const scale = Number.parseFloat(getComputedStyle(thread).getPropertyValue("--lyric-scale")) || 1;
    for (const bubble of thread.querySelectorAll<HTMLElement>("[data-gradient]")) {
      const top = ((bubble.getBoundingClientRect().top - glass.top) / glass.height) * 844;
      bubble.style.backgroundSize = `${390 / scale}px ${844 / scale}px`;
      bubble.style.backgroundPosition = `0 ${-top / scale}px`;
    }
  }, []);

  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
    paint();
  }, [rows, shown, reducedMotion, paint]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`Messenger chat with ${contact.name}`} inert={!shown}>
      <header className={styles.header}>
        <span className={styles.back}>
          <Glyph name="back" />
        </span>
        <span className={styles.person}>
          <span className={styles.avatar} aria-hidden="true" style={{ background: contact.tint }}>
            {contact.initials}
            <span className={styles.active} />
          </span>
          <span className={styles.who}>
            <span className={styles.name}>{contact.name}</span>
            <span className={styles.status}>Active now</span>
          </span>
        </span>
        <span className={styles.calls}>
          <Glyph name="phone" />
          <Glyph name="video" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} onScroll={paint}>
        <div className={styles.rows}>
          <div className={styles.identity}>
            <span className={styles.identityAvatar} aria-hidden="true" style={{ background: contact.tint }}>
              {contact.initials}
            </span>
            <strong>{contact.name}</strong>
            <small>Facebook</small>
            <small>You&apos;re friends on Facebook</small>
          </div>
          {rows.length ? <p className={styles.stamp}>Today at {formatSongClock(firstMs)}</p> : null}
          {rows.map((row, index) => {
            const last = index === rows.length - 1;
            return (
              <p
                data-lyric
                key={row.key}
                className={styles.bubble}
                data-side="out"
                data-gradient
                data-above={index > 0 || undefined}
                data-below={!last || undefined}
                style={row.bold ? { fontWeight: 700 } : undefined}
              >
                {row.text}
              </p>
            );
          })}
          {rows.length ? (
            <span className={styles.delivered} role="img" aria-label="Delivered">
              <svg aria-hidden="true" viewBox="0 0 14 14" width="14" height="14">
                <circle cx="7" cy="7" r="7" fill="currentColor" />
                <path d="m3.9 7.2 2.2 2.2 4-4.4" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          ) : null}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send} data-typing={draft ? "" : undefined}>
        {draft ? (
          <span className={styles.tool} aria-hidden="true">
            <Glyph name="expand" />
          </span>
        ) : (
          <>
            <span className={styles.tool} aria-hidden="true"><Glyph name="plus" /></span>
            <span className={styles.tool} aria-hidden="true"><Glyph name="camera" /></span>
            <span className={styles.tool} aria-hidden="true"><Glyph name="gallery" /></span>
            <span className={styles.tool} aria-hidden="true"><Glyph name="mic" /></span>
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
          <span className={styles.emoji} aria-hidden="true">
            <Glyph name="emoji" />
          </span>
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.like} aria-label="Send">
            <Glyph name="send" />
          </button>
        ) : (
          <span className={styles.like} aria-hidden="true">
            <Glyph name="like" />
          </span>
        )}
      </form>
    </section>
  );
}

export default memo(MessengerState);
