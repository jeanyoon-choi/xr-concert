"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { ThreadsIcon, ThreadsLogo, type ThreadsIconName } from "./icons";
import styles from "./threads.module.css";

// Threads (iOS), light, the home "For you" feed. Each sung line is a
// different stranger's short text post: it lands at the top of the feed as
// if the feed just refreshed, its text typing in word by word, and the older
// lines slide down beneath it. The song becomes the overheard mood of many
// accounts at once — no one is talking to you, everyone is posting it. The
// "What's new?" composer at the top is real: the participant's post goes
// into the feed after the line it followed.
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
// the + create well) follow the iOS app and are not measured from a capture.

const POST_LIMIT = 500;

const PEOPLE = [
  { user: "mina.yoon", tint: "#c7a17a" },
  { user: "theo_writes", tint: "#7f9bb3" },
  { user: "dani.lpz", tint: "#a6879f" },
  { user: "sooah_", tint: "#8aa39a" },
  { user: "marcus.jpg", tint: "#9a9a72" },
  { user: "elle.ok", tint: "#b38a7f" },
  { user: "jiwoo.kk", tint: "#7c8db0" },
  { user: "priya.ram", tint: "#b09a7c" },
  { user: "nate.on.film", tint: "#8e96a8" },
  { user: "yuna_hh", tint: "#a99486" },
  { user: "camille.m", tint: "#93a37f" },
  { user: "oskar.b", tint: "#9c8fb0" },
] as const;

const ME = [
  { user: "jun.0412", tint: "#6f7f94" },
  { user: "seoyeon.ii", tint: "#94806f" },
  { user: "hyun_w", tint: "#7f946f" },
  { user: "alex.kwon", tint: "#8f7094" },
] as const;

/** The feed at rest: ordinary posts from before the song. */
const RESTING = [
  { user: "hannah.reads", tint: "#a3917a", age: "14m", text: "the 6 train being on time two days in a row has me suspicious", replies: 6, likes: 88, reposts: 2 },
  { user: "kitchen.leo", tint: "#7a9aa3", age: "38m", text: "made the soup again. added more garlic than the recipe says. no regrets", replies: 11, likes: 204, reposts: 5 },
  { user: "ari.studio", tint: "#a37a8c", age: "1h", text: "unpopular opinion: the second coffee is always better than the first", replies: 23, likes: 341, reposts: 9 },
  { user: "gwen.outside", tint: "#7f8f7a", age: "2h", text: "walked home the long way tonight. the city smells like rain and roasted chestnuts", replies: 4, likes: 117, reposts: 1 },
  { user: "sungmin.dev", tint: "#8c84a3", age: "3h", text: "does anyone actually read the group chat after 40 unread messages or do we all just react with a heart", replies: 31, likes: 512, reposts: 14 },
] as const;

type Item = { key: string; user: string; tint: string; age: string; text: string; replies: number; reposts: number; likes: number; arriving: boolean; typing: boolean };

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

function Post({ item }: { item: Item }) {
  return (
    <div className={styles.slot} data-arriving={item.arriving || undefined}>
      <article className={styles.post}>
        <Avatar user={item.user} tint={item.tint} />
        <div className={styles.main}>
          <div className={styles.head}>
            <strong>{item.user}</strong>
            <span className={styles.time}>{item.age}</span>
            <span className={styles.more}>
              <ThreadsIcon name="more" size={20} />
            </span>
          </div>
          <p className={styles.text}>
            {item.text}
            {item.typing ? <span className={styles.caret} /> : null}
          </p>
          <div className={styles.actions}>
            <Action icon="heart" count={item.likes} label="Like" />
            <Action icon="comment" count={item.replies} label="Reply" />
            <Action icon="repost" count={item.reposts} label="Repost" />
            <Action icon="share" count={0} label="Share" />
          </div>
        </div>
      </article>
    </div>
  );
}

function ThreadsState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const me = ME[seat % ME.length]!;
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);
  const now = lines.at(-1)?.startMs ?? 0;
  const lastReply = replies.at(-1)?.id;

  // Newest first: each line is someone else's post; the participant's posts
  // sit above the line they followed.
  const items = useMemo(() => {
    const entries = [
      ...lines.map((line, index) => {
        const person = PEOPLE[(line.cueIndex * 5 + seat * 3) % PEOPLE.length]!;
        const older = lines.length - 1 - index;
        const s = line.cueIndex * 7 + seat;
        return {
          at: line.cueIndex,
          item: {
            key: `l${line.cueIndex}`,
            user: person.user,
            tint: person.tint,
            age: age(now - line.startMs),
            text: line.text,
            likes: older * 4 + (s % 5),
            replies: older > 0 ? s % 4 : 0,
            reposts: older > 1 && s % 3 === 0 ? 1 : 0,
            arriving: index === lines.length - 1,
            typing: line.current,
          },
        };
      }),
      ...replies.map((reply) => ({
        at: reply.afterCue + 0.5,
        item: { key: `r${reply.id}`, user: me.user, tint: me.tint, age: "1m", text: reply.text, likes: 0, replies: 0, reposts: 0, arriving: reply.id === lastReply, typing: false },
      })),
    ];
    return entries.sort((a, b) => b.at - a.at).map((entry) => entry.item);
  }, [lines, replies, now, seat, me, lastReply]);

  const topKey = items[0]?.key;

  // A refreshed feed shows its newest post at the top.
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || !shown) return;
    feed.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [topKey, shown, reducedMotion]);

  const post = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, POST_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label="Threads, For you" inert={!shown} data-still={reducedMotion || undefined}>
      <header className={styles.bar}>
        <ThreadsLogo size={32} />
      </header>

      <div ref={feedRef} className={styles.feed} data-feed>
        <form className={styles.composer} onSubmit={post}>
          <Avatar user={me.user} tint={me.tint} />
          <div className={styles.main}>
            <strong className={styles.me}>{me.user}</strong>
            <label className={styles.field}>
              <span className={styles.hidden}>Start a thread</span>
              <textarea
                value={draft}
                rows={1}
                maxLength={POST_LIMIT}
                placeholder="What's new?"
                onChange={(event) => setDraft(event.target.value)}
                enterKeyHint="send"
              />
            </label>
            <div className={styles.tools}>
              {(["image", "gif", "poll", "location"] as const).map((tool) => (
                <ThreadsIcon key={tool} name={tool} size={20} />
              ))}
              {draft.trim() ? (
                <button type="submit" className={styles.postButton}>
                  Post
                </button>
              ) : null}
            </div>
          </div>
        </form>

        {items.map((item) => (
          <Post key={item.key} item={item} />
        ))}

        {RESTING.map((rest) => (
          <Post key={rest.user} item={{ key: rest.user, user: rest.user, tint: rest.tint, age: rest.age, text: rest.text, likes: rest.likes, replies: rest.replies, reposts: rest.reposts, arriving: false, typing: false }} />
        ))}
      </div>

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
