"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../clock/wall-clock";
import { contactFor, type PhoneStateProps } from "../types";
import { Glyph } from "./glyphs";
import styles from "./instagram-dm.module.css";
import { follow } from "../follow";

// Instagram iOS, a Direct thread (light) with the ex, new: nothing above the
// first message but the profile block Direct opens a conversation with.
// Every sung line is a message this phone's owner sends — her own gradient
// bubbles, one after another, each filling as it is typed; consecutive ones
// group (4 pt inner corners), as Instagram does — and the ex never answers:
// no "Seen" ever appears under the last one. What the participant sends from
// the composer is one more bubble, in order with the lines. A line marked
// bold is set in bold. Double-tapping any bubble hearts it, as in the app.
//
// Sources
// - Glyphs: Instagram IGDS icon modules served by static.cdninstagram.com,
//   copied verbatim from experiments-jyc SCC components/mobile/clone/11
//   (record apps/scc/docs/experiments/sns/mobile/11.md).
// - Geometry and colour: measured in pixels (2.351 px/pt) from Instagram's US
//   App Store iPhone "Messages" frame
//   (is1-ssl.mzstatic.com/.../4_iOS_6.5.jpg/1290x2796bb.png): header 53 pt with
//   a 1 pt #e4e7ec rule, 32 pt avatar, 24 pt call/video glyphs at x 314/362;
//   received bubbles #f4f5f7 from x 56 with a 28 pt avatar at x 16; bubbles
//   38 pt tall, 16 pt text, 1 pt apart in a group with 4 pt inner corners;
//   composer pill 42 pt (x 8–382, 41 pt above the bottom edge), 32 pt camera
//   disc, mic/photo/sticker on a 40 pt pitch. Sent bubbles sample #424fff
//   (upper) and #4a5df9 (lower): the sent fill is a gradient fixed to the
//   thread viewport, each bubble showing its slice, as Instagram's is.

type Reaction = Readonly<Record<string, true>>;

const SEND_LIMIT = 80;

const USERNAMES: Readonly<Record<string, string>> = {
  Daniel: "daniel.hwang",
  Jae: "jae__lim",
  Minseo: "minseo.k",
  Theo: "theo.marsh",
  Ari: "ari.vale",
  Sam: "sam_okafor",
};

function InstagramDmState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const username = USERNAMES[contact.name] ?? contact.name.toLowerCase();
  const [draft, setDraft] = useState("");
  const [hearts, setHearts] = useState<Reaction>({});
  const threadRef = useRef<HTMLDivElement>(null);

  // The sung lines and whatever the participant sends, in the order sent: all hers.
  const rows = useMemo(
    () =>
      [
        ...lines.map((line) => ({ at: line.cueIndex, key: `l${line.cueIndex}`, text: line.text, bold: Boolean(line.bold) })),
        ...replies.map((reply) => ({ at: reply.afterCue + 0.5, key: `r${reply.id}`, text: reply.text, bold: false })),
      ].sort((a, b) => a.at - b.at),
    [lines, replies],
  );
  const firstMs = lines[0]?.startMs ?? 0;

  // Sent bubbles show their slice of one gradient spanning the thread viewport
  // (the thread is their offsetParent, so offsetTop is in scroll coordinates).
  const paintSent = useCallback(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const height = thread.clientHeight;
    for (const bubble of thread.querySelectorAll<HTMLElement>("[data-side='out']")) {
      const y = bubble.offsetTop - thread.scrollTop;
      bubble.style.backgroundSize = `100% ${height}px`;
      bubble.style.backgroundPosition = `0 ${-y}px`;
    }
  }, []);

  // The thread keeps its newest message in view, as Direct does.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
    paintSent();
  }, [rows, shown, reducedMotion, paintSent]);

  const toggleHeart = (key: string) =>
    setHearts((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`Instagram chat with ${contact.name}`} inert={!shown}>
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <Glyph name="back" />
        </span>
        <span className={styles.who}>
          <span className={styles.headerAvatar} aria-hidden="true" style={{ background: contact.tint }}>
            {contact.initials}
          </span>
          <span className={styles.names}>
            <strong>{contact.name}</strong>
            <small>{username}</small>
          </span>
        </span>
        <span className={styles.icon} aria-hidden="true">
          <Glyph name="call" />
        </span>
        <span className={styles.icon} aria-hidden="true">
          <Glyph name="videoCall" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} onScroll={paintSent} data-feed>
        <div className={styles.rows}>
          <div className={styles.identity}>
            <span className={styles.identityAvatar} aria-hidden="true" style={{ background: contact.tint }}>
              {contact.initials}
            </span>
            <strong>{contact.name}</strong>
            <small>{username} · Instagram</small>
            <span className={styles.viewProfile}>View profile</span>
          </div>

          {rows.length ? <p className={styles.stamp}>Today {formatSongClock(firstMs)}</p> : null}

          {rows.map((row, index) => (
            <div key={row.key} className={styles.outRow}>
              <p
                data-lyric
                className={styles.bubble}
                data-side="out"
                data-first={index === 0 || undefined}
                data-last={index === rows.length - 1 || undefined}
                data-reacted={hearts[row.key] || undefined}
                style={row.bold ? { fontWeight: 700 } : undefined}
                onDoubleClick={() => toggleHeart(row.key)}
              >
                {row.text}
                {hearts[row.key] ? (
                  <span className={styles.reaction} aria-label="Reacted with heart">
                    ❤️
                  </span>
                ) : null}
              </p>
            </div>
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <span className={styles.camera} aria-hidden="true">
          <Glyph name="camera" size={18} />
        </span>
        <input
          value={draft}
          maxLength={SEND_LIMIT}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message…"
          aria-label={`Message ${contact.name}`}
          enterKeyHint="send"
          autoComplete="off"
        />
        {draft.trim() ? (
          <button type="submit" className={styles.sendText}>
            Send
          </button>
        ) : (
          <span className={styles.tools} aria-hidden="true">
            <span><Glyph name="microphone" /></span>
            <span><Glyph name="photo" /></span>
            <span><Glyph name="sticker" /></span>
          </span>
        )}
      </form>
    </section>
  );
}

export default memo(InstagramDmState);
