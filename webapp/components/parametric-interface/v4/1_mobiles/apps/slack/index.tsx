"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import { contactFor, type PhoneStateProps } from "../types";
import styles from "./slack.module.css";

// Slack for iOS, one channel open (light). The lyric is shift talk that is not
// about the shift: in a late work channel one coworker keeps posting the
// lines as consecutive messages — Slack folds them under one name and avatar —
// each filling word by word as it is sung, while the others leave small
// emoji reactions on the earlier ones. The composer is real: what the
// participant posts lands under their own name after the line it followed.
//
// Sources: avatars are Slack's own default profile images, served at
// a.slack-edge.com/df10d/img/avatars/ava_00NN-72.png (0001, 0005, 0010, 0014,
// 0018, 0022). Colours are Slack's light-theme tokens (text #1d1c1d, secondary
// #616061, link #1264a3, send green #007a5a, reacted blue #1d9bd1). The
// layout and glyphs (header, channel tabs, composer toolbar) follow the 2023+
// iOS channel view; the glyphs are drawn here because Slack ships its icon
// font only inside the app bundle. Started from experiments-jyc SCC
// mobiles/1/apps/team-chat (copied, not imported).

const AVATAR = (n: number) => `/parametric-interface/v4/apps/slack/avatar-${n}.png`;
const SEND_LIMIT = 80;

type Person = { readonly name: string; readonly avatar: number };

const SURNAMES = ["Park", "Lee", "Han", "Okafor", "Novak", "Reyes"] as const;
const CREW: readonly Person[] = [
  { name: "Priya Raman", avatar: 1 },
  { name: "Leo Brandt", avatar: 2 },
  { name: "Hana Seo", avatar: 3 },
  { name: "Marcus Bell", avatar: 4 },
];
const ME: Person = { name: "You", avatar: 0 };

const LYRIC_REACTIONS = [["👀", 2], ["🫠", 1], ["💀", 3], ["😬", 1], ["🥲", 2], ["🙃", 1]] as const;

type Reaction = readonly [string, number, boolean?];
type Post = {
  readonly key: string;
  readonly who: Person;
  readonly time: string;
  readonly text: string;
  readonly reactions?: readonly Reaction[];
  readonly thread?: { readonly count: number; readonly last: string; readonly heads: readonly number[] };
  readonly arriving?: boolean;
};

/** Slack folds a sender's consecutive messages sent within a few minutes. */
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

function Glyph({ name }: { name: "back" | "chevron" | "headphones" | "messages" | "canvas" | "files" | "pins" | "plus" | "format" | "at" | "emoji" | "camera" | "mic" | "send" | "addReaction" }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M19.5 12h-15M10.5 5.5 4 12l6.5 6.5" {...s} strokeWidth={2} /></svg>;
    case "chevron":
      return <svg aria-hidden="true" viewBox="0 0 8 12" width="7" height="11"><path d="m1.5 1.5 4.5 4.5-4.5 4.5" {...s} strokeWidth={1.7} /></svg>;
    case "headphones":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M4 15v-3a8 8 0 0 1 16 0v3" {...s} /><rect x="3.5" y="13.5" width="4.5" height="7" rx="2" {...s} /><rect x="16" y="13.5" width="4.5" height="7" rx="2" {...s} /></svg>;
    case "messages":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M3.5 4.5h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8l-3.5 3v-3h-1a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" {...s} strokeWidth={1.6} /></svg>;
    case "canvas":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M5 2.5h7l3.5 3.5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13.5a1 1 0 0 1 1-1Z" {...s} strokeWidth={1.6} /><path d="M7 10h6M7 13.5h4" {...s} strokeWidth={1.6} /></svg>;
    case "files":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M2.5 5.5a1 1 0 0 1 1-1h4l1.7 2h7.3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" {...s} strokeWidth={1.6} /></svg>;
    case "pins":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="m12 2.8 5.2 5.2-2.4.8-3 3 .2 3.4-1.4 1.4-3.2-3.2-4.6 4.6M7 10.2 3.8 7 5.2 5.6l3.4.2 3-3Z" {...s} strokeWidth={1.6} /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M10 3.5v13M3.5 10h13" {...s} strokeWidth={1.9} /></svg>;
    case "format":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="m2.5 18 5-12.5h1L13.5 18M4.4 13.5h7.2" {...s} /><path d="M20.5 12.2v5.8M20.5 14.2a2.9 2.9 0 1 0 0 1.6" {...s} /></svg>;
    case "at":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="3.6" {...s} /><path d="M15.6 9.5v3.8a2.4 2.4 0 0 0 4.8 0V12a8.4 8.4 0 1 0-3.4 6.8" {...s} /></svg>;
    case "emoji":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="8.6" {...s} /><path d="M8.3 14.2a4.3 4.3 0 0 0 7.4 0" {...s} /><circle cx="9.2" cy="9.8" r="1.1" fill="currentColor" /><circle cx="14.8" cy="9.8" r="1.1" fill="currentColor" /></svg>;
    case "camera":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 8.2a1.7 1.7 0 0 1 1.7-1.7h2.4l1.6-2.2h5.6l1.6 2.2h2.4a1.7 1.7 0 0 1 1.7 1.7v9.6a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7Z" {...s} /><circle cx="12" cy="12.8" r="3.6" {...s} /></svg>;
    case "mic":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect x="8.6" y="3" width="6.8" height="11.4" rx="3.4" {...s} /><path d="M5.4 11.4a6.6 6.6 0 0 0 13.2 0M12 18v3" {...s} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M3 3.2 17.4 10 3 16.8l2.3-6.8Z" fill="currentColor" stroke="currentColor" strokeWidth={1.2} strokeLinejoin="round" /></svg>;
    case "addReaction":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><path d="M15 2.5v5M12.5 5h5" {...s} strokeWidth={1.5} /><path d="M16.3 10.3A7 7 0 1 1 9.7 3.7" {...s} strokeWidth={1.5} /><path d="M6.8 11.8a3.6 3.6 0 0 0 6 0" {...s} strokeWidth={1.5} /><circle cx="7.6" cy="8.4" r="0.9" fill="currentColor" /><circle cx="12.2" cy="8.4" r="0.9" fill="currentColor" /></svg>;
  }
}

function Avatar({ person, size }: { person: Person; size: "message" | "head" }) {
  // eslint-disable-next-line @next/next/no-img-element -- a 72 px served avatar, no optimisation needed
  return <img className={size === "head" ? styles.head : styles.avatar} src={AVATAR(person.avatar)} alt="" width={size === "head" ? 20 : 36} height={size === "head" ? 20 : 36} draggable={false} />;
}

function Message({ post, grouped }: { post: Post; grouped: boolean }) {
  return (
    <article className={styles.message} data-grouped={grouped || undefined} data-arriving={post.arriving || undefined}>
      {grouped ? null : <Avatar person={post.who} size="message" />}
      <div className={styles.body}>
        {grouped ? null : (
          <p className={styles.meta}>
            <b>{post.who.name}</b>
            <time>{post.time}</time>
          </p>
        )}
        <p className={styles.text}>{post.text}</p>
        {post.reactions ? (
          <div className={styles.reactions}>
            {post.reactions.map(([emoji, count, mine]) => (
              <span key={emoji} className={styles.reaction} data-mine={mine || undefined}>
                <span className={styles.emoji}>{emoji}</span>
                {count}
              </span>
            ))}
            <span className={styles.reaction} data-add aria-label="Add reaction">
              <Glyph name="addReaction" />
            </span>
          </div>
        ) : null}
        {post.thread ? (
          <p className={styles.thread}>
            <span className={styles.heads}>
              {post.thread.heads.map((n) => <Avatar key={n} person={{ name: "", avatar: n }} size="head" />)}
            </span>
            <b>{post.thread.count} {post.thread.count === 1 ? "reply" : "replies"}</b>
            <span>{post.thread.last}</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function SlackState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const contact = contactFor(seat);
  const poster: Person = useMemo(() => ({ name: `${contact.name} ${SURNAMES[seat % SURNAMES.length]}`, avatar: 5 }), [contact.name, seat]);
  const [draft, setDraft] = useState("");
  const feedRef = useRef<HTMLDivElement>(null);

  // The afternoon before the song: ordinary edit-room traffic.
  const prior: readonly Post[] = useMemo(
    () => [
      {
        key: "p1",
        who: CREW[0]!,
        time: "18:42",
        text: "v7 of the cut is up in the review folder. Reel 3 is still missing the temp score, ignore the gap at 04:12",
        reactions: [["👀", 3], ["🙏", 2, true]],
        thread: { count: 4, last: "Last reply 2 hours ago", heads: [2, 3, 5] },
      },
      { key: "p2", who: CREW[1]!, time: "19:05", text: "color pass on sc 14 looks way too warm on my monitor, can someone else check" },
      { key: "p3", who: CREW[1]!, time: "19:06", text: "the skin tones specifically", reactions: [["👍", 1]] },
      { key: "p4", who: CREW[2]!, time: "20:18", text: "heading out. leaving the render running on edit bay 2, pls don't close premiere 🙏", reactions: [["✅", 2]] },
      { key: "p5", who: poster, time: "21:12", text: "still here. finishing the conform", reactions: [["🫡", 1]] },
    ],
    [poster],
  );

  // Lines and replies in song order: a reply sits after the line it followed.
  const posts = useMemo(() => {
    const last = lines.at(-1);
    const entries: { at: number; post: Post }[] = [
      ...lines.map((line, index) => {
        const settled = index < lines.length - 2;
        const reaction = LYRIC_REACTIONS[line.cueIndex % LYRIC_REACTIONS.length]!;
        return {
          at: line.cueIndex,
          post: {
            key: `l${line.cueIndex}`,
            who: poster,
            time: formatSongClock(line.startMs),
            text: line.text,
            reactions: settled && line.cueIndex % 3 !== 1 ? [reaction] : undefined,
            thread: settled && line.cueIndex % 7 === 4 ? { count: 1, last: "Last reply today at " + formatSongClock(line.startMs), heads: [1 + (line.cueIndex % 4)] } : undefined,
            arriving: !reducedMotion && line === last && line.current,
          } satisfies Post,
        };
      }),
      ...replies.map((reply) => ({
        at: reply.afterCue + 0.5,
        post: {
          key: `r${reply.id}`,
          who: ME,
          time: formatSongClock(lines.find((line) => line.cueIndex === reply.afterCue)?.startMs ?? 0),
          text: reply.text,
        } satisfies Post,
      })),
    ];
    return entries.sort((a, b) => a.at - b.at).map((entry) => entry.post);
  }, [lines, poster, reducedMotion, replies]);

  // The channel keeps its newest message in view, as Slack does.
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || !shown) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
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
    <section className={styles.app} aria-label="Slack, #late-night-edit" inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Glyph name="back" />
        </span>
        <span className={styles.title}>
          <span className={styles.channel}>
            <span className={styles.hash}>#</span>late-night-edit
            <Glyph name="chevron" />
          </span>
          <span className={styles.members}>{7 + (seat % 4)} members</span>
        </span>
        <span className={styles.huddle}>
          <Glyph name="headphones" />
        </span>
      </header>

      <nav className={styles.tabs} aria-label="Channel tabs">
        <span className={styles.tab} data-active>
          <Glyph name="messages" />
          Messages
        </span>
        <span className={styles.tab}>
          <Glyph name="canvas" />
          Canvas
        </span>
        <span className={styles.tab}>
          <Glyph name="files" />
          Files
        </span>
        <span className={styles.tab}>
          <Glyph name="pins" />
          Pins
        </span>
        <span className={styles.tab} aria-label="Add a tab">
          <Glyph name="plus" />
        </span>
      </nav>

      <div ref={feedRef} className={styles.feed} data-feed>
        <div className={styles.rows}>
          <p className={styles.day}>
            <span>Today</span>
          </p>
          {all.map((post, index) => {
            const previous = all[index - 1];
            return <Message key={post.key} post={post} grouped={Boolean(previous && previous.who.name === post.who.name && !previous.thread && minutes(post.time) - minutes(previous.time) <= 5)} />;
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Message #late-night-edit</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Message #late-night-edit"
            enterKeyHint="send"
            autoComplete="off"
          />
        </label>
        <div className={styles.tools}>
          <span className={styles.plus}>
            <Glyph name="plus" />
          </span>
          <span className={styles.tool}>
            <Glyph name="format" />
          </span>
          <span className={styles.tool}>
            <Glyph name="at" />
          </span>
          <span className={styles.tool}>
            <Glyph name="emoji" />
          </span>
          <span className={styles.tool}>
            <Glyph name="camera" />
          </span>
          {draft.trim() ? (
            <button type="submit" className={styles.send} aria-label="Send">
              <Glyph name="send" />
            </button>
          ) : (
            <span className={styles.mic}>
              <Glyph name="mic" />
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

export default memo(SlackState);
