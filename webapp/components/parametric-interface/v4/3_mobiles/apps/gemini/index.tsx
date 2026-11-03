"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import styles from "./gemini.module.css";
import { follow } from "../follow";

// The Google Gemini iOS app, light, one chat open. Unlike ChatGPT's
// alternation, she asked one question before the song — “is it normal to
// miss someone who was bad for you?” — and Gemini's single answer is the
// song: every sung line streams in as the next paragraph of one long reply,
// with the stop button in the composer while it writes and the action row
// (good / bad response, share, copy, more) once it pauses. The composer is
// real: what the participant asks lands as her own bubble after the line it
// followed, and the answer carries on below it as a new reply.
//
// Sources: the response sparkle is Gemini's own served asset
// (www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg,
// copied to public/parametric-interface/v4/apps/gemini/sparkle.svg). Every
// other glyph is a Material Symbols Outlined path (the icon set the Gemini
// app ships), copied from github.com/google/material-design-icons
// symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg. Colours are
// Gemini's light Material 3 tokens (#1F1F1F on-surface, #444746 variant,
// #F0F4F9 surface-container, #E9EEF6 user bubble). Google Sans is not
// shipped here, so the system face stands in.

const SEND_LIMIT = 120;
const QUESTION = "is it normal to miss someone who was bad for you?";

const PATHS = {
  menu: "M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z",
  down: "M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z",
  add: "M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z",
  mic: "M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm0-240Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480Z",
  live: "M280-240v-480h80v480h-80ZM440-80v-800h80v800h-80ZM120-400v-160h80v160h-80Zm480 160v-480h80v480h-80Zm160-160v-160h80v160h-80Z",
  send: "M120-160v-240l320-80-320-80v-240l760 320-760 320Z",
  stop: "M240-240v-480h480v480H240Z",
  up: "M720-120H280v-520l280-280 50 50q7 7 11.5 19t4.5 23v14l-44 174h258q32 0 56 24t24 56v80q0 7-2 15t-4 15L794-168q-9 20-30 34t-44 14Zm-360-80h360l120-280v-80H480l54-220-174 174v406Zm0-406v406-406Zm-80-34v80H160v360h120v80H80v-520h200Z",
  downvote: "M240-840h440v520L400-40l-50-50q-7-7-11.5-19t-4.5-23v-14l44-174H120q-32 0-56-24t-24-56v-80q0-7 2-15t4-15l120-282q9-20 30-34t44-14Zm360 80H240L120-480v80h360l-54 220 174-174v-406Zm0 406v-406 406Zm80 34v-80h120v-360H680v-80h200v520H680Z",
  share: "M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z",
  copy: "M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z",
  more: "M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z",
} as const;

function Icon({ name, size = 24 }: { name: keyof typeof PATHS; size?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 -960 960 960" width={size} height={size}>
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  );
}

/** The signed-in account's monogram, as Google draws a profile without a photo. */
const ACCOUNTS = [
  { initial: "H", tint: "#5c6bc0" },
  { initial: "S", tint: "#00897b" },
  { initial: "Y", tint: "#8e24aa" },
  { initial: "E", tint: "#f4511e" },
  { initial: "J", tint: "#3949ab" },
  { initial: "R", tint: "#7cb342" },
] as const;

type Turn =
  | { kind: "user"; key: string; text: string }
  | { kind: "model"; key: string; paragraphs: { key: number; text: string }[]; streaming: boolean };

function GeminiState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const account = ACCOUNTS[seat % ACCOUNTS.length]!;
  const streaming = Boolean(lines.at(-1)?.current);

  // Her one question, then the song as the answer; a question she asks
  // mid-song splits it, and the answer carries on as the next reply.
  const turns = useMemo(() => {
    const entries = [
      ...lines.map((line) => ({ at: line.cueIndex, line, reply: null })),
      ...replies.map((reply) => ({ at: reply.afterCue + 0.5, line: null, reply })),
    ].sort((a, b) => a.at - b.at);
    const out: Turn[] = [{ kind: "user", key: "q", text: QUESTION }];
    for (const entry of entries) {
      if (entry.reply) {
        out.push({ kind: "user", key: `r${entry.reply.id}`, text: entry.reply.text });
        continue;
      }
      const line = entry.line!;
      const previous = out.at(-1)!;
      if (previous.kind === "model") {
        previous.paragraphs.push({ key: line.cueIndex, text: line.text });
        previous.streaming = line.current;
      } else {
        out.push({ kind: "model", key: `m${line.cueIndex}`, paragraphs: [{ key: line.cueIndex, text: line.text }], streaming: line.current });
      }
    }
    return out;
  }, [lines, replies]);

  // The answer keeps its newest paragraph in view, as the app does while streaming.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
  }, [turns, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  // Before the first line Gemini has taken the question and is thinking.
  const thinking = turns.at(-1)!.kind === "user";

  return (
    <section className={styles.app} aria-label="Gemini" inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.icon}>
          <Icon name="menu" />
        </span>
        <span className={styles.title}>
          Gemini
          <span className={styles.titleChevron}>
            <Icon name="down" size={20} />
          </span>
        </span>
        <span className={styles.avatar} style={{ background: account.tint }} aria-hidden="true">
          {account.initial}
        </span>
      </header>

      <div ref={threadRef} className={styles.thread}>
        <div className={styles.turns}>
          {turns.map((turn) =>
            turn.kind === "user" ? (
              <p key={turn.key} className={styles.user}>
                {turn.text}
              </p>
            ) : (
              <div key={turn.key} className={styles.model}>
                <div className={styles.modelHead}>
                  <span className={styles.sparkle} aria-hidden="true" />
                  <span className={styles.showThinking}>
                    Show thinking
                    <Icon name="down" size={18} />
                  </span>
                </div>
                <div className={styles.answer}>
                  {turn.paragraphs.map((paragraph, index) => (
                    <p key={paragraph.key} data-streaming={(turn.streaming && index === turn.paragraphs.length - 1) || undefined}>
                      {paragraph.text}
                    </p>
                  ))}
                </div>
                {turn.streaming ? null : (
                  <div className={styles.actions} aria-hidden="true">
                    <Icon name="up" size={20} />
                    <Icon name="downvote" size={20} />
                    <Icon name="share" size={20} />
                    <Icon name="copy" size={20} />
                    <Icon name="more" size={20} />
                  </div>
                )}
              </div>
            ),
          )}
          {thinking ? (
            <div className={styles.model}>
              <div className={styles.modelHead}>
                <span className={styles.sparkle} data-thinking={!reducedMotion || undefined} aria-hidden="true" />
                <span className={styles.showThinking}>
                  Show thinking
                  <Icon name="down" size={18} />
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <div className={styles.box}>
          <label className={styles.field}>
            <span className={styles.visuallyHidden}>Ask Gemini</span>
            <input
              value={draft}
              maxLength={SEND_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask Gemini"
              enterKeyHint="send"
              autoComplete="off"
            />
          </label>
          <div className={styles.tools}>
            <span className={styles.tool} aria-hidden="true">
              <Icon name="add" />
            </span>
            <span className={styles.spacer} />
            {draft.trim() ? (
              <button type="submit" className={styles.send} aria-label="Send message">
                <Icon name="send" size={22} />
              </button>
            ) : streaming || thinking ? (
              <span className={styles.stop} role="img" aria-label="Stop response">
                <Icon name="stop" size={18} />
              </span>
            ) : (
              <>
                <span className={styles.tool} aria-hidden="true">
                  <Icon name="mic" />
                </span>
                <span className={styles.live} aria-hidden="true">
                  <Icon name="live" size={22} />
                </span>
              </>
            )}
          </div>
        </div>
      </form>
    </section>
  );
}

export default memo(GeminiState);
