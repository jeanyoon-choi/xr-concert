"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { SungLine } from "../../../song/lines";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./snapchat.module.css";
import { follow } from "../follow";

// Snapchat for iOS, light, the Chat screen with the seat's ex, empty until
// the song. Every sung line is a chat this phone's owner sends — under the
// red ME, on its red bar, one after another, each filling as it is typed —
// and they stay: each is saved in chat (Snapchat's grey ground behind a saved
// chat), so the lines sent so far can be read. The ex never answers or opens
// them: "Delivered" stands under the last one. What the participant sends
// from the composer is one more chat under ME, in order with the lines. A
// line marked bold is set in bold.
//
// The registry hands this state one line at a time, so the chat keeps the
// lines it has been given itself (KEPT of them), dropping them when the song
// is moved back or jumps.
//
// Sources: colours and type are Snap's own design tokens, published in
// github.com/Snapchat/Valdi_Widgets (valdi_modules/widgets/src/ColorSpec.ts,
// styles/TextStyleFont.ts; fetched 2026-11-03): ME = baseRedRegular #F23C57,
// friend = baseBlueRegular #0FADFF, snap red #F23C57, textPrimary #16191C,
// textSecondary #656D78, textTertiary #9A9FA7, backgroundObject
// rgba(0,0,0,0.05), body 16 regular, caption 12 bold, headline 18 bold.
// UNSURE: Snap publishes no app glyph set; the header and composer glyphs
// (back, phone, video, camera, mic, sticker) and the Delivered arrow are drawn
// here to match the iOS app and are not taken from served assets, and the
// layout metrics (the saved ground and the Delivered line included) are not
// measured from a capture.

const SEND_LIMIT = 80;

const KEPT = 24;

type Sent = Pick<SungLine, "cueIndex" | "full" | "bold">;

const sameCues = (a: readonly Sent[], b: readonly Sent[]) => a.length === b.length && a.every((line, index) => line.cueIndex === b[index]!.cueIndex);

function Glyph({ name }: { name: "back" | "phone" | "video" | "camera" | "mic" | "sticker" | "send" | "delivered" }) {
  switch (name) {
    case "delivered":
      return <svg aria-hidden="true" viewBox="0 0 14 14" width="13" height="13"><path d="M1.6 1.5 12.6 7 1.6 12.5 3.6 7Z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>;
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M15 4.5 7.5 12l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "phone":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M7.3 3.6c.5-.4 1.2-.3 1.6.2l2 2.7c.4.5.3 1.2-.1 1.6l-1.3 1.2c.9 2 2.4 3.6 4.4 4.6l1.3-1.3c.4-.4 1.1-.5 1.6-.1l2.7 2c.5.4.6 1.1.2 1.6l-1.2 1.6c-.6.8-1.6 1.1-2.6.8-5.3-1.6-9-5.3-10.6-10.6-.3-1 0-2 .8-2.6Z" fill="currentColor" /></svg>;
    case "video":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect x="2.5" y="6" width="13" height="12" rx="3" fill="currentColor" /><path d="m17 10.2 3.6-2.4c.6-.4 1.4 0 1.4.8v6.8c0 .8-.8 1.2-1.4.8L17 13.8Z" fill="currentColor" /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M8.6 5.2 9.5 3.9c.3-.4.7-.6 1.2-.6h2.6c.5 0 .9.2 1.2.6l.9 1.3h2.4A2.7 2.7 0 0 1 20.5 7.9v8.8a2.7 2.7 0 0 1-2.7 2.7H6.2a2.7 2.7 0 0 1-2.7-2.7V7.9a2.7 2.7 0 0 1 2.7-2.7Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="12" cy="12.3" r="3.6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><rect x="8.5" y="2.8" width="7" height="11.4" rx="3.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.6v3.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "sticker":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M20.5 12.6V7.2a3.7 3.7 0 0 0-3.7-3.7H7.2a3.7 3.7 0 0 0-3.7 3.7v9.6a3.7 3.7 0 0 0 3.7 3.7h5.4Zm0 0c-4.3 0-7.9 3.5-7.9 7.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><circle cx="9" cy="10" r="1.3" fill="currentColor" /><circle cx="15" cy="10" r="1.3" fill="currentColor" /><path d="M8.6 14.2c.9 1 2 1.5 3.4 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M4.2 4.6 20.4 11.3c.6.3.6 1.1 0 1.4L4.2 19.4c-.6.3-1.3-.3-1-1l2.4-6.4-2.4-6.4c-.3-.7.4-1.3 1-1ZM5.6 12h7.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
  }
}

/** Snapchat's avatar without a Bitmoji: the plain silhouette on a tinted disc. */
function Silhouette({ tint, size }: { tint: string; size: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 36 36" width={size} height={size} className={styles.avatar}>
      <circle cx="18" cy="18" r="18" fill={tint} />
      <circle cx="18" cy="14.2" r="5.6" fill="#fff" />
      <path d="M7.6 30.2c1.6-5 5.5-8 10.4-8s8.8 3 10.4 8A17.9 17.9 0 0 1 18 36c-4 0-7.6-2.1-10.4-5.8Z" fill="#fff" />
    </svg>
  );
}

function SnapchatState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // The chats sent before the ones handed in now: kept here, since they are saved in chat.
  const [memory, setMemory] = useState<{ past: readonly Sent[]; latest: readonly Sent[] }>({ past: [], latest: [] });
  if (!sameCues(memory.latest, lines)) {
    const first = lines[0];
    let past = first ? [...memory.past, ...memory.latest].filter((line) => line.cueIndex < first.cueIndex).slice(-(KEPT - 1)) : [];
    // A jump in the song (not the next line): the earlier chats are not the ones before this.
    if (first && past.length && past.at(-1)!.cueIndex !== first.cueIndex - 1) past = [];
    setMemory({ past, latest: lines.map(({ cueIndex, full, bold }) => ({ cueIndex, full, bold })) });
  }
  const past = memory.past;

  // The sung lines and whatever the participant sends, in the order sent: all hers.
  const chats = useMemo(() => {
    const first = lines[0];
    return [
      ...(first ? past.filter((line) => line.cueIndex < first.cueIndex) : []).map((line) => ({ key: `l${line.cueIndex}`, at: line.cueIndex, text: line.full, bold: Boolean(line.bold) })),
      ...lines.map((line) => ({ key: `l${line.cueIndex}`, at: line.cueIndex, text: line.text, bold: Boolean(line.bold) })),
      ...replies.slice(-12).map((reply) => ({ key: `r${reply.id}`, at: reply.afterCue + 0.5, text: reply.text, bold: false })),
    ].sort((a, b) => a.at - b.at);
  }, [past, lines, replies]);

  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
  }, [chats, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`Snapchat chat with ${contact.name}`} inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Glyph name="back" />
        </span>
        <span className={styles.peer}>
          <Silhouette tint={contact.tint} size={36} />
          <span className={styles.peerText}>
            <span className={styles.peerName}>{contact.name}</span>
          </span>
        </span>
        <span className={styles.calls}>
          <span className={styles.round}><Glyph name="phone" /></span>
          <span className={styles.round}><Glyph name="video" /></span>
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          {chats.length ? (
            <>
              <p className={styles.day}>TODAY</p>
              <div className={styles.group} data-kind="me">
                <p className={styles.sender}>ME</p>
                {chats.map((chat) => (
                  <p data-lyric key={chat.key} className={styles.chat} style={chat.bold ? { fontWeight: 700 } : undefined}>
                    {chat.text}
                  </p>
                ))}
                <p className={styles.delivered}>
                  <Glyph name="delivered" />
                  Delivered
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <span className={styles.camera} aria-hidden="true">
          <Glyph name="camera" />
        </span>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Chat with {contact.name}</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Send a chat"
            enterKeyHint="send"
            autoComplete="off"
          />
          {draft.trim() ? null : (
            <span className={styles.mic} aria-hidden="true">
              <Glyph name="mic" />
            </span>
          )}
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.send} aria-label="Send">
            <Glyph name="send" />
          </button>
        ) : (
          <span className={styles.sticker} aria-hidden="true">
            <Glyph name="sticker" />
          </span>
        )}
      </form>
    </section>
  );
}

export default memo(SnapchatState);
