"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Glyph } from "./glyphs";
import styles from "./instagram.module.css";
import { follow } from "../follow";

// Instagram iOS, the Home feed (light) scrolled to one post: a text-on-colour
// quote card from a quote account, the kind of post such accounts make. The
// lyric lives in the post's own text slots. The song's first line becomes the
// caption, typed word by word as it is sung; every later line arrives as a new
// comment from a different stranger, typed word by word, newest at the top of
// the comment preview under the caption and at the top of the Comments sheet
// (the comment glyph or "View all … comments" opens it). The sheet's composer
// is real: what the participant posts goes through `act` and comes back as
// their own comment, placed after the line it followed. Like, repost and save
// toggle locally; double-tapping the image likes it.
//
// Sources
// - Glyphs: Instagram IGDS icon modules served by static.cdninstagram.com,
//   copied verbatim from experiments-jyc SCC components/mobile/clone/11
//   (record apps/scc/docs/experiments/sns/mobile/11.md, 사칙연산 fit).
// - Wordmark: the 2026 Instagram vector wordmark (Wikimedia Commons
//   "Instagram_wordmark_(2026).svg"), the same file clone/11 uses.
// - Geometry: clone/11's measured CSS (action row, caption, floating tab bar)
//   re-checked in pixels (2.351 px/pt) against Instagram's US App Store iPhone
//   feed frame (…/5_iOS_6.5.jpg/1290x2796bb.png): Create · 120 pt wordmark ·
//   Activity at y 76, glyph centres x 27.6 / 363; and the comment-sheet frame
//   (…/2_iOS_6.5.jpg/1290x2796bb.png): sheet top 415 pt, title centre 461,
//   32 pt avatars at x 12 with text at x 51, emoji row under a rule at 738,
//   42 pt composer (avatar x 16, field x 72–378) 10 pt above the bottom edge.

const HISTORY_PREVIEW = 3;
const COMMENT_LIMIT = 80;
const POST_ACCOUNT = "slowerdays.club";
const PRIOR_CAPTION = "save this for the next time you think about texting them 🤍";
const STRANGERS = [
  "hana__lee",
  "tessa.mp3",
  "kai_wnd",
  "noor.amrani",
  "ellie.jpg",
  "marco_brt",
  "s.oyelaran",
  "jiwoo.k",
  "lou.in.lisbon",
  "priya_dsouza",
  "benji.moves",
  "ottilie_",
] as const;
const ME = ["jules.park", "minjee_o", "the.ruiz", "callumxo", "yuna.hwang", "dev.anand"] as const;
const TINTS = ["#8e96a8", "#a99486", "#8aa39a", "#9c8fb0", "#b09a7c", "#7f9bb3", "#a58c96", "#8c9d84"] as const;
const EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"] as const;
const BASE = { likes: 48_213, comments: 749, reposts: 612, shares: 3_140 };

type Comment = { key: string; author: string; text: string; age: string; arriving: boolean; mine: boolean };

/** Instagram's short count ("SHORT", "ROUND"): 749, 2.7K, 36.2K, 1.2M. */
function compact(count: number) {
  if (count < 1_000) return String(count);
  const [unit, size] = count >= 1e6 ? (["M", 1e6] as const) : (["K", 1e3] as const);
  const value = count / size;
  return `${value.toFixed(value >= 100 ? 0 : 1).replace(/\.0$/, "")}${unit}`;
}

function Avatar({ name, size }: { name: string; size: number }) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (
    <span className={styles.avatar} aria-hidden="true" style={{ width: size, height: size, background: TINTS[hash % TINTS.length], fontSize: Math.round(size * 0.42) }}>
      {name.replace(/[^a-z]/gi, "").charAt(0).toUpperCase()}
    </span>
  );
}

function InstagramState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const me = ME[seat % ME.length]!;
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState(false);
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likedComments, setLikedComments] = useState<Readonly<Record<string, true>>>({});
  // The caption keeps the song's first line after it leaves the line window.
  const [caption, setCaption] = useState<string | null>(null);
  const head = lines.find((line) => line.cueIndex === 0);
  if (head && head.text !== caption) setCaption(head.text);
  const captionTyping = !!head?.current;
  const listRef = useRef<HTMLDivElement>(null);

  // Newest first: later lines as strangers' comments, the participant's own after the line they followed.
  const comments = useMemo(() => {
    const latest = lines.at(-1)?.startMs ?? 0;
    const merged: (Comment & { at: number })[] = [
      ...lines
        .filter((line) => line.cueIndex > 0)
        .map((line) => ({
          at: line.cueIndex,
          key: `l${line.cueIndex}`,
          author: STRANGERS[(line.cueIndex * 5 + seat * 3) % STRANGERS.length]!,
          text: line.text,
          age: `${Math.max(1, Math.round((latest - line.startMs) / 60_000))}m`,
          arriving: line.current,
          mine: false,
        })),
      ...replies.map((reply) => ({ at: reply.afterCue + 0.5, key: `r${reply.id}`, author: me, text: reply.text, age: "1m", arriving: false, mine: true })),
    ];
    return merged.sort((a, b) => b.at - a.at);
  }, [lines, replies, seat, me]);

  // The sheet keeps the newest comment, at its top, in view.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !shown || !sheet) return;
    follow(list, 0, reducedMotion);
  }, [comments, shown, sheet, reducedMotion]);

  const post = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, COMMENT_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const toggleComment = (key: string) =>
    setLikedComments((current) => {
      const next = { ...current };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });

  const commentCount = BASE.comments + comments.length;
  const motion = !reducedMotion;

  return (
    <section className={styles.app} aria-label="Instagram" inert={!shown}>
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <Glyph name="add" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static brand SVG at a fixed size */}
        <img className={styles.wordmark} src="/parametric-interface/v4/apps/instagram/instagram-wordmark.svg" alt="Instagram" width={120} height={27} />
        <span className={styles.headerIcon} aria-hidden="true">
          <Glyph name="heart" />
        </span>
      </header>

      <div className={styles.feed} data-feed>
        <article className={styles.post}>
          <div className={styles.postHead}>
            <span className={styles.postAvatar}>
              <span className={styles.accountMark} aria-hidden="true">sd</span>
            </span>
            <span className={styles.identity}>
              <strong>{POST_ACCOUNT}</strong>
            </span>
            <span className={styles.postMore} aria-hidden="true">
              <Glyph name="more" />
            </span>
          </div>

          <div className={styles.photo} role="img" aria-label="Text post: you can miss someone and still not want them back." onDoubleClick={() => setLiked(true)}>
            <p className={styles.quote}>
              you can miss someone
              <br />
              and still not want
              <br />
              them back.
            </p>
            <span className={styles.quoteHandle}>@{POST_ACCOUNT}</span>
          </div>

          <div className={styles.actions}>
            <button type="button" className={liked ? styles.liked : undefined} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} onClick={() => setLiked((value) => !value)}>
              <Glyph name="heart" filled={liked} />
              <span>{compact(BASE.likes + Number(liked))}</span>
            </button>
            <button type="button" aria-label="Comment" onClick={() => setSheet(true)}>
              <Glyph name="comment" />
              <span>{compact(commentCount)}</span>
            </button>
            <button type="button" aria-pressed={reposted} aria-label={reposted ? "Undo repost" : "Repost"} onClick={() => setReposted((value) => !value)}>
              <Glyph name="repost" filled={reposted} />
              <span>{compact(BASE.reposts + Number(reposted))}</span>
            </button>
            <button type="button" aria-label="Share" tabIndex={-1}>
              <Glyph name="share" />
              <span>{compact(BASE.shares)}</span>
            </button>
            <button type="button" className={styles.save} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save"} onClick={() => setSaved((value) => !value)}>
              <Glyph name="save" filled={saved} />
            </button>
          </div>

          <div className={styles.copy}>
            <p className={styles.caption}>
              <b>{POST_ACCOUNT}</b> <span data-typing={captionTyping || undefined}>{caption ?? PRIOR_CAPTION}</span>
            </p>
            <button type="button" className={styles.viewAll} onClick={() => setSheet(true)}>
              View all {commentCount.toLocaleString("en-US")} comments
            </button>
            {comments.slice(0, HISTORY_PREVIEW).map((comment) => (
              <p key={comment.key} className={styles.preview} data-arriving={(comment.arriving && motion) || undefined}>
                <b>{comment.author}</b> {comment.text}
              </p>
            ))}
            <small className={styles.age}>3 hours ago</small>
          </div>
        </article>
      </div>

      <nav className={styles.tabs} aria-label="Instagram tabs">
        <span data-active aria-hidden="true"><Glyph name="home" /></span>
        <span aria-hidden="true"><Glyph name="reels" /></span>
        <span aria-hidden="true"><Glyph name="direct" /><i className={styles.dot} /></span>
        <span aria-hidden="true"><Glyph name="search" /></span>
        <span aria-hidden="true"><span className={styles.tabAvatar}><Avatar name={me} size={26} /></span><i className={styles.dot} /></span>
      </nav>

      <div className={styles.backdrop} data-open={sheet || undefined} onClick={() => setSheet(false)} aria-hidden="true" />
      <div className={styles.sheet} data-open={sheet || undefined} role="dialog" aria-label="Comments" inert={!sheet}>
        <button type="button" className={styles.grab} onClick={() => setSheet(false)} aria-label="Close comments">
          <span />
          <strong>Comments</strong>
        </button>
        <div ref={listRef} className={styles.comments}>
          {comments.map((comment) => (
            <div key={comment.key} className={styles.comment} data-arriving={(comment.arriving && motion) || undefined}>
              <Avatar name={comment.author} size={32} />
              <div>
                <p className={styles.meta}>
                  <b>{comment.author}</b> <span>{comment.age}</span>
                </p>
                <p className={styles.body}>{comment.text}</p>
                <span className={styles.reply}>Reply</span>
              </div>
              <button
                type="button"
                className={likedComments[comment.key] ? `${styles.commentLike} ${styles.liked}` : styles.commentLike}
                aria-pressed={!!likedComments[comment.key]}
                aria-label="Like comment"
                onClick={() => toggleComment(comment.key)}
              >
                <Glyph name="smallHeart" size={16} filled={!!likedComments[comment.key]} />
              </button>
            </div>
          ))}
          <div className={styles.comment}>
            <Avatar name="mara.lnd" size={32} />
            <div>
              <p className={styles.meta}>
                <b>mara.lnd</b> <span>2h</span>
              </p>
              <p className={styles.body}>needed this today</p>
              <span className={styles.reply}>Reply</span>
            </div>
            <span className={styles.commentLike} aria-hidden="true">
              <Glyph name="smallHeart" size={16} />
            </span>
          </div>
        </div>
        <div className={styles.emoji}>
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => setDraft((value) => (value + emoji).slice(0, COMMENT_LIMIT))}>
              {emoji}
            </button>
          ))}
        </div>
        <form className={styles.form} onSubmit={post}>
          <Avatar name={me} size={42} />
          <label className={styles.field}>
            <input
              value={draft}
              maxLength={COMMENT_LIMIT}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a comment"
              aria-label="Add a comment"
              enterKeyHint="send"
              autoComplete="off"
            />
            {draft.trim() ? (
              <button type="submit" className={styles.postButton}>
                Post
              </button>
            ) : (
              <span className={styles.sticker} aria-hidden="true">
                <Glyph name="sticker" />
              </span>
            )}
          </label>
        </form>
      </div>
    </section>
  );
}

export default memo(InstagramState);
