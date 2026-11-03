"use client";

import { memo, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./mail.module.css";
import { follow } from "../follow";

// iOS 18 Mail, the compose sheet (UIKit page sheet over the inbox, which
// sits scaled back behind it on black). Fields and order as Mail draws
// them: To, the collapsed "Cc/Bcc, From:" row, Subject, then the body with
// the default "Sent from my iPhone" signature. The title reads "New
// Message" until there is a subject, then the subject. The send control is
// SF Symbol arrow.up.circle.fill in systemBlue, greyed while there is no
// recipient. No keyboard is drawn. Metrics after experiments-jyc SCC
// mobiles/1 apps/mail (Compose) and UIKit's 17 pt body text.
//
// The lyric is a mail to the ex she will not send: the first sung line is
// typed into Subject, each following line into the body as its own
// paragraph. The body is real text: what the participant types under it is
// kept, and Return (or the send arrow) commits it as a paragraph of the
// draft through `act`, placed after the line it followed.

const ADDRESSES = ["hana.lee", "jules.park", "yuna.k", "eli.moss", "rin.oh", "noa.seo"];
const LIMIT = 120;

function Send({ enabled }: { enabled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 30" width="30" height="30">
      <circle cx="15" cy="15" r="15" fill={enabled ? "#007aff" : "rgb(120 120 128 / 24%)"} />
      <path d="M15 22V8.6M9.4 14 15 8.4l5.6 5.6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const from = `${ADDRESSES[seat % ADDRESSES.length]}@icloud.com`;
  const [draft, setDraft] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const [subject, ...rest] = lines;
  const recipients = [contact.name];

  const paragraphs = [
    ...rest.map((line) => ({ at: line.cueIndex, key: `l${line.cueIndex}`, text: line.text, typing: line.current && !draft })),
    ...replies.map((reply) => ({ at: reply.afterCue + 0.5, key: `r${reply.id}`, text: reply.text, typing: false })),
  ].sort((a, b) => a.at - b.at);

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body || !shown) return;
    const caret = body.querySelector<HTMLElement>("[data-typing]") ?? body.querySelector<HTMLElement>("textarea");
    if (!caret) return;
    follow(body, Math.max(0, caret.offsetTop + caret.offsetHeight + 80 - body.clientHeight), reducedMotion);
  }, [lines, replies, shown, reducedMotion]);

  const commit = () => {
    const text = draft.trim().slice(0, LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    commit();
  };

  return (
    <section className={styles.app} aria-label="New Message" inert={!shown}>
      <div className={styles.behind} aria-hidden="true" />

      <div className={styles.sheet}>
        <header className={styles.bar}>
          <span className={styles.cancel}>Cancel</span>
          <b className={styles.title}>{subject?.text || "New Message"}</b>
          <button type="button" className={styles.send} aria-label="Send" disabled={!recipients.length} onClick={commit}>
            <Send enabled={recipients.length > 0} />
          </button>
        </header>

        <div ref={bodyRef} className={styles.scroll}>
          <p className={styles.field}>
            <span className={styles.key}>To:</span>
            <span className={styles.to}>{recipients.join(", ")}</span>
          </p>
          <p className={styles.field}>
            <span className={styles.key}>Cc/Bcc, From:</span>
            <span className={styles.from}>{from}</span>
          </p>
          <p className={styles.field}>
            <span className={styles.key}>Subject:</span>
            <span className={styles.subject} data-typing={(subject?.current && !draft) || (!subject && !draft) || undefined}>
              {subject?.text}
            </span>
          </p>

          <div className={styles.body}>
            {paragraphs.map((paragraph) => (
              <p key={paragraph.key} className={styles.paragraph} data-typing={paragraph.typing || undefined}>
                {paragraph.text}
              </p>
            ))}
            <label className={styles.draft}>
              <span className={styles.visuallyHidden}>Message body to {contact.name}</span>
              <textarea
                value={draft}
                maxLength={LIMIT}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKey}
                rows={1}
                spellCheck={false}
                enterKeyHint="enter"
              />
            </label>
            <p className={styles.signature}>Sent from my iPhone</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(MailState);
