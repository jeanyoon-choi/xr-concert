"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { SungLine } from "../../../model/lines";
import type { PhoneStateProps } from "../types";
import styles from "./assistant.module.css";

// A chat assistant app (the 1031 idea's “texting with an AI assistant”). The
// song plays both sides of the conversation: lines alternate between the
// person, who types them into the composer word by word and sends them when
// the next line starts, and the assistant, which streams them as its answer.
// Nearby seats start on opposite sides. The composer is real: what the
// participant sends joins the conversation after the line it followed.

const SEND_LIMIT = 120;

type Turn =
  | { kind: "prompt"; key: string; text: string }
  | { kind: "answer"; key: string; text: string; streaming: boolean };

/** Which side sings a line on this seat. The seat term flips across rows of
 * three as well as along them, so assistant phones near each other differ. */
const isPrompt = (line: SungLine, seat: number) => (line.cueIndex + seat + Math.floor(seat / 3)) % 2 === 0;

const SUGGESTIONS = ["Help me write a message", "Is it toxic if…", "Plan a night out"] as const;

function Glyph({ name }: { name: "menu" | "compose" | "plus" | "mic" | "send" | "spark" | "chevron" }) {
  switch (name) {
    case "menu":
      return <svg aria-hidden="true" viewBox="0 0 22 16" width="22" height="16"><path d="M1 2h20M1 8h14M1 14h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>;
    case "compose":
      return <svg aria-hidden="true" viewBox="0 0 22 22" width="22" height="22"><path d="M18 11.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="m8 14 .6-3.1L17.4 2a1.6 1.6 0 0 1 2.3 2.3L11 13.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path d="M8 1.5v13M1.5 8h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 14 20" width="13" height="19"><rect x="3.6" y="1" width="6.8" height="11.6" rx="3.4" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="M1 9.4a6 6 0 0 0 12 0M7 15.4V19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 16 16" width="15" height="15"><path d="M8 13.5V2.5M3 7.2 8 2.2l5 5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "spark":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M10 1.5c.6 4.6 3.9 7.9 8.5 8.5-4.6.6-7.9 3.9-8.5 8.5-.6-4.6-3.9-7.9-8.5-8.5 4.6-.6 7.9-3.9 8.5-8.5Z" fill="currentColor" /></svg>;
    case "chevron":
      return <svg aria-hidden="true" viewBox="0 0 10 6" width="10" height="6"><path d="m1 1 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
}

function AssistantState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const current = lines.at(-1);
  // The person's line being sung is still in the composer, not yet sent.
  const typing = current?.current && isPrompt(current, seat) ? current.text : "";

  const turns = useMemo(() => {
    const merged: (Turn & { at: number })[] = [
      ...lines
        .filter((line) => !(line.current && isPrompt(line, seat)))
        .map((line): Turn & { at: number } =>
          isPrompt(line, seat)
            ? { at: line.cueIndex, kind: "prompt", key: `l${line.cueIndex}`, text: line.text }
            : { at: line.cueIndex, kind: "answer", key: `l${line.cueIndex}`, text: line.text, streaming: line.current && line.sung < line.words.length },
        ),
      ...replies.map((reply) => ({ at: reply.afterCue + 0.5, kind: "prompt" as const, key: `r${reply.id}`, text: reply.text })),
    ];
    return merged.sort((a, b) => a.at - b.at);
  }, [lines, replies, seat]);

  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [turns, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const ready = Boolean(draft.trim() || typing);

  return (
    <section className={styles.app} aria-label="Assistant" inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.navButton}>
          <Glyph name="menu" />
        </span>
        <span className={styles.title}>
          Assistant <Glyph name="chevron" />
        </span>
        <span className={styles.navButton}>
          <Glyph name="compose" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread}>
        {turns.length ? (
          <div className={styles.turns}>
            {turns.map((turn) =>
              turn.kind === "prompt" ? (
                <p key={turn.key} className={styles.prompt}>
                  {turn.text}
                </p>
              ) : (
                <div key={turn.key} className={styles.answer}>
                  <span className={styles.mark}>
                    <Glyph name="spark" />
                  </span>
                  <p data-streaming={turn.streaming || undefined}>{turn.text}</p>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyMark}>
              <Glyph name="spark" />
            </span>
            <p className={styles.greeting}>What’s on your mind tonight?</p>
            <ul className={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <form className={styles.composer} onSubmit={send}>
        <label className={styles.field} data-typing={(typing && !draft) || undefined}>
          <span className={styles.visuallyHidden}>Message the assistant</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={typing ? "" : "Ask anything"}
            enterKeyHint="send"
            autoComplete="off"
          />
          {typing && !draft ? (
            <span className={styles.typed} aria-hidden="true">
              {typing}
            </span>
          ) : null}
        </label>
        <div className={styles.tools}>
          <span className={styles.tool} aria-hidden="true">
            <Glyph name="plus" />
          </span>
          <span className={styles.toolsEnd}>
            <span className={styles.tool} aria-hidden="true">
              <Glyph name="mic" />
            </span>
            <button type="submit" className={styles.send} aria-label="Send" data-ready={ready || undefined} disabled={!draft.trim()}>
              <Glyph name="send" />
            </button>
          </span>
        </div>
      </form>
    </section>
  );
}

export default memo(AssistantState);
