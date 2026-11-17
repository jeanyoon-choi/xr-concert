"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import styles from "./reddit.module.css";
import { follow } from "../follow";

// Reddit for iOS, light, a post page in r/relationship_advice — her own post,
// seen from her phone. She is pouring it out to the internet from a throwaway
// account: the first line kept on the phone is the post's title (typed as
// sung) and every line after it is the next paragraph of the same post's
// body, growing as she types. Nobody has answered: one upvote (her own), 0
// comments, and Reddit's empty comment section. Before the song the page
// holds a post of hers from the same night. The "Join the conversation" bar
// is real: what the participant writes lands under the post as her own
// comment (u/… with the OP tag). A line marked bold is set in bold.
//
// Sources: every glyph is Reddit's own RPL icon (upvote-outline,
// downvote-outline, comment-outline, share-ios-outline, award-outline,
// overflow-horizontal-fill, back-outline, search-outline, caret-down-outline,
// reply-outline, image-post-outline, gif-post-outline) as published in
// github.com/reddit/devvit-docs docs/assets/icons (fetched 2026-11-03).
// The username follows the throwaway form; avatars are plain discs (no Snoo
// portraits), the community icon Reddit's default "r/". No glyph is drawn
// here.
// UNSURE: colours (#0F1A1C text, #576F76 meta, #E5EBEE pills, #0A449B OP tag,
// #FF4500 community icon) are Reddit's web RPL values from memory, the
// layout metrics are not measured from an iOS capture, and the empty state
// is the app's wording ("Be the first to comment") without its illustration.

const COMMENT_LIMIT = 200;
const PREFIX = "/part4/v0/apps/reddit";

/** Her throwaway, and its avatar disc, per seat. */
const OPS = [
  { user: "Throwaway_2am_texts", tint: "#ea0027" },
  { user: "throwRA_prettiestyears", tint: "#0079d3" },
  { user: "ThrowRA-stillawake", tint: "#ff4500" },
  { user: "throwaway_notoverit_", tint: "#46d160" },
] as const;

/** Her post at rest, before the song. */
const RESTING = {
  title: "I (27F) keep rereading my ex's (28M) old texts at 2am. How do I stop?",
  body: "We broke up in March. I know exactly how it ended and I still open the thread every night.",
};

type Comment = { key: string; text: string; at: number };

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

function RedditState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const me = OPS[seat % OPS.length]!;
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLElement>(null);

  const title = lines[0];
  const body = lines.slice(1);
  const last = lines.at(-1);
  const nowMs = last?.startMs ?? 0;

  // Only she is here: what the participant writes is her own comment under her post.
  const comments = useMemo(
    () => replies.slice(-12).map((reply): Comment => ({ key: `r${reply.id}`, text: reply.text, at: reply.afterCue })),
    [replies],
  );

  const lastComment = comments.at(-1)?.key;

  // The paragraph being typed stays in view; a comment she adds brings the page to its foot.
  useLayoutEffect(() => {
    const feed = feedRef.current;
    const post = postRef.current;
    if (!feed || !post || !shown) return;
    const foot = lastComment ? feed.scrollHeight - feed.clientHeight : post.offsetTop + post.offsetHeight - feed.clientHeight + 12;
    follow(feed, Math.max(0, foot), reducedMotion);
  }, [lastComment, last?.text, last?.cueIndex, shown, reducedMotion]);

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
        <article ref={postRef} className={styles.post}>
          <div className={styles.byline}>
            <span className={styles.community} aria-hidden="true">r/</span>
            <span className={styles.bylineText}>
              <span className={styles.bylineTop}>
                <b>r/relationship_advice</b>
                <span className={styles.dot}>•</span>
                {title ? age(nowMs - title.startMs) : "12m"}
              </span>
              <span className={styles.author}>u/{me.user}</span>
            </span>
          </div>

          <h2 data-lyric className={styles.title}>{title ? title.text : RESTING.title}</h2>
          <span className={styles.flair}>Breakups</span>
          {title ? (
            body.length ? (
              <div className={styles.body}>
                {body.map((line) => (
                  <p data-lyric key={line.cueIndex} style={line.bold ? { fontWeight: 700 } : undefined}>{line.text}</p>
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
              <span className={styles.count}>1</span>
              <Icon name="downvote-outline" className={styles.actionIcon} />
            </span>
            <span className={styles.pill}>
              <Icon name="comment-outline" className={styles.actionIcon} />
              <span className={styles.count}>{comments.length}</span>
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

        {comments.length > 0 ? (
          <>
            <div className={styles.sort}>
              <span>Best comments</span>
              <Icon name="caret-down-outline" className={styles.caret} />
            </div>

            <div className={styles.comments}>
              {comments.map((comment) => (
                <div key={comment.key} className={styles.comment} data-arriving={comment.key === lastComment || undefined}>
                  <div className={styles.commentHead}>
                    <Avatar tint={me.tint} size={24} />
                    <b>{me.user}</b>
                    <span className={styles.op}>OP</span>
                    <span className={styles.dot}>•</span>
                    <span>now</span>
                  </div>
                  <p data-lyric className={styles.commentText}>{comment.text}</p>
                  <div className={styles.commentActions}>
                    <Icon name="overflow-horizontal-fill" className={styles.smallIcon} />
                    <span className={styles.reply}>
                      <Icon name="reply-outline" className={styles.smallIcon} />
                      Reply
                    </span>
                    <span className={styles.vote}>
                      <Icon name="upvote-outline" className={styles.smallIcon} />
                      <span>1</span>
                      <Icon name="downvote-outline" className={styles.smallIcon} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <b>Be the first to comment</b>
            <span>Nobody&apos;s responded to this post yet. Add your thoughts and get the conversation going.</span>
          </div>
        )}
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
