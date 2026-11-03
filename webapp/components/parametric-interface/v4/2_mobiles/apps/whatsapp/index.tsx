"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./whatsapp.module.css";
import { follow } from "../follow";

// WhatsApp for iOS, light theme, one 1:1 chat with the seat's ex. Unlike
// Messages (the ex's words fill a bubble while sung), WhatsApp never shows a
// draft: while a line is being sung the ex is "typing…" — in the header
// subtitle and as the in-chat typing bubble — and the line lands as one
// incoming message only once it has been sung whole. The composer is real:
// what the participant sends lands as an outgoing bubble whose ticks stay grey
// until the ex starts on the next line (read: blue).
//
// Sources. Every glyph, the bubble images and the chat doodle are WhatsApp's
// own, exported from the iOS app's asset catalogs as shipped in the Mac
// (Catalyst) build, /Applications/WhatsApp.app (SharedModules.framework and
// Resources Assets.car, read with CoreUI): DoodleOverlay ("DoodleV2.2"),
// BubbleIncoming/Outgoing(+NoTail), NavbarBackArrow, CallVideo,
// phone-handset_Outline_24, ChatBarAttachMedia, ic_stickers, ChatBarCamera,
// ChatBarMicrophone, wds_ic_read, checkmark, IconSend, PersonalChatRoundSmall.
// Bubble slices and outsets are measured from those 2x images (body inset
// 5 pt, tail side 15 pt). Colours: #EFEAE2 chat ground, #53BDEB read ticks
// (WhatsApp design values; the asset catalog holds only AccentColor #1B934C).

const SEND_LIMIT = 80;
const PREFIX = "/parametric-interface/v4/apps/whatsapp";

type Entry =
  | { kind: "in"; key: string; text: string; time: string; at: number; arriving: boolean }
  | { kind: "out"; key: string; text: string; time: string; at: number; read: boolean };

type Row = Entry & { tail: boolean };

function Icon({ name, className }: { name: string; className: string }) {
  return <span aria-hidden="true" className={className} style={{ ["--src" as string]: `url(${PREFIX}/${name}@2x.png)` }} />;
}

function WhatsAppState({ seat, lines, replies, clock, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const last = lines.at(-1);
  // The ex types while a line is being sung; the message is sent when it ends.
  const typing = Boolean(last && last.current && last.sung < last.words.length);

  const rows = useMemo(() => {
    const landed = lines.filter((line) => !(line.current && line.sung < line.words.length));
    const startOf = new Map(lines.map((line) => [line.cueIndex, line.startMs]));
    const lastLanded = landed.at(-1)?.cueIndex;
    const entries: Entry[] = [
      ...landed.map((line): Entry => ({
        kind: "in",
        key: `l${line.cueIndex}`,
        text: line.full,
        time: formatSongClock(line.startMs),
        at: line.cueIndex,
        arriving: line.cueIndex === lastLanded,
      })),
      ...replies.slice(-24).map((reply): Entry => {
        const startMs = startOf.get(reply.afterCue);
        return {
          kind: "out",
          key: `r${reply.id}`,
          text: reply.text,
          time: startMs === undefined ? clock : formatSongClock(startMs),
          at: reply.afterCue + 0.5,
          // Seen once the ex starts on a later line.
          read: lines.some((line) => line.cueIndex > reply.afterCue),
        };
      }),
    ].sort((a, b) => a.at - b.at);

    return entries.map((entry, index): Row => {
      const next = entries[index + 1];
      return { ...entry, tail: !next || next.kind !== entry.kind };
    });
  }, [lines, replies, clock]);

  // The chat keeps its newest message in view, as WhatsApp does.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight, reducedMotion);
  }, [rows, typing, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const subtitle = typing ? "typing…" : lines.length ? "online" : "last seen yesterday at 23:52";
  const firstLine = lines[0];

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
            <span className={styles.peerStatus}>{subtitle}</span>
          </span>
        </span>
        <span className={styles.calls}>
          <Icon name="video" className={styles.video} />
          <Icon name="phone" className={styles.phone} />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          <p className={styles.day}><span>Yesterday</span></p>
          <p className={styles.bubble} data-side="in">
            you left your hoodie here
            <Meta time="23:41" />
          </p>
          <p className={styles.bubble} data-side="in" data-tail>
            should i just keep it
            <Meta time="23:41" />
          </p>
          <p className={styles.bubble} data-side="out" data-tail>
            Keep it. Don&apos;t text me.
            <Meta time="23:50" status="read" />
          </p>
          {firstLine ? <p className={styles.day}><span>Today</span></p> : null}
          {rows.map((row) =>
            row.kind === "in" ? (
              <p key={row.key} className={styles.bubble} data-side="in" data-tail={row.tail || undefined} data-arriving={row.arriving || undefined}>
                {row.text}
                <Meta time={row.time} />
              </p>
            ) : (
              <p key={row.key} className={styles.bubble} data-side="out" data-tail={row.tail || undefined}>
                {row.text}
                <Meta time={row.time} status={row.read ? "read" : "delivered"} />
              </p>
            ),
          )}
          {typing ? (
            <p className={styles.typing} data-side="in" data-tail aria-label={`${contact.name} is typing`}>
              <i />
              <i />
              <i />
            </p>
          ) : null}
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

/** Time and ticks, bottom-right inside the bubble; an invisible twin reserves their room on the last line. */
function Meta({ time, status }: { time: string; status?: "delivered" | "read" }) {
  const content = (
    <>
      {time}
      {status ? <span className={styles.ticks} data-status={status} /> : null}
    </>
  );
  return (
    <>
      <span className={styles.metaSpace} aria-hidden="true">{content}</span>
      <span className={styles.meta}>{content}</span>
    </>
  );
}

export default memo(WhatsAppState);
