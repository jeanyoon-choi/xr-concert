"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { dateLabel, formatSongClock } from "../../clock-face";
import type { SungLine } from "../../../model/lines";
import type { PhoneStateProps } from "../types";
import { XIcon, type XIconName } from "./icons";
import styles from "./x.module.css";
import { follow } from "../follow";

// X (iOS), dark "Lights out", the post-detail screen of a self-thread. The
// phone belongs to the thread's author: her opening post is the focal post,
// and each sung line is the next post she adds to the thread. The line being
// sung is typed into the docked composer (Post button, character ring); when
// the next line starts it is posted and joins the thread above, connected by
// the thread line. The composer is real: what the participant types replaces
// the lyric draft, and Post adds it to the thread after the line it followed.
//
// Sources: ported from experiments-jyc SCC apps/scc/components/mobile/clone/13
// (record apps/scc/docs/experiments/sns/mobile/13.md): x-web served tokens
// (#000 / #e7e9ea / #71767b / #2f3336 / #1d9bf0), 53 pt header, 40 pt avatars,
// 15/20 post text, 17/24 focal text, 18.75 pt action glyphs, thread line
// #333639 2 pt, 49 pt tab bar (Home, Search, Grok, Notifications, Chat), and
// every glyph path from abs.twimg.com/x-web icon modules (see icons.tsx).
// Chirp is not bundled (as in the replica); the iOS system font stands in.

const POST_LIMIT = 280;
const RING = 2 * Math.PI * 10;

const AUTHORS = [
  { name: "Hana Seo", handle: "hanaseo_", initials: "H", tint: "#7a5c8f" },
  { name: "Lena Morris", handle: "lenamorris", initials: "L", tint: "#3f6f8f" },
  { name: "Rae Kim", handle: "raekimm", initials: "R", tint: "#8f5c5c" },
  { name: "June Ortiz", handle: "juneortiz", initials: "J", tint: "#5c7f62" },
  { name: "Noa Park", handle: "noa_park", initials: "N", tint: "#8a7445" },
  { name: "Ivy Chen", handle: "ivychen__", initials: "I", tint: "#55688f" },
] as const;

type Author = (typeof AUTHORS)[number];

type Row = { key: string; text: string; age: string; seed: number };

/** "21:26" minus `minutes`, as X's 12-hour detail stamp. */
function stamp(clock: string, minutes: number) {
  const [h, m] = clock.split(":").map(Number);
  const total = ((h ?? 21) * 60 + (m ?? 0) - minutes + 1440) % 1440;
  const hour = Math.floor(total / 60);
  return `${hour % 12 || 12}:${String(total % 60).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/** Today as X's detail stamp writes it: "11/3/26". */
const DAY = dateLabel("en-US", { month: "numeric", day: "numeric", year: "2-digit" });

/** X's relative stamp: seconds, then minutes. */
function age(ms: number) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
}

function Avatar({ author, size = 40 }: { author: Author; size?: number }) {
  return (
    <span className={styles.avatar} aria-hidden="true" style={{ width: size, height: size, background: author.tint, fontSize: size * 0.45 }}>
      {author.initials}
    </span>
  );
}

function Action({ icon, count, label }: { icon: XIconName; count?: number; label: string }) {
  return (
    <span className={styles.action} aria-label={label}>
      <span className={styles.actionIcon}>
        <XIcon name={icon} size={18.75} />
      </span>
      {count ? <span className={styles.count}>{count}</span> : null}
    </span>
  );
}

function Post({ author, row, down, up }: { author: Author; row: Row; down: boolean; up: boolean }) {
  const s = row.seed;
  return (
    <article className={styles.post} data-down={down || undefined} data-up={up || undefined} data-row={row.key}>
      <div className={styles.gutter}>
        <Avatar author={author} />
      </div>
      <div className={styles.main}>
        <div className={styles.head}>
          <span className={styles.identity}>
            <strong>{author.name}</strong>
            <span className={styles.muted}>@{author.handle}</span>
            <span className={styles.muted}>· {row.age}</span>
          </span>
          <span className={styles.more}>
            <XIcon name="more" size={17} />
          </span>
        </div>
        <p className={styles.text}>{row.text}</p>
        <div className={styles.actions}>
          <Action icon="reply" count={s % 3} label="Reply" />
          <Action icon="repost" count={s % 4 === 0 ? 1 : 0} label="Repost" />
          <Action icon="heart" count={2 + (s % 9)} label="Like" />
          <Action icon="views" count={38 + ((s * 37) % 160)} label="Views" />
          <span className={styles.pair}>
            <Action icon="bookmark" label="Bookmark" />
            <Action icon="share" label="Share post" />
          </span>
        </div>
      </div>
    </article>
  );
}

function XState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const author = AUTHORS[seat % AUTHORS.length]!;
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const current: SungLine | undefined = lines.at(-1)?.current ? lines.at(-1) : undefined;
  const now = lines.at(-1)?.startMs ?? 0;
  const opened = formatSongClock(0);

  // Posted lines and the participant's own posts, in thread order.
  const rows = useMemo(() => {
    const posted = current ? lines.slice(0, -1) : lines;
    return [
      ...posted.map((line) => ({ at: line.cueIndex, row: { key: `l${line.cueIndex}`, text: line.full, age: age(now - line.startMs + 4000), seed: line.cueIndex * 7 + seat } })),
      ...replies.map((reply) => ({ at: reply.afterCue + 0.5, row: { key: `r${reply.id}`, text: reply.text, age: "now", seed: reply.id } })),
    ]
      .sort((a, b) => a.at - b.at)
      .map((entry) => entry.row);
  }, [current, lines, replies, now, seat]);

  const lastKey = rows.at(-1)?.key;

  // The thread keeps its newest post in view above the composer.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller || !shown) return;
    const last = lastKey ? scroller.querySelector<HTMLElement>(`[data-row="${lastKey}"]`) : null;
    const top = last ? last.offsetTop + last.offsetHeight - scroller.clientHeight + 64 : 0;
    follow(scroller, Math.max(0, top), reducedMotion);
  }, [lastKey, shown, reducedMotion]);

  const typing = draft.length > 0;
  const composed = typing ? draft : (current?.text ?? "");
  const remaining = POST_LIMIT - composed.length;

  const post = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, POST_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label={`X, thread by ${author.name}`} inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.back}>
          <XIcon name="back" size={22} />
        </span>
        <h1 className={styles.title}>Post</h1>
        <span className={styles.barEnd} />
      </header>

      <div ref={scrollRef} className={styles.scroller} data-feed>
        <article className={styles.focal}>
          <div className={styles.focalHead}>
            <Avatar author={author} />
            <span className={styles.focalWho}>
              <strong>{author.name}</strong>
              <span className={styles.muted}>@{author.handle}</span>
            </span>
            <span className={styles.more}>
              <XIcon name="more" size={17} />
            </span>
          </div>
          <p className={styles.focalText}>ok. some things I should have said out loud a long time ago. a thread 🧵</p>
          <p className={styles.meta}>
            {stamp(opened, 3)} · {DAY} · <strong>{(1204 + seat * 87).toLocaleString("en-US")}</strong> Views
          </p>
          <div className={styles.detailActions}>
            <Action icon="reply" count={4 + rows.length} label="Reply" />
            <Action icon="repost" count={3} label="Repost" />
            <Action icon="heart" count={41 + seat} label="Like" />
            <Action icon="bookmark" count={5} label="Bookmark" />
            <Action icon="share" label="Share post" />
          </div>
        </article>

        {rows.map((row, index) => (
          <Post key={row.key} author={author} row={row} up={index > 0} down={index < rows.length - 1} />
        ))}

      </div>

      <form className={styles.composer} data-open={composed ? true : undefined} onSubmit={post}>
        <p className={styles.replying}>
          Replying to <span>@{author.handle}</span>
        </p>
        <div className={styles.composeRow}>
          <Avatar author={author} size={32} />
          <label className={styles.field}>
            <span className={styles.hidden}>Post your reply</span>
            {!typing && current ? (
              <span className={styles.lyric} aria-hidden="true">
                {current.text}
                <span className={styles.caret} />
              </span>
            ) : null}
            <textarea
              value={draft}
              rows={composed ? 2 : 1}
              maxLength={POST_LIMIT}
              placeholder={current ? "" : "Post your reply"}
              onChange={(event) => setDraft(event.target.value)}
              enterKeyHint="send"
            />
          </label>
        </div>
        <div className={styles.tools}>
          {(["image", "gif", "sparkles", "poll", "emoji", "location"] as const).map((tool) => (
            <span key={tool} className={styles.tool}>
              <XIcon name={tool} size={20} />
            </span>
          ))}
          <span className={styles.spacer} />
          {composed ? (
            <svg className={styles.ring} viewBox="0 0 24 24" width="20" height="20" role="img" aria-label={`${remaining} characters remaining`}>
              <circle cx="12" cy="12" r="10" className={styles.ringTrack} />
              <circle cx="12" cy="12" r="10" className={styles.ringFill} strokeDasharray={`${Math.min(1, composed.length / POST_LIMIT) * RING} ${RING}`} />
            </svg>
          ) : null}
          <span className={styles.divider} />
          <span className={styles.addPost}>
            <XIcon name="plus" size={14} />
          </span>
          <button type="submit" className={styles.postButton} disabled={!composed}>
            Post
          </button>
        </div>
      </form>

      <nav className={styles.tabbar} aria-hidden="true">
        <XIcon name="homeFill" size={26} />
        <XIcon name="search" size={26} />
        <XIcon name="grok" size={26} />
        <span className={styles.bell}>
          <XIcon name="bell" size={26} />
          <span className={styles.badge}>3</span>
        </span>
        <XIcon name="chat" size={26} />
      </nav>
    </section>
  );
}

export default memo(XState);
