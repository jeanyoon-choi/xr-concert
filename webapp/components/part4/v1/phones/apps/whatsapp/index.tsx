"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../clock/wall-clock";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./whatsapp.module.css";
import { follow } from "../follow";

// WhatsApp for iOS, light theme, one 1:1 chat with the seat's ex, empty
// until the song. Every sung line is a message this phone's owner sends — her
// own green bubbles, one after another, each filling as it is typed, the tail
// on the last of the run — and the ex never answers or opens them: every
// bubble keeps its time and two grey ticks (delivered), never blue. What the
// participant sends from the composer is one more green bubble, in order with
// the lines. A line marked bold is set in bold.
//
// Sources. Every glyph, the bubble images and the chat doodle are WhatsApp's
// own, exported from the iOS app's asset catalogs as shipped in the Mac
// (Catalyst) build, /Applications/WhatsApp.app (SharedModules.framework and
// Resources Assets.car, read with CoreUI): DoodleOverlay ("DoodleV2.2"),
// BubbleIncoming/Outgoing(+NoTail), NavbarBackArrow, CallVideo,
// phone-handset_Outline_24, ChatBarAttachMedia, ic_stickers, ChatBarCamera,
// ChatBarMicrophone, wds_ic_read, checkmark, IconSend, PersonalChatRoundSmall.
// Bubble slices and outsets are measured from those 2x images (body inset
// 5 pt, tail side 15 pt). Colours: #EFEAE2 chat ground, #8C9196 unread ticks
// (WhatsApp design values; the asset catalog holds only AccentColor #1B934C).

const SEND_LIMIT = 80;
const PREFIX = "/part4/v0/apps/whatsapp";

function Icon({ name, className }: { name: string; className: string }) {
  return <span aria-hidden="true" className={className} style={{ ["--src" as string]: `url(${PREFIX}/${name}@2x.png)` }} />;
}

function WhatsAppState({ seat, lines, replies, clock, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  // The sung lines and whatever the participant sends, in the order sent: all hers.
  const rows = useMemo(() => {
    const startOf = new Map(lines.map((line) => [line.cueIndex, line.startMs]));
    return [
      ...lines.map((line) => ({ key: `l${line.cueIndex}`, at: line.cueIndex, text: line.text, time: formatSongClock(line.startMs), bold: Boolean(line.bold) })),
      ...replies.slice(-24).map((reply) => {
        const startMs = startOf.get(reply.afterCue);
        return { key: `r${reply.id}`, at: reply.afterCue + 0.5, text: reply.text, time: startMs === undefined ? clock : formatSongClock(startMs), bold: false };
      }),
    ].sort((a, b) => a.at - b.at);
  }, [lines, replies, clock]);

  // The chat keeps its newest message in view, as WhatsApp does.
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
    <section className={styles.app} aria-label={`WhatsApp chat with ${contact.name}`} inert={!shown} data-reduced-motion={reducedMotion || undefined}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Icon name="back" className={styles.backArrow} />
          <span className={styles.backCount}>{4 + (seat % 9)}</span>
        </span>
        <span className={styles.peer}>
          <span className={styles.avatar} aria-hidden="true" />
          <span className={styles.peerText}>
            <span className={styles.peerName}>{contact.name}</span>
            <span className={styles.peerStatus}>last seen yesterday at 23:52</span>
          </span>
        </span>
        <span className={styles.calls}>
          <Icon name="video" className={styles.video} />
          <Icon name="phone" className={styles.phone} />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          {rows.length ? <p className={styles.day}><span>Today</span></p> : null}
          {rows.map((row, index) => (
            <p
              data-lyric
              key={row.key}
              className={styles.bubble}
              data-side="out"
              data-tail={index === rows.length - 1 || undefined}
              style={row.bold ? { fontWeight: 700 } : undefined}
            >
              {row.text}
              <Meta time={row.time} />
            </p>
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.attach} aria-label="Attach" tabIndex={-1}>
          <Icon name="plus" className={styles.plus} />
        </button>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Message {contact.name}</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="send"
            autoComplete="off"
          />
          <Icon name="sticker" className={styles.sticker} />
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.send} aria-label="Send">
            <Icon name="send" className={styles.sendPlane} />
          </button>
        ) : (
          <span className={styles.media} aria-hidden="true">
            <Icon name="camera" className={styles.camera} />
            <Icon name="mic" className={styles.mic} />
          </span>
        )}
      </form>
    </section>
  );
}

/** Time and the two grey ticks (delivered, never read), bottom-right inside the bubble; an invisible twin reserves their room on the last line. */
function Meta({ time }: { time: string }) {
  const content = (
    <>
      {time}
      <span className={styles.ticks} />
    </>
  );
  return (
    <>
      <span data-lyric-keep className={styles.metaSpace} aria-hidden="true">{content}</span>
      <span data-lyric-keep className={styles.meta}>{content}</span>
    </>
  );
}

export default memo(WhatsAppState);
