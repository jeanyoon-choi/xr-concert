"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Glyph } from "./glyphs";
import styles from "./instagram.module.css";
import { follow } from "../follow";
import { LyricWords } from "../lyric-words";

// Instagram iOS, the Home feed (light) scrolled to one post: a personal
// account's photo dump, a 4:5 carousel of candid night photographs (direct
// flash, film grain, motion blur). The line being sung is the white text on
// the photo, centred on both axes, and every new line swipes the carousel to
// the next photo (counter chip and dots follow). As in the quote-card state,
// the song's first line is also the caption, typed word by word as it is sung;
// every later line arrives as a new comment, newest at the top of the comment
// preview under the caption and at the top of the Comments sheet (the comment
// glyph or "View all … comments" opens it). Once comments arrive the feed
// settles 54 pt further down, the photo flush under the top bar, so the
// previews clear the tab bar. The sheet's composer
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
// - Photographs: Unsplash License, listed in
//   public/part4/v1/instagram-2/attribution.json.
// - Drawn here, not copied: the carousel counter chip and the page dots (plain
//   CSS shapes after Instagram's), and the text on the photo, set in the
//   system face as a stand-in for Instagram's own text style (its font is not
//   bundled). The dots' place under the photo is from memory of the 2025 app,
//   not measured against a frame.

const HISTORY_PREVIEW = 2;
// A private account: the thread never grows past this many comments.
const THREAD_LIMIT = 15;
const COMMENT_LIMIT = 80;
// One private person per phone: her handle, her avatar, a friend who liked it, and a small account's numbers.
const POSTERS = [
  { handle: "noa.kwon_", avatar: "avatar.jpg", at: "50% 50%", friend: "hana", others: 37, comments: 4, shares: 2 },
  { handle: "yerin.cho", avatar: "avatar-2.jpg", at: "50% 50%", friend: "tess", others: 112, comments: 9, shares: 5 },
  { handle: "sol.ahn__", avatar: "04-mirror.jpg", at: "50% 34%", friend: "jiwoo", others: 21, comments: 2, shares: 0 },
  { handle: "dahye.jpg", avatar: "avatar.jpg", at: "50% 50%", friend: "ellie", others: 203, comments: 12, shares: 8 },
  { handle: "mina.seo_", avatar: "avatar-2.jpg", at: "50% 50%", friend: "priya", others: 64, comments: 6, shares: 1 },
  { handle: "june.baek", avatar: "04-mirror.jpg", at: "50% 34%", friend: "lou", others: 9, comments: 0, shares: 0 },
] as const;
const POST_PLACE = "Seoul, South Korea";
const PRIOR_CAPTION = "things i never posted";
const ASSETS = "/part4/v1/instagram-2";
const PHOTOS = [
  "01-dinner",
  "02-behind",
  "03-wheel",
  "04-mirror",
  "05-street",
  "06-hands",
  "07-dessert",
  "08-him",
  "09-cars",
  "10-candles",
  "11-alley",
  "12-table",
] as const;
const DOT_WINDOW = 5;
// Her friends, by first-name handles.
const STRANGERS = ["hana", "tess", "kai", "noor", "ellie", "marco", "sim", "jiwoo", "lou", "priya", "benji", "otti"] as const;
const ME = ["jules.park", "minjee_o", "the.ruiz", "callumxo", "yuna.hwang", "dev.anand"] as const;
const TINTS = ["#8e96a8", "#a99486", "#8aa39a", "#9c8fb0", "#b09a7c", "#7f9bb3", "#a58c96", "#8c9d84"] as const;
const EMOJIS = ["❤️", "🙌", "🔥", "👏", "😢", "😍", "😮", "😂"] as const;

type Comment = { key: string; author: string; text: string; age: string; arriving: boolean; mine: boolean };

function Avatar({ name, size }: { name: string; size: number }) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (
    <span className={styles.avatar} aria-hidden="true" style={{ width: size, height: size, background: TINTS[hash % TINTS.length], fontSize: Math.round(size * 0.42) }}>
      {name.replace(/[^a-z]/gi, "").charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The largest size (px, after the page's text scale) at which a line still
 * sits inside the photograph with every word whole: its longest word must fit the
 * column, and the wrapped block must not grow taller than the clear part of
 * the photograph. It only bites at the page's larger text sizes.
 */
function sizeCap(text: string) {
  const longest = Math.max(1, ...text.split(" ").map((word) => word.length));
  return Math.floor(Math.min(600 / longest, Math.sqrt(180_000 / Math.max(1, text.length))));
}

function InstagramState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const newest = lines.at(-1);
  const cue = newest?.cueIndex ?? -1;
  const slide = cue < 0 ? 0 : cue % PHOTOS.length;
  // The carousel: the photo (and its text) being swiped away, kept until the next swipe.
  const [seen, setSeen] = useState({ cue, text: "" });
  const [leaving, setLeaving] = useState<{ slide: number; text: string; back: boolean } | null>(null);
  if (cue !== seen.cue) {
    const from = seen.cue < 0 ? 0 : seen.cue % PHOTOS.length;
    setLeaving(from === slide ? null : { slide: from, text: seen.cue < 0 ? PRIOR_CAPTION : seen.text, back: cue < seen.cue });
    setSeen({ cue, text: newest?.full ?? "" });
  }
  const onPhoto = newest ? newest.text : PRIOR_CAPTION;
  const dotStart = Math.min(Math.max(slide - 2, 0), PHOTOS.length - DOT_WINDOW);
  const me = ME[seat % ME.length]!;
  const poster = POSTERS[seat % POSTERS.length]!;
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
  const feedRef = useRef<HTMLDivElement>(null);

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
    return merged.sort((a, b) => b.at - a.at).slice(0, THREAD_LIMIT - 1);
  }, [lines, replies, seat, me]);

  // The sheet keeps the newest comment, at its top, in view.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !shown || !sheet) return;
    follow(list, 0, reducedMotion);
  }, [comments, shown, sheet, reducedMotion]);

  // With comments under the caption, the post sits with its photo flush under the top bar.
  const hasComments = comments.length > 0;
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || !shown) return;
    follow(feed, hasComments ? 54 : 0, reducedMotion);
  }, [hasComments, shown, reducedMotion]);

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

  const commentCount = Math.min(poster.comments + comments.length, THREAD_LIMIT);
  const likes = poster.others + 1 + Number(liked);
  const motion = !reducedMotion;

  return (
    <section className={styles.app} aria-label="Instagram" inert={!shown}>
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden="true">
          <Glyph name="add" />
        </span>
        {/* eslint-disable-next-line @next/next/no-img-element -- a static brand SVG at a fixed size */}
        <img className={styles.wordmark} src="/part4/v0/apps/instagram/instagram-wordmark.svg" alt="Instagram" width={120} height={27} />
        <span className={styles.headerIcon} aria-hidden="true">
          <Glyph name="heart" />
        </span>
      </header>

      <div ref={feedRef} className={styles.feed} data-feed>
        <article className={styles.post}>
          <div className={styles.postHead}>
            <span className={styles.postAvatar}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size local photograph */}
              <img className={styles.accountPhoto} src={`${ASSETS}/${poster.avatar}`} alt="" width={32} height={32} draggable={false} style={{ objectPosition: poster.at }} />
            </span>
            <span className={styles.identity}>
              <strong>{poster.handle}</strong>
              <small>{POST_PLACE}</small>
            </span>
            <span className={styles.postMore} aria-hidden="true">
              <Glyph name="more" />
            </span>
          </div>

          {/* The carousel: one photograph per sung line, the line set on it; before the song, the first photo. */}
          <div className={styles.photo} role="img" aria-label={`Photo ${slide + 1} of ${PHOTOS.length}: ${onPhoto}`} onDoubleClick={() => setLiked(true)}>
            {PHOTOS.map((name, index) => {
              const state = index === slide ? "in" : leaving?.slide === index ? "out" : undefined;
              return (
                <div
                  key={name}
                  className={styles.slide}
                  data-state={state}
                  data-moving={(motion && leaving !== null) || undefined}
                  data-back={leaving?.back || undefined}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size local photograph */}
                  <img src={`${ASSETS}/${name}.jpg`} alt="" width={390} height={488} draggable={false} />
                  {state === "in" ? (
                    <p data-lyric className={styles.onPhoto} style={{ "--cap": `${sizeCap(newest ? newest.full : onPhoto)}px` } as CSSProperties}>
                      {/* The whole line is laid out from its first word; each word eases in. */}
                      {newest ? <LyricWords line={newest} /> : onPhoto}
                    </p>
                  ) : state === "out" ? (
                    <p data-lyric className={styles.onPhoto} style={{ "--cap": `${sizeCap(leaving?.text ?? "")}px` } as CSSProperties}>{leaving?.text}</p>
                  ) : null}
                </div>
              );
            })}
            <span className={styles.counter} aria-hidden="true">
              {slide + 1}/{PHOTOS.length}
            </span>
          </div>
          <div className={styles.dots} aria-hidden="true">
            {PHOTOS.map((name, index) => {
              const off = index < dotStart ? dotStart - index : index >= dotStart + DOT_WINDOW ? index - dotStart - DOT_WINDOW + 1 : 0;
              return <i key={name} data-active={index === slide || undefined} data-off={off > 2 ? 3 : off || undefined} />;
            })}
          </div>

          <div className={styles.actions}>
            <button type="button" className={liked ? styles.liked : undefined} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} onClick={() => setLiked((value) => !value)}>
              <Glyph name="heart" filled={liked} />
              <span>{likes}</span>
            </button>
            <button type="button" aria-label="Comment" onClick={() => setSheet(true)}>
              <Glyph name="comment" />
              {commentCount > 0 ? <span>{commentCount}</span> : null}
            </button>
            <button type="button" aria-pressed={reposted} aria-label={reposted ? "Undo repost" : "Repost"} onClick={() => setReposted((value) => !value)}>
              <Glyph name="repost" filled={reposted} />
              {reposted ? <span>1</span> : null}
            </button>
            <button type="button" aria-label="Share" tabIndex={-1}>
              <Glyph name="share" />
              {poster.shares ? <span>{poster.shares}</span> : null}
            </button>
            <button type="button" className={styles.save} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save"} onClick={() => setSaved((value) => !value)}>
              <Glyph name="save" filled={saved} />
            </button>
          </div>

          <div className={styles.copy}>
            <p className={styles.likedBy}>
              Liked by <b>{poster.friend}</b> and <b>{liked ? poster.others + 1 : poster.others} others</b>
            </p>
            <p data-lyric className={styles.caption}>
              <b>{poster.handle}</b> <span data-typing={captionTyping || undefined}>{caption ?? PRIOR_CAPTION}</span>
            </p>
            {commentCount > 0 ? (
              <button type="button" className={styles.viewAll} onClick={() => setSheet(true)}>
                {commentCount === 1 ? "View 1 comment" : `View all ${commentCount} comments`}
              </button>
            ) : null}
            {comments.slice(0, HISTORY_PREVIEW).map((comment) => (
              <p data-lyric key={comment.key} className={styles.preview} data-arriving={(comment.arriving && motion) || undefined}>
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
                <p data-lyric className={styles.body}>{comment.text}</p>
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
          {poster.comments > 0 ? (
            <div className={styles.comment}>
              <Avatar name={poster.friend} size={32} />
              <div>
                <p className={styles.meta}>
                  <b>{poster.friend}</b> <span>2h</span>
                </p>
                <p className={styles.body}>you kept these?? 😭</p>
                <span className={styles.reply}>Reply</span>
              </div>
              <span className={styles.commentLike} aria-hidden="true">
                <Glyph name="smallHeart" size={16} />
              </span>
            </div>
          ) : null}
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
