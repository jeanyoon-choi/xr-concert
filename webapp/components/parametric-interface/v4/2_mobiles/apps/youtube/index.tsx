"use client";

// YouTube iOS, light theme, watch page of a live stream with its live chat open.
//
// Sources: ported from the measured replica in experiments-jyc SCC
// components/mobile/clone/14 (record docs/experiments/sns/mobile/14.md), whose
// watch page — 16:9 player, 18 pt title and meta, channel row with the black
// Subscribe pill, action pills, outline glyphs, #ff0033 red — was checked
// against the YouTube App Store iPhone frames
// (apps.apple.com/us/app/youtube-watch-listen-stream/id544007664). The live
// chat panel (Top chat ▾ header, 24 pt default-letter avatars, @handle then
// message on one line, "Chat..." composer) is a reconstruction of the
// current mobile live chat; the channel and every viewer are fictional.
//
// Lyric slot: the live chat. The stream is a small channel singing the song
// live, and the room sings along: each sung line arrives as a chat message
// from a different viewer, typed word by word as it is sung, the chat
// scrolling up like YouTube live chat. The composer is real — what the
// participant sends goes through `act` and lands in the chat under their own
// handle, after the line it followed.

import { Roboto } from "next/font/google";
import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Icon } from "./icons";
import styles from "./youtube.module.css";
import { follow } from "../follow";

const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", preload: false });

const SEND_LIMIT = 200;
const STILL = "/parametric-interface/v4/apps/youtube/stage.svg";
const ROW_LIMIT = 60;

type Viewer = { readonly handle: string; readonly tint: string };

// YouTube's default avatars: a coloured disc with the handle's first letter.
const VIEWERS: readonly Viewer[] = [
  { handle: "@marigold-77", tint: "#5c6bc0" },
  { handle: "@hyunwoo.k", tint: "#00897b" },
  { handle: "@user-ty3kd9vq2", tint: "#ef6c00" },
  { handle: "@lia.notes", tint: "#8e24aa" },
  { handle: "@bennyboo", tint: "#3949ab" },
  { handle: "@sora_draws", tint: "#c2185b" },
  { handle: "@jessa.mp3", tint: "#00796b" },
  { handle: "@naomi-reads", tint: "#6d4c41" },
  { handle: "@kiwikid", tint: "#689f38" },
  { handle: "@user-m8ql2ex", tint: "#0288d1" },
  { handle: "@dahliaa", tint: "#d81b60" },
  { handle: "@rin.tapes", tint: "#5e35b1" },
  { handle: "@paolo-jm", tint: "#f4511e" },
  { handle: "@itsjustcass", tint: "#039be5" },
];

const SEEDS: readonly { viewer: number; text: string }[] = [
  { viewer: 1, text: "hii from seoul" },
  { viewer: 0, text: "first time catching her live" },
  { viewer: 2, text: "is she doing toxic till the end??" },
  { viewer: 4, text: "audio is so good tonight" },
  { viewer: 5, text: "requested this last week 🙏" },
  { viewer: 9, text: "hi chat" },
  { viewer: 6, text: "the lighting in this room 😩" },
  { viewer: 7, text: "she said after this one" },
  { viewer: 8, text: "PLEASE sing it" },
  { viewer: 3, text: "🎧🎧" },
];

// What the room says between lines (every other line, once it has been sung).
const REACTIONS = ["😭😭😭", "her voice tho", "this line 💀", "SHE ATE", "crying rn", "the way chat is singing along", "🔥🔥", "goosebumps"];

const OWN_HANDLES = ["@user-k3v9qa", "@user-m7tz2p", "@user-q8wd4n", "@user-x2hs6r", "@user-b5ny8e", "@user-j9lc3u"];

type Row = { key: string; handle: string; tint: string; text: string; own?: boolean };

function Avatar({ handle, tint }: { handle: string; tint: string }) {
  return (
    <span className={styles.avatar} style={{ background: tint }} aria-hidden="true">
      {handle.replace(/^@/, "").charAt(0).toUpperCase()}
    </span>
  );
}

function YouTubeState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const own = OWN_HANDLES[seat % OWN_HANDLES.length]!;
  const watching = (2417 + seat * 163).toLocaleString("en-US");

  const rows = useMemo(() => {
    const seeded: Row[] = SEEDS.map((seed, index) => {
      const viewer = VIEWERS[(seed.viewer + seat) % VIEWERS.length]!;
      return { key: `s${index}`, handle: viewer.handle, tint: viewer.tint, text: seed.text };
    });
    const timed: (Row & { at: number })[] = [];
    for (const line of lines) {
      // A different viewer for every line, offset per seat so phones differ.
      const viewer = VIEWERS[(line.cueIndex * 5 + seat * 3) % VIEWERS.length]!;
      timed.push({ at: line.cueIndex, key: `l${line.cueIndex}`, handle: viewer.handle, tint: viewer.tint, text: line.text });
      if (!line.current && line.cueIndex % 2 === 1) {
        const other = VIEWERS[(line.cueIndex * 5 + seat * 3 + 7) % VIEWERS.length]!;
        timed.push({ at: line.cueIndex + 0.7, key: `f${line.cueIndex}`, handle: other.handle, tint: other.tint, text: REACTIONS[line.cueIndex % REACTIONS.length]! });
      }
    }
    for (const reply of replies) {
      timed.push({ at: reply.afterCue + 0.5, key: `r${reply.id}`, handle: own, tint: "#7b1fa2", text: reply.text, own: true });
    }
    timed.sort((a, b) => a.at - b.at);
    return [...seeded, ...timed].slice(-ROW_LIMIT);
  }, [lines, replies, seat, own]);

  // Live chat keeps the newest message at the bottom, in view.
  useLayoutEffect(() => {
    const chat = chatRef.current;
    if (!chat || !shown) return;
    follow(chat, chat.scrollHeight, reducedMotion);
  }, [rows, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={`${styles.app} ${roboto.className}`} aria-label="YouTube, live stream" inert={!shown}>
      <div className={styles.player}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a local still stands in for the live video */}
        <img className={styles.video} src={STILL} alt="" draggable={false} />
        <span className={styles.liveBadge}>LIVE</span>
        <span className={styles.liveLine} aria-hidden="true" />
      </div>

      <div className={styles.info}>
        <h2 className={styles.title}>late night live 🌙 singing toxic till the end + your requests</h2>
        <p className={styles.meta}>
          {watching} watching now<span className={styles.dot}>Started streaming 18 minutes ago</span>
          <b>...more</b>
        </p>
      </div>

      <div className={styles.channelRow}>
        <span className={styles.channel}>
          <span className={styles.channelAvatar} aria-hidden="true">
            H
          </span>
          <strong>Hana Sings</strong>
          <span>312K</span>
        </span>
        {subscribed ? (
          <button type="button" className={styles.subscribed} onClick={() => setSubscribed(false)}>
            Subscribed
            <Icon name="chevron-down" />
          </button>
        ) : (
          <button type="button" className={styles.subscribe} onClick={() => setSubscribed(true)}>
            Subscribe
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <span className={styles.likeGroup}>
          <button type="button" aria-pressed={liked} aria-label="Like" onClick={() => setLiked((value) => !value)}>
            <Icon name={liked ? "like-fill" : "like"} />
            {liked ? "8.2K" : "8.1K"}
          </button>
          <i />
          <span>
            <Icon name="dislike" />
          </span>
        </span>
        <span className={styles.pill}>
          <Icon name="share" />
          Share
        </span>
        <span className={styles.pill}>
          <Icon name="clip" />
          Clip
        </span>
        <span className={styles.pill}>
          <Icon name="save" />
          Save
        </span>
      </div>

      <section className={styles.chat} aria-label="Live chat">
        <header className={styles.chatHead}>
          <span className={styles.chatTitle}>
            Top chat
            <Icon name="chevron-down" />
          </span>
          <span className={styles.chatTools} aria-hidden="true">
            <Icon name="kebab" />
            <Icon name="close" />
          </span>
        </header>

        <div ref={chatRef} className={styles.messages} data-feed>
          <div className={styles.rows}>
            {rows.map((row) => (
              <p key={row.key} className={styles.message} data-own={row.own || undefined}>
                <Avatar handle={row.handle} tint={row.tint} />
                <span className={styles.messageText}>
                  <span className={styles.author}>{row.handle}</span>
                  {row.text}
                </span>
              </p>
            ))}
          </div>
        </div>

        <form className={styles.composer} onSubmit={send}>
          <Avatar handle={own} tint="#7b1fa2" />
          <label className={styles.field}>
            <span className={styles.visuallyHidden}>Chat publicly as {own}</span>
            <input
              value={draft}
              maxLength={SEND_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Chat..."
              enterKeyHint="send"
              autoComplete="off"
            />
            <span className={styles.emoji} aria-hidden="true">
              <Icon name="emoji" />
            </span>
          </label>
          {draft.trim() ? (
            <button type="submit" className={styles.send} aria-label="Send">
              <Icon name="send" />
            </button>
          ) : null}
        </form>
      </section>
    </section>
  );
}

export default memo(YouTubeState);
