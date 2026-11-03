"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { clockAgo, dateLabel, formatSongClock } from "../../clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./discord.module.css";
import { follow } from "../follow";

// Discord for iOS, a friend server's #general (dark). The lyric is a member
// posting in the group: while a line is being sung, “<name> is typing…” sits
// above the composer and the message lands word by word; finished lines stay
// grouped under the poster's name, as Discord groups one person's run of
// messages. The composer is real: what the participant sends lands under
// their own name after the line it followed.
//
// Sources: avatars are Discord's own default avatars, served at
// cdn.discordapp.com/embed/avatars/{0-5}.png. Colours are Discord's dark-theme
// tokens (background-primary #313338, secondary #2b2d31, tertiary #1e1f22,
// text-normal #dbdee1, header-primary #f2f3f5, text-muted #949ba4,
// interactive-normal #b5bac1, blurple #5865f2) and its preset role colours.
// Glyphs are drawn here after the iOS app's channel header, typing indicator
// and composer; Discord ships them only inside its client bundle.

const AVATAR = (n: number) => `/parametric-interface/v4/apps/discord/avatar-${n}.png`;
const SEND_LIMIT = 80;

type Member = { readonly name: string; readonly avatar: number; readonly color?: string };

const FRIENDS: readonly Member[] = [
  { name: "noodle", avatar: 2, color: "#1abc9c" },
  { name: "kev", avatar: 4, color: "#e67e22" },
  { name: "yuna ☾", avatar: 5, color: "#e91e63" },
];
const ME: Member = { name: "you", avatar: 3 };

type Post = {
  readonly key: string;
  readonly who: Member;
  readonly minute: number;
  readonly time: string;
  readonly text: string;
  readonly arriving?: boolean;
};

const minuteOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function Glyph({ name }: { name: "back" | "chevron" | "hash" | "search" | "members" | "plus" | "apps" | "gift" | "emoji" | "mic" | "send" }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M20 12H4.5M11 5.5 4.5 12l6.5 6.5" {...s} strokeWidth={2.2} /></svg>;
    case "chevron":
      return <svg aria-hidden="true" viewBox="0 0 8 12" width="7" height="11"><path d="m1.5 1.5 4.5 4.5-4.5 4.5" {...s} strokeWidth={2} /></svg>;
    case "hash":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M10 3 7.5 21M16.5 3 14 21M4 8.5h16.5M3.5 15.5H20" {...s} strokeWidth={2.2} /></svg>;
    case "search":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><circle cx="10.5" cy="10.5" r="6.5" {...s} strokeWidth={2.2} /><path d="m15.5 15.5 5 5" {...s} strokeWidth={2.2} /></svg>;
    case "members":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><circle cx="9" cy="8" r="4" fill="currentColor" /><path d="M1.5 20a7.5 7.5 0 0 1 15 0Z" fill="currentColor" /><path d="M15.5 4.3a4 4 0 0 1 0 7.4M19 13.6A7.5 7.5 0 0 1 22.5 20" {...s} strokeWidth={2.1} /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M12 4.5v15M4.5 12h15" {...s} strokeWidth={2.4} /></svg>;
    case "apps":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path d="M5 9.2a4.2 4.2 0 1 1 8.4 0v1.2h1.6a4 4 0 0 1 0 8H9a4 4 0 0 1-4-4Z" fill="currentColor" /><circle cx="18.2" cy="6.3" r="2.6" fill="currentColor" /></svg>;
    case "gift":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><rect x="3.5" y="8" width="17" height="4.2" rx="1" fill="currentColor" /><path d="M5 13.4h6.2V21H6a1 1 0 0 1-1-1ZM12.8 13.4H19V20a1 1 0 0 1-1 1h-5.2Z" fill="currentColor" /><path d="M12 7.6C10.6 4.2 7.4 3.6 6.8 5.4c-.5 1.5 2 2.3 5.2 2.2Zm0 0c1.4-3.4 4.6-4 5.2-2.2.5 1.5-2 2.3-5.2 2.2Z" {...s} strokeWidth={1.8} /></svg>;
    case "emoji":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="currentColor" /><circle cx="8.6" cy="10" r="1.5" fill="#1e1f22" /><circle cx="15.4" cy="10" r="1.5" fill="#1e1f22" /><path d="M7.4 13.8a5 5 0 0 0 9.2 0Z" fill="#1e1f22" /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><rect x="8" y="2.5" width="8" height="12.5" rx="4" fill="currentColor" /><path d="M4.8 11a7.2 7.2 0 0 0 14.4 0M12 18.2v3.3" {...s} strokeWidth={2.1} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><path d="M3.4 3.6 21 12 3.4 20.4 5.7 12Z" fill="currentColor" /><path d="M5.7 12h6.8" stroke="#5865f2" strokeWidth={1.6} strokeLinecap="round" /></svg>;
  }
}

function Message({ post, grouped }: { post: Post; grouped: boolean }) {
  return (
    <article className={styles.message} data-grouped={grouped || undefined} data-arriving={post.arriving || undefined}>
      {grouped ? null : (
        // eslint-disable-next-line @next/next/no-img-element -- Discord's served default avatar, 80 px
        <img className={styles.avatar} src={AVATAR(post.who.avatar)} alt="" width={40} height={40} draggable={false} />
      )}
      <div className={styles.body}>
        {grouped ? null : (
          <p className={styles.meta}>
            <b style={post.who.color ? { color: post.who.color } : undefined}>{post.who.name}</b>
            <time>Today at {post.time}</time>
          </p>
        )}
        <p className={styles.text}>{post.text}</p>
      </div>
    </article>
  );
}

// Today's earlier chatter, on the wall clock: 43, 38, 26 and 25 minutes before the song.
const AT = { p1: clockAgo(43), p2: clockAgo(38), p4: clockAgo(26), p5: clockAgo(25) };
const DAY = dateLabel("en-US", { month: "long", day: "numeric", year: "numeric" });

function DiscordState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const poster: Member = useMemo(() => ({ name: contact.name.toLowerCase(), avatar: 0, color: "#3498db" }), [contact.name]);
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  // The evening before the song: ordinary server chatter.
  const prior: readonly Post[] = useMemo(
    () => [
      { key: "p1", who: FRIENDS[1]!, minute: minuteOf(AT.p1), time: AT.p1, text: "anyone on tonight? need 2 for ranked" },
      { key: "p2", who: FRIENDS[0]!, minute: minuteOf(AT.p2), time: AT.p2, text: "cant, still at work 💀" },
      { key: "p3", who: FRIENDS[0]!, minute: minuteOf(AT.p2), time: AT.p2, text: "maybe after 11" },
      { key: "p4", who: FRIENDS[2]!, minute: minuteOf(AT.p4), time: AT.p4, text: "has anyone heard from " + poster.name + " today" },
      { key: "p5", who: FRIENDS[1]!, minute: minuteOf(AT.p5), time: AT.p5, text: "no?? why" },
    ],
    [poster.name],
  );

  // Lines and replies in song order: a reply sits after the line it followed.
  const posts = useMemo(() => {
    const last = lines.at(-1);
    const entries: { at: number; post: Post }[] = [
      ...lines.map((line) => {
        const time = formatSongClock(line.startMs);
        return {
          at: line.cueIndex,
          post: { key: `l${line.cueIndex}`, who: poster, minute: minuteOf(time), time, text: line.text, arriving: !reducedMotion && line === last && line.current } satisfies Post,
        };
      }),
      ...replies.map((reply) => {
        const time = formatSongClock(lines.find((line) => line.cueIndex === reply.afterCue)?.startMs ?? 0);
        return { at: reply.afterCue + 0.5, post: { key: `r${reply.id}`, who: ME, minute: minuteOf(time), time, text: reply.text } satisfies Post };
      }),
    ];
    return entries.sort((a, b) => a.at - b.at).map((entry) => entry.post);
  }, [lines, poster, reducedMotion, replies]);

  const typing = lines.at(-1)?.current ?? false;

  // The channel keeps its newest message in view, as Discord does.
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || !shown) return;
    follow(feed, feed.scrollHeight, reducedMotion);
  }, [posts, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const all = [...prior, ...posts];

  return (
    <section className={styles.app} aria-label="Discord, #general" inert={!shown} data-still={reducedMotion || undefined}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Glyph name="back" />
          <span className={styles.badge}>{3 + (seat % 5)}</span>
        </span>
        <span className={styles.title}>
          <span className={styles.channel}>
            <Glyph name="hash" />
            general
            <Glyph name="chevron" />
          </span>
        </span>
        <span className={styles.action}>
          <Glyph name="search" />
        </span>
        <span className={styles.action}>
          <Glyph name="members" />
        </span>
      </header>

      <div ref={feedRef} className={styles.feed} data-feed>
        <div className={styles.rows}>
          <div className={styles.welcome}>
            <span className={styles.welcomeIcon}>
              <Glyph name="hash" />
            </span>
            <h2>Welcome to #general!</h2>
            <p>This is the start of the #general channel.</p>
          </div>
          <p className={styles.divider}>
            <span>{DAY}</span>
          </p>
          {all.map((post, index) => {
            const previous = all[index - 1];
            return <Message key={post.key} post={post} grouped={Boolean(previous && previous.who.name === post.who.name && post.minute - previous.minute <= 7)} />;
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <p className={styles.typing} aria-live="polite">
          {typing ? (
            <>
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>
                <b>{poster.name}</b> is typing…
              </span>
            </>
          ) : null}
        </p>
        <div className={styles.bar}>
          <span className={styles.round}>
            <Glyph name="plus" />
          </span>
          <span className={styles.round}>
            <Glyph name="apps" />
          </span>
          <span className={styles.round}>
            <Glyph name="gift" />
          </span>
          <label className={styles.field}>
            <span className={styles.visuallyHidden}>Message #general</span>
            <input
              value={draft}
              maxLength={SEND_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message #general"
              enterKeyHint="send"
              autoComplete="off"
            />
            <span className={styles.emoji}>
              <Glyph name="emoji" />
            </span>
          </label>
          {draft.trim() ? (
            <button type="submit" className={styles.send} aria-label="Send">
              <Glyph name="send" />
            </button>
          ) : (
            <span className={styles.round}>
              <Glyph name="mic" />
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

export default memo(DiscordState);
