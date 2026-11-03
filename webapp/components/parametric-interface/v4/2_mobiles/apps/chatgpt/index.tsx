"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import styles from "./chatgpt.module.css";
import { follow } from "../follow";

// The ChatGPT iOS app, light, one chat open. The 1031 idea's "texting with an
// AI assistant": she asks it about the ex. The sung lines alternate between
// the two sides of the chat — an even line is her prompt, typed into the
// composer word by word and sent (as a grey bubble) when the next line
// starts; an odd line is the answer, streamed word by word as plain text with
// the send button turned into the stop square, and the action row (copy,
// good / bad response, read aloud, regenerate) under it once it is finished.
// The composer is real: what the participant sends lands as her own bubble
// after the line it followed.
//
// Sources: layout, type and colours follow the current ChatGPT iOS app
// (light) — 17 pt system type, #F4F4F4 user bubble (chatgpt.com's light
// --message-surface), unboxed assistant text in #0D0D0D, the two-row
// "Ask anything" composer with +, tools, mic and the black voice-mode button.
// chatgpt.com's served sprite (cdn.oaistatic.com sprites-core) is behind a
// bot wall from here, so the glyphs are redrawn on its 24 pt grid at its
// 2 pt stroke, matching their geometry by eye; no OpenAI logo is drawn.

const SEND_LIMIT = 120;

type GlyphName =
  | "sidebar"
  | "chevron"
  | "compose"
  | "plus"
  | "tools"
  | "mic"
  | "voice"
  | "send"
  | "stop"
  | "copy"
  | "up"
  | "down"
  | "speaker"
  | "regenerate";

function Glyph({ name }: { name: GlyphName }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  const small = { ...stroke, strokeWidth: 1.75 } as const;
  switch (name) {
    case "sidebar":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 8h17M3.5 16h10" {...stroke} /></svg>;
    case "chevron":
      return <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12"><path d="m2.5 4.5 3.5 3.5 3.5-3.5" {...stroke} strokeWidth={1.8} /></svg>;
    case "compose":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M11 4H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-4" {...stroke} /><path d="M17.6 3.6a2 2 0 0 1 2.8 2.8L12.6 14.2 9 15l.8-3.6Z" {...stroke} /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M12 5v14M5 12h14" {...stroke} /></svg>;
    case "tools":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M4 7.5h9M18 7.5h2M4 16.5h2M11 16.5h9" {...stroke} /><circle cx="15.5" cy="7.5" r="2.5" {...stroke} /><circle cx="8.5" cy="16.5" r="2.5" {...stroke} /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect x="9" y="3" width="6" height="11" rx="3" {...stroke} /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...stroke} /></svg>;
    case "voice":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M4.5 8v4M8.2 5v10M11.8 7v6M15.5 8.5v3" {...stroke} strokeWidth={2.1} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M10 16V4.5M5 9.5l5-5 5 5" {...stroke} strokeWidth={2.2} /></svg>;
    case "stop":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><rect x="6" y="6" width="8" height="8" rx="1.5" fill="currentColor" /></svg>;
    case "copy":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><rect x="7" y="7" width="10" height="10" rx="2.2" {...small} /><path d="M13 4.5A1.5 1.5 0 0 0 11.5 3H5a2 2 0 0 0-2 2v6.5A1.5 1.5 0 0 0 4.5 13" {...small} /></svg>;
    case "up":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M6.5 8.5v8H4.2A1.2 1.2 0 0 1 3 15.3V9.7a1.2 1.2 0 0 1 1.2-1.2Zm0 0 3-5.5a2 2 0 0 1 2.4 2.3L11.4 8h3.9a2 2 0 0 1 2 2.4l-1.1 4.8a2 2 0 0 1-2 1.3H6.5" {...small} /></svg>;
    case "down":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M13.5 11.5v-8h2.3A1.2 1.2 0 0 1 17 4.7v5.6a1.2 1.2 0 0 1-1.2 1.2Zm0 0-3 5.5a2 2 0 0 1-2.4-2.3l.5-2.7H4.7a2 2 0 0 1-2-2.4l1.1-4.8a2 2 0 0 1 2-1.3h7.7" {...small} /></svg>;
    case "speaker":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M3 8v4a1 1 0 0 0 1 1h2.5L10 16V4L6.5 7H4a1 1 0 0 0-1 1ZM13.2 7.2a4 4 0 0 1 0 5.6M15.6 4.8a7.4 7.4 0 0 1 0 10.4" {...small} /></svg>;
    case "regenerate":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M16.2 8.2A6.5 6.5 0 0 0 4.4 6.3M3.8 11.8a6.5 6.5 0 0 0 11.8 1.9M4.2 2.8v3.7h3.7M15.8 17.2v-3.7h-3.7" {...small} /></svg>;
  }
}

type Row =
  | { kind: "user"; key: string; text: string }
  | { kind: "assistant"; key: string; text: string; streaming: boolean };

function ChatGptState({ lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const last = lines.at(-1);
  // Her prompt being sung is still in the composer; the answer being sung streams.
  const typing = last && last.current && last.cueIndex % 2 === 0 ? last : null;
  const streaming = Boolean(last && last.current && last.cueIndex % 2 === 1);

  const rows = useMemo(() => {
    const entries: { at: number; row: Row }[] = [];
    for (const line of lines) {
      if (line === typing) continue;
      entries.push({
        at: line.cueIndex,
        row:
          line.cueIndex % 2 === 0
            ? { kind: "user", key: `l${line.cueIndex}`, text: line.text }
            : { kind: "assistant", key: `l${line.cueIndex}`, text: line.text, streaming: line.current },
      });
    }
    for (const reply of replies) entries.push({ at: reply.afterCue + 0.5, row: { kind: "user", key: `r${reply.id}`, text: reply.text } });
    return entries.sort((a, b) => a.at - b.at).map((entry) => entry.row);
  }, [lines, replies, typing]);

  // The chat keeps its newest turn in view, as the app does while streaming.
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

  const composed = draft || typing?.text || "";
  const empty = rows.length === 0;

  return (
    <section className={styles.app} aria-label="ChatGPT" inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.icon}>
          <Glyph name="sidebar" />
        </span>
        <span className={styles.model}>
          ChatGPT
          <span className={styles.modelChevron}>
            <Glyph name="chevron" />
          </span>
        </span>
        <span className={styles.icon}>
          <Glyph name="compose" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread}>
        {empty ? (
          <p className={styles.greeting}>What can I help with?</p>
        ) : (
          <div className={styles.turns}>
            {rows.map((row) =>
              row.kind === "user" ? (
                <p key={row.key} className={styles.user}>
                  {row.text}
                </p>
              ) : (
                <div key={row.key} className={styles.assistant}>
                  <p className={styles.answer} data-streaming={row.streaming || undefined}>
                    {row.text}
                  </p>
                  {row.streaming ? null : (
                    <div className={styles.actions} aria-hidden="true">
                      <Glyph name="copy" />
                      <Glyph name="up" />
                      <Glyph name="down" />
                      <Glyph name="speaker" />
                      <Glyph name="regenerate" />
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={send}>
        <div className={styles.box}>
          <label className={styles.field} data-typed={(!draft && typing) || undefined}>
            <span className={styles.visuallyHidden}>Message ChatGPT</span>
            <input
              value={draft}
              maxLength={SEND_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={typing ? "" : "Ask anything"}
              enterKeyHint="send"
              autoComplete="off"
            />
            {!draft && typing ? (
              <span className={styles.typed} aria-hidden="true">
                {typing.text}
              </span>
            ) : null}
          </label>
          <div className={styles.tools}>
            <span className={styles.tool} aria-hidden="true">
              <Glyph name="plus" />
            </span>
            <span className={styles.tool} aria-hidden="true">
              <Glyph name="tools" />
            </span>
            <span className={styles.spacer} />
            {streaming && !draft ? (
              <span className={styles.round} aria-label="Stop generating" role="img">
                <Glyph name="stop" />
              </span>
            ) : composed.trim() ? (
              <button type="submit" className={styles.round} aria-label="Send prompt" disabled={!draft.trim()}>
                <Glyph name="send" />
              </button>
            ) : (
              <>
                <span className={styles.tool} aria-hidden="true">
                  <Glyph name="mic" />
                </span>
                <span className={styles.round} aria-hidden="true">
                  <Glyph name="voice" />
                </span>
              </>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

export default memo(ChatGptState);
