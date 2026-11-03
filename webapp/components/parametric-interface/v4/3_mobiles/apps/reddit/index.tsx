"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import styles from "./reddit.module.css";
import { follow } from "../follow";

// Reddit for iOS, light, a post page in r/relationship_advice. The lyric is
// a stranger asking the internet about their ex: the first line kept on the
// phone is the post's title (typed as sung), the next two are its body, and
// every later line arrives as a comment from a different redditor, some as
// replies nested under the one before. Before the song the page is an
// ordinary advice post with two comments. The "Join the conversation" bar is
// real: the participant's comment lands in the thread after the line it
// followed.
//
// Sources: every glyph is Reddit's own RPL icon (upvote-outline,
// downvote-outline, comment-outline, share-ios-outline, award-outline,
// overflow-horizontal-fill, back-outline, search-outline, caret-down-outline,
// reply-outline, image-post-outline, gif-post-outline) as published in
// github.com/reddit/devvit-docs docs/assets/icons (fetched 2026-11-03).
// Usernames follow Reddit's generated Adjective_Noun_1234 form; avatars are
// plain discs (no Snoo portraits), the community icon Reddit's default "r/".
// UNSURE: colours (#0F1A1C text, #576F76 meta, #E5EBEE pills, #0A449B Join,
// #FF4500 community icon) are Reddit's web RPL values from memory, and the
// layout metrics are not measured from an iOS capture.

const COMMENT_LIMIT = 200;
const PREFIX = "/parametric-interface/v4/apps/reddit";

const OP = "Throwaway_2am_texts";

const USERS = [
  { user: "Lazy_Pomelo_4417", tint: "#7193ff" },
  { user: "Moonlit_Sparrow22", tint: "#ff8717" },
  { user: "Quiet-Ad-9812", tint: "#46d160" },
  { user: "Spare_Dimension_310", tint: "#ffb000" },
  { user: "HoneyedOat", tint: "#0dd3bb" },
  { user: "Defiant_Tea_6630", tint: "#ff66ac" },
  { user: "PaleFern_88", tint: "#8a6aff" },
  { user: "Brief-Lettuce-2051", tint: "#24a0ed" },
  { user: "No_Carpet_7748", tint: "#ff585b" },
  { user: "softwhistle_", tint: "#94e044" },
] as const;

const ME = [
  { user: "Kind_Orchid_5120", tint: "#ea0027" },
  { user: "Late-Comet-3384", tint: "#0079d3" },
  { user: "Gentle_Mango_903", tint: "#ff4500" },
] as const;

/** The post at rest, before the song. */
const RESTING = {
  title: "My ex (26F) still texts me “one last time” every few weeks. How do I actually stop answering?",
  body: "We broke up in March after two years. It was not a good relationship and everyone around me knew it before I did. Every time I think I'm out she sends something and I'm back to square one.",
};

const RESTING_COMMENTS = [
  { key: "c0", user: "Lazy_Pomelo_4417", tint: "#7193ff", age: "3h", depth: 0, text: "Block the number. Not mute, block. You can't answer what you never see.", votes: 412 },
  { key: "c1", user: "HoneyedOat", tint: "#0dd3bb", age: "2h", depth: 1, text: "This. And delete the thread so you can't reread it at 2am.", votes: 138 },
] as const;

/** Nesting for the lyric comments: a top comment, a reply, a reply to it, … */
const DEPTHS = [0, 1, 2, 0, 1, 0, 1, 1] as const;

type Comment = { key: string; user: string; tint: string; age: string; depth: number; text: string; votes: number; arriving?: boolean; mine?: boolean };

function Icon({ name, className }: { name: string; className: string }) {
  return <span aria-hidden="true" className={className} style={{ ["--src" as string]: `url(${PREFIX}/${name}.svg)` }} />;
}

function Avatar({ tint, size }: { tint: string; size: number }) {
  return <span className={styles.avatar} aria-hidden="true" style={{ width: size, height: size, background: tint }} />;
}

function age(ms: number) {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  return minutes < 1 ? "now" : `${minutes}m`;
}

function compact(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

function RedditState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const me = ME[seat % ME.length]!;
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const title = lines[0];
  const body = lines.slice(1, 3);
  const last = lines.at(-1);
  const nowMs = last?.startMs ?? 0;

  const comments = useMemo(() => {
    const sung = lines.slice(3).map((line, index): Comment & { at: number } => {
      const who = USERS[(line.cueIndex + seat) % USERS.length]!;
      return {
        key: `l${line.cueIndex}`,
        user: who.user,
        tint: who.tint,
        age: age(nowMs - line.startMs),
        depth: DEPTHS[line.cueIndex % DEPTHS.length]!,
        text: line.text,
        votes: 1 + ((line.cueIndex * 7 + seat * 3) % 23) + (index === 0 ? 40 : 0),
        arriving: line.cueIndex === last?.cueIndex,
        at: line.cueIndex,
      };
    });
    const firstCue = lines[3]?.cueIndex ?? Infinity;
    const mine = replies
      .slice(-12)
      .map((reply): Comment & { at: number } => ({
        key: `r${reply.id}`,
        user: me.user,
        tint: me.tint,
        age: "now",
        depth: 0,
        text: reply.text,
        votes: 1,
        mine: true,
        // Comments written before the comment section filled sit at its head.
        at: Math.max(reply.afterCue, firstCue - 1) + 0.5,
      }));
    return [...sung, ...mine].sort((a, b) => a.at - b.at);
  }, [lines, replies, seat, me, nowMs, last?.cueIndex]);

  const count = RESTING_COMMENTS.length + comments.length + 46;

  // The newest comment stays in view; while only the post is filling, the top does.
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || !shown) return;
    follow(feed, comments.length ? feed.scrollHeight : 0, reducedMotion);
  }, [comments, title?.text, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, COMMENT_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
    setComposing(false);
  };

  return (
    <section className={styles.app} aria-label="Reddit post in r/relationship_advice" inert={!shown}>
      <header className={styles.nav}>
        <Icon name="back-outline" className={styles.navIcon} />
        <span className={styles.navRight}>
          <Icon name="search-outline" className={styles.navIcon} />
          <Icon name="overflow-horizontal-fill" className={styles.navIcon} />
          <Avatar tint={me.tint} size={28} />
        </span>
      </header>

      <div ref={feedRef} className={styles.feed} data-feed>
        <article className={styles.post}>
          <div className={styles.byline}>
            <span className={styles.community} aria-hidden="true">r/</span>
            <span className={styles.bylineText}>
              <span className={styles.bylineTop}>
                <b>r/relationship_advice</b>
                <span className={styles.dot}>•</span>
                {title ? age(nowMs - title.startMs) : "5h"}
              </span>
              <span className={styles.author}>u/{OP}</span>
            </span>
            <span className={styles.join}>Join</span>
          </div>

          <h2 className={styles.title}>{title ? title.text : RESTING.title}</h2>
          <span className={styles.flair}>Breakups</span>
          {title ? (
            body.length ? (
              <div className={styles.body}>
                {body.map((line) => (
                  <p key={line.cueIndex}>{line.text}</p>
                ))}
              </div>
            ) : null
          ) : (
            <div className={styles.body}>
              <p>{RESTING.body}</p>
            </div>
          )}

          <div className={styles.actions}>
            <span className={styles.pill}>
              <Icon name="upvote-outline" className={styles.actionIcon} />
              <span className={styles.count}>{compact(1240 + lines.length * 17)}</span>
              <Icon name="downvote-outline" className={styles.actionIcon} />
            </span>
            <span className={styles.pill}>
              <Icon name="comment-outline" className={styles.actionIcon} />
              <span className={styles.count}>{count}</span>
            </span>
            <span className={styles.pill} data-round>
              <Icon name="award-outline" className={styles.actionIcon} />
            </span>
            <span className={styles.pill}>
              <Icon name="share-ios-outline" className={styles.actionIcon} />
              <span className={styles.count}>Share</span>
            </span>
          </div>
        </article>

        <div className={styles.sort}>
          <span>Best comments</span>
          <Icon name="caret-down-outline" className={styles.caret} />
        </div>

        <div className={styles.comments}>
          {[...RESTING_COMMENTS, ...comments].map((comment) => (
            <div
              key={comment.key}
              className={styles.comment}
              style={{ ["--depth" as string]: comment.depth }}
              data-arriving={("arriving" in comment && comment.arriving) || undefined}
            >
              {Array.from({ length: comment.depth }, (_, index) => (
                <span key={index} className={styles.rail} style={{ left: 28 + index * 20 }} aria-hidden="true" />
              ))}
              <div className={styles.commentHead}>
                <Avatar tint={comment.tint} size={24} />
                <b>{comment.user}</b>
                <span className={styles.dot}>•</span>
                <span>{comment.age}</span>
              </div>
              <p className={styles.commentText}>{comment.text}</p>
              <div className={styles.commentActions}>
                <Icon name="overflow-horizontal-fill" className={styles.smallIcon} />
                <span className={styles.reply}>
                  <Icon name="reply-outline" className={styles.smallIcon} />
                  Reply
                </span>
                <span className={styles.vote}>
                  <Icon name="upvote-outline" className={styles.smallIcon} />
                  <span>{comment.votes}</span>
                  <Icon name="downvote-outline" className={styles.smallIcon} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send} data-open={composing || draft ? true : undefined}>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>Add a comment</span>
          <input
            value={draft}
            maxLength={COMMENT_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => setComposing(true)}
            onBlur={() => setComposing(false)}
            placeholder="Join the conversation"
            enterKeyHint="send"
            autoComplete="off"
          />
        </label>
        {composing || draft ? (
          <div className={styles.composeBar}>
            <Icon name="image-post-outline" className={styles.actionIcon} />
            <Icon name="gif-post-outline" className={styles.actionIcon} />
            <button type="submit" className={styles.post2} disabled={!draft.trim()} onMouseDown={(event) => event.preventDefault()}>
              Reply
            </button>
          </div>
        ) : null}
      </form>
    </section>
  );
}

export default memo(RedditState);
