"use client";

import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import { Glyph } from "./glyphs";
import styles from "./instagram-dm.module.css";
import { follow } from "../follow";

// Instagram iOS, a Direct thread (light) with the ex. The lyric is the ex
// replying to YOUR story: when the song starts, the thread shows "Replied to
// your story" over a thumbnail of your (text) story, then each sung line
// arrives as an incoming grey bubble that fills word by word; consecutive
// lines group, with the avatar at the end of the group, as Instagram does.
// The composer is real: what the participant sends lands as an outgoing
// bubble after the line it answered, with "Seen" under the last one.
// Double-tapping any bubble hearts it, as in the app.
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

type Row =
  | { kind: "in"; key: string; text: string; first: boolean; last: boolean; arriving: boolean }
  | { kind: "out"; key: string; text: string; first: boolean; last: boolean; seen: boolean };

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

  const rows = useMemo(() => {
    const merged = [
      ...lines.map((line) => ({ at: line.cueIndex, kind: "in" as const, text: line.text, key: `l${line.cueIndex}` })),
      ...replies.map((reply) => ({ at: reply.afterCue + 0.5, kind: "out" as const, text: reply.text, key: `r${reply.id}` })),
    ].sort((a, b) => a.at - b.at);
    const lastLine = lines.at(-1);
    const lastReply = replies.at(-1);
    return merged.map((entry, index): Row => {
      const first = merged[index - 1]?.kind !== entry.kind;
      const last = merged[index + 1]?.kind !== entry.kind;
      return entry.kind === "in"
        ? { kind: "in", key: entry.key, text: entry.text, first, last, arriving: !!lastLine && entry.key === `l${lastLine.cueIndex}` && lastLine.current }
        : { kind: "out", key: entry.key, text: entry.text, first, last, seen: !!lastReply && entry.key === `r${lastReply.id}` };
    });
  }, [lines, replies]);

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

  const bubble = (key: string, side: "in" | "out", text: string, first: boolean, last: boolean, arriving = false) => (
    <p
      className={styles.bubble}
      data-side={side}
      data-first={first || undefined}
      data-last={last || undefined}
      data-arriving={arriving || undefined}
      data-reacted={hearts[key] || undefined}
      onDoubleClick={() => toggleHeart(key)}
    >
      {text}
      {hearts[key] ? (
        <span className={styles.reaction} aria-label="Reacted with heart">
          ❤️
        </span>
      ) : null}
    </p>
  );

  const avatar = (visible: boolean) => (
    <span className={styles.rowAvatar} aria-hidden="true">
      {visible ? (
        <span className={styles.monogram} style={{ background: contact.tint }}>
          {contact.initials}
        </span>
      ) : null}
    </span>
  );

  const hasSent = replies.length > 0;

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

          <p className={styles.stamp}>Aug 23, 01:12</p>
          <div className={styles.inRow}>
            {avatar(false)}
            {bubble("p1", "in", "you up?", true, false)}
          </div>
          <div className={styles.inRow}>
            {avatar(true)}
            {bubble("p2", "in", "i saw your playlist lol", false, true)}
          </div>
          <div className={styles.outRow}>{bubble("p3", "out", "go to sleep", true, true)}</div>
          {!hasSent ? <span className={styles.seen}>Seen</span> : null}

          {lines.length ? (
            <>
              <p className={styles.stamp}>Today {formatSongClock(lines[0]!.startMs)}</p>
              <p className={styles.storyLabel}>Replied to your story</p>
              <div className={styles.storyQuote}>
                <span className={styles.storyBar} aria-hidden="true" />
                <span className={styles.story} aria-label="Your story">
                  <span>never been better</span>
                </span>
              </div>
            </>
          ) : null}

          {rows.map((row) =>
            row.kind === "in" ? (
              <div key={row.key} className={styles.inRow} data-gap={row.first || undefined}>
                {avatar(row.last)}
                {bubble(row.key, "in", row.text, row.first, row.last, row.arriving && !reducedMotion)}
              </div>
            ) : (
              <div key={row.key} className={styles.outGroup} data-gap={row.first || undefined}>
                <div className={styles.outRow}>{bubble(row.key, "out", row.text, row.first, row.last)}</div>
                {row.seen ? <span className={styles.seen}>Seen</span> : null}
              </div>
            ),
          )}
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
