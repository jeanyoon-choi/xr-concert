"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { ThreadsIcon, type ThreadsIconName } from "./icons";
import styles from "./threads.module.css";
import { follow } from "../follow";

// Threads (iOS), light, one thread opened on its own page — hers. The phone
// belongs to the woman writing: every sung line is the next post she adds to
// her own thread, typed word by word, chained to the one before by the thread
// line that runs from her avatar down to the next. Nobody else is on the
// screen and nobody has answered: a small personal account, a like or two,
// single-digit views. Before the song the thread holds only her opening post.
// The "Reply to …" field docked above the tab bar is real: what the
// participant posts is added to the thread, as her, after the line it
// followed. A line marked bold is set in bold.
//
// Sources (fetched 2026-11-03 from www.threads.com and its
// static.cdninstagram.com rsrc bundles): every glyph and the logo path are
// copied from the served Barcelona/Threads icon modules (see icons.tsx); the
// light tokens are the served `.__fb-light-mode` variables — secondary icon
// and text rgb(153 153 153), charcoal rgb(66 66 66), navigation icon
// rgb(184 184 184), media outline rgba(0 0 0 / 0.15), liked rgb(255 48 64),
// primary button black; relative stamps follow BaseRelativeTimestampUtils'
// minimized form ("1m" under a minute, then minutes). Avatars are monograms
// (no portraits). Layout metrics (36 pt avatars, 15/21 text, 16 pt margins,
// the + create well, the "Thread" title with its view count, the reply pill)
// follow the iOS app and are not measured from a capture. Drawn here, not
// served: the header's back chevron (a plain two-stroke chevron).

const POST_LIMIT = 500;

/** Whose thread it is, per seat. */
const AUTHORS = [
  { user: "mina.yoon", tint: "#c7a17a" },
  { user: "dani.lpz", tint: "#a6879f" },
  { user: "sooah_", tint: "#8aa39a" },
  { user: "elle.ok", tint: "#b38a7f" },
  { user: "yuna_hh", tint: "#a99486" },
  { user: "camille.m", tint: "#93a37f" },
] as const;

/** Her thread before the song: the post that opens it. */
const OPENER = "ok i'm just going to say it here";

type Item = { key: string; age: string; text: string; likes: number; arriving: boolean; typing: boolean; bold: boolean };

/** The served "minimized" relative stamp: "1m" under a minute, then minutes. */
function age(ms: number) {
  return `${Math.max(1, Math.floor(ms / 60_000))}m`;
}

function Avatar({ user, tint, size = 36 }: { user: string; tint: string; size?: number }) {
  return (
    <span className={styles.avatar} aria-hidden="true" style={{ width: size, height: size, background: tint, fontSize: size * 0.42 }}>
      {user.charAt(0).toUpperCase()}
    </span>
  );
}

function Action({ icon, count, label }: { icon: ThreadsIconName; count: number; label: string }) {
  return (
    <span className={styles.action} aria-label={label}>
      <ThreadsIcon name={icon} size={19} />
      {count > 0 ? <span>{count}</span> : null}
    </span>
  );
}

function Post({ item, user, tint, up, down }: { item: Item; user: string; tint: string; up: boolean; down: boolean }) {
  return (
    <div className={styles.slot} data-arriving={item.arriving || undefined}>
      <article className={styles.post} data-up={up || undefined} data-down={down || undefined} data-row={item.key}>
        <div className={styles.gutter}>
          <Avatar user={user} tint={tint} />
        </div>
        <div className={styles.main}>
          <div className={styles.head}>
            <strong>{user}</strong>
            <span className={styles.time}>{item.age}</span>
            <span className={styles.more}>
              <ThreadsIcon name="more" size={20} />
            </span>
          </div>
          <p data-lyric className={styles.text} style={item.bold ? { fontWeight: 700 } : undefined}>
            {item.text}
            {item.typing ? <span className={styles.caret} /> : null}
          </p>
          <div className={styles.actions}>
            <Action icon="heart" count={item.likes} label="Like" />
            <Action icon="comment" count={0} label="Reply" />
            <Action icon="repost" count={0} label="Repost" />
            <Action icon="share" count={0} label="Share" />
          </div>
        </div>
      </article>
    </div>
  );
}

function ThreadsState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const me = AUTHORS[seat % AUTHORS.length]!;
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const now = lines.at(-1)?.startMs ?? 0;
  const lastReply = replies.at(-1)?.id;

  // Oldest first, as a thread reads: each line is her next post; what the
  // participant posts is hers too, after the line it followed.
  const items = useMemo(() => {
    const entries = [
      ...lines.map((line, index) => {
        const older = lines.length - 1 - index;
        return {
          at: line.cueIndex,
          item: {
            key: `l${line.cueIndex}`,
            age: age(now - line.startMs),
            text: line.text,
            likes: older > 1 && (line.cueIndex + seat) % 3 === 0 ? 1 : 0,
            arriving: index === lines.length - 1,
            typing: line.current,
            bold: Boolean(line.bold),
          },
        };
      }),
      ...replies.map((reply) => ({
        at: reply.afterCue + 0.5,
        item: { key: `r${reply.id}`, age: "1m", text: reply.text, likes: 0, arriving: reply.id === lastReply, typing: false, bold: false },
      })),
    ];
    const sorted = entries.sort((a, b) => a.at - b.at).map((entry) => entry.item);
    return sorted.length > 0 ? sorted : [{ key: "opener", age: "2m", text: OPENER, likes: 0, arriving: false, typing: false, bold: false }];
  }, [lines, replies, now, seat, lastReply]);

  const last = items.at(-1);
  const lastKey = last?.key;
  const lastText = last?.text;

  // The thread keeps the post being written in view above the reply field.
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || !shown) return;
    follow(feed, Math.max(0, feed.scrollHeight - feed.clientHeight), reducedMotion);
  }, [lastKey, lastText, shown, reducedMotion]);

  const post = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, POST_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`Threads, thread by ${me.user}`} inert={!shown} data-still={reducedMotion || undefined}>
      <header className={styles.bar}>
        <span className={styles.back} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 4.5 7.5 12l7.5 7.5" />
          </svg>
        </span>
        <span className={styles.barTitle}>
          <strong>Thread</strong>
          <span>{3 + (seat % 4) * 2 + Math.min(6, items.length)} views</span>
        </span>
        <span className={styles.barEnd} aria-hidden="true">
          <ThreadsIcon name="more" size={22} />
        </span>
      </header>

      <div ref={feedRef} className={styles.feed} data-feed>
        {items.map((item, index) => (
          <Post key={item.key} item={item} user={me.user} tint={me.tint} up={index > 0} down={index < items.length - 1} />
        ))}
      </div>

      <form className={styles.composer} onSubmit={post}>
        <Avatar user={me.user} tint={me.tint} size={24} />
        <label className={styles.field}>
          <span className={styles.hidden}>Add to thread</span>
          <textarea
            value={draft}
            rows={1}
            maxLength={POST_LIMIT}
            placeholder={`Reply to ${me.user}…`}
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="send"
          />
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.postButton}>
            Post
          </button>
        ) : null}
      </form>

      <nav className={styles.tabbar} aria-hidden="true">
        <span className={styles.tab} data-active>
          <ThreadsIcon name="homeFill" size={26} />
        </span>
        <span className={styles.tab}>
          <ThreadsIcon name="search" size={26} />
        </span>
        <span className={styles.create}>
          <ThreadsIcon name="create" size={22} />
        </span>
        <span className={styles.tab}>
          <ThreadsIcon name="activity" size={26} />
        </span>
        <span className={styles.tab}>
          <ThreadsIcon name="profile" size={26} />
        </span>
      </nav>
    </section>
  );
}

export default memo(ThreadsState);
