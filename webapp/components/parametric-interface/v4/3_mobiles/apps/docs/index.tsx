"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { PhoneStateProps } from "../types";
import styles from "./docs.module.css";
import { follow } from "../follow";

// The Google Docs iOS app, light, a document open in editing mode: “letter
// (don't send)”. Docs names an untitled file after its first line, so the
// letter begins with that line in Docs' Title style. The letter is what she
// writes and does not send: each sung line is typed at the cursor as a new
// paragraph, character by character, the blue caret at its end. The page is
// real text: the participant can keep writing, and each paragraph they finish
// (Return) stays in the letter after the line it followed.
//
// Sources: the editing toolbar (done check, undo, redo, text format, insert,
// add comment, more) uses Material Symbols Outlined paths, the icon set the
// Docs app ships, copied from github.com/google/material-design-icons
// symbols/web/<name>/materialsymbolsoutlined/<name>_24px.svg. Colours are
// Docs' Material 3 tokens (#0B57D0 primary, #444746 icons, #1A73E8 caret);
// type is Docs' default Arial (Normal text, Title style), with print layout
// off as the phone app shows it.

const SEND_LIMIT = 200;

const PATHS = {
  check: "M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z",
  undo: "M280-200v-80h284q63 0 109.5-40T720-420q0-60-46.5-100T564-560H312l104 104-56 56-200-200 200-200 56 56-104 104h252q97 0 166.5 63T800-420q0 94-69.5 157T564-200H280Z",
  redo: "M396-200q-97 0-166.5-63T160-420q0-94 69.5-157T396-640h252L544-744l56-56 200 200-200 200-56-56 104-104H396q-63 0-109.5 40T240-420q0 60 46.5 100T396-280h284v80H396Z",
  format: "M200-200v-80h560v80H200Zm76-160 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z",
  add: "M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z",
  comment: "M440-400h80v-120h120v-80H520v-120h-80v120H320v80h120v120ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z",
  more: "M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z",
} as const;

function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg aria-hidden="true" viewBox="0 -960 960 960" width="24" height="24">
      <path d={PATHS[name]} fill="currentColor" />
    </svg>
  );
}

const TITLE = "letter (don't send)";
/** What she had written before the song. */
const PRIOR = ["Hi,", "I've started this four times now. I'm not going to send it, so I can say it properly this time."] as const;

function DocsState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  const paragraphs = useMemo(
    () =>
      [
        ...lines.map((line) => ({ at: line.cueIndex, key: `l${line.cueIndex}`, text: line.text })),
        ...replies.map((reply) => ({ at: reply.afterCue + 0.5, key: `r${reply.id}`, text: reply.text })),
      ].sort((a, b) => a.at - b.at),
    [lines, replies],
  );

  // The page keeps the cursor in view, as the editor does while typing.
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !shown) return;
    follow(body, body.scrollHeight, reducedMotion);
  }, [paragraphs, shown, reducedMotion]);

  // Return ends her paragraph: it stays in the letter.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  // The caret sits at the end of the newest paragraph until she types.
  const caret = !draft && !reducedMotion ? "blink" : !draft ? "still" : undefined;

  return (
    <section className={styles.app} aria-label="Google Docs" inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.done}>
          <Icon name="check" />
        </span>
        <span className={styles.tools}>
          <Icon name="undo" />
          <Icon name="redo" />
          <Icon name="format" />
          <Icon name="add" />
          <Icon name="comment" />
          <Icon name="more" />
        </span>
      </header>

      <div ref={bodyRef} className={styles.page}>
        <p className={styles.title}>{TITLE}</p>
        {PRIOR.map((text, index) => (
          <p key={text} className={styles.paragraph} data-caret={(paragraphs.length === 0 && index === PRIOR.length - 1 && caret) || undefined}>
            {text}
          </p>
        ))}
        {paragraphs.map((paragraph, index) => (
          <p key={paragraph.key} className={styles.paragraph} data-caret={(index === paragraphs.length - 1 && caret) || undefined}>
            {paragraph.text}
          </p>
        ))}
        <label className={styles.draft}>
          <span className={styles.visuallyHidden}>Letter, seat {seat + 1}</span>
          <textarea
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            spellCheck={false}
            enterKeyHint="enter"
          />
        </label>
      </div>
    </section>
  );
}

export default memo(DocsState);
