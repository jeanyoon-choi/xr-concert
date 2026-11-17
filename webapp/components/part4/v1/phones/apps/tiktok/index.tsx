"use client";

// TikTok iOS, For You feed (dark, full-bleed video), at native points.
//
// Sources: ported from the measured replica in experiments-jyc SCC
// components/mobile/clone/12 (record docs/experiments/sns/mobile/12.md), whose
// glyphs, rail order, top tabs, caption block, opaque tab bar and comment sheet
// were checked against the TikTok App Store iPhone frames
// (apps.apple.com/us/app/tiktok/id835599320) and the comment-sheet image in
// TikTok's September 2026 newsroom post "Say more in the comments". Type is
// TikTok Sans, TikTok's own open-source face (OFL), self-hosted:
// public/fonts/tiktok-sans (the latin subset of the variable font).
//
// Lyric slot: the video's auto-captions. The sung line is the creator's
// voice in the clip, so it appears as TikTok's on-video caption — white
// text on a dark rounded backing, centred over the lower third — word by
// word, and leaves when the line ends, as captions do. The whole line is laid
// out from its first word (../lyric-words), so it never reflows; each word
// eases in. The post itself uses
// the song's sound ("toxic till the end - ROSÉ"), shown in the ♫ marquee.
// The comment sheet is real: what the participant posts goes through `act`
// and stays at the top of the sheet as their own comment.

import { memo, useState, type CSSProperties, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Icon, type IconName } from "./icons";
import { LyricWords } from "../lyric-words";
import styles from "./tiktok.module.css";

const SEND_LIMIT = 150;
const STILL = "/part4/v0/apps/tiktok/room.svg";

/**
 * The feed is one private person's: the woman of the song, posting about her
 * ex. One handle per phone; each sung line is her next video, with its own
 * caption and its own small counts.
 */
const HANDLES = ["mina_0412", "jules.kwon", "sunny__97", "yeri.jpg", "ari_0803", "sam.h_", "noor.k", "wren_02", "kit__lee", "dahlia.p", "leah_0119", "june.cho"] as const;
const TINTS = ["#6f5b8f", "#8d6a52", "#4f7a71", "#5b6f94", "#94705a", "#6a7f5a"] as const;
const CAPTIONS = [
  "posting this so i dont text him",
  "anyway",
  "",
  "delete later",
  "he knows",
  "its fine im fine",
  "",
  "not about anyone",
  "day 12",
  "should've made this close friends only",
] as const;

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The video a seat is on at line `cue`: fixed by (seat, cue), so a seek lands on the same post. */
function postOf(seat: number, cue: number) {
  const h = hash(seat * 131 + cue * 17 + 5);
  const roll = (salt: number) => (hash(h + salt) % 10_000) / 10_000;
  const handle = HANDLES[seat % HANDLES.length]!;
  // A private account's numbers: a few to a few hundred likes, a handful of comments.
  const likes = Math.round(4 * 75 ** roll(1));
  return {
    key: cue,
    handle,
    initials: handle[0]!.toUpperCase(),
    tint: TINTS[seat % TINTS.length]!,
    caption: CAPTIONS[(h >>> 9) % CAPTIONS.length]!,
    sound: `original sound - ${handle}`,
    likes,
    comments: Math.round(likes * roll(2) * 0.07),
    saves: Math.round(likes * roll(3) * 0.05),
    shares: Math.round(likes * roll(4) * 0.03),
  };
}

type Comment = { id: string; author: string; initials: string; tint: string; body: string; time: string; likes: number };

/** A few friends, under her videos. */
const SEED_COMMENTS: readonly Comment[] = [
  { id: "c1", author: "hyejin", initials: "H", tint: "#7d8aa3", body: "girl. call me", time: "2h", likes: 3 },
  { id: "c2", author: "noah.k", initials: "N", tint: "#9a8070", body: "we never liked him btw", time: "5h", likes: 6 },
  { id: "c3", author: "dani", initials: "D", tint: "#7a9488", body: "proud of you", time: "6h", likes: 2 },
];

/** TikTok counts: no comma under 10K, then one decimal K / M. */
function count(value: number) {
  if (value < 10_000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

function Avatar({ initials, tint, size }: { initials: string; tint: string; size: "tiny" | "small" | "medium" }) {
  return (
    <span className={styles.avatar} data-size={size} style={{ background: tint }} aria-hidden="true">
      {initials}
    </span>
  );
}

function NavItem({ label, icon, active, badge }: { label: string; icon: IconName; active?: boolean; badge?: number }) {
  return (
    <span className={styles.navItem} data-active={active || undefined}>
      <span className={styles.navIcon}>
        <Icon name={icon} filled={active} />
        {badge ? <b className={styles.navBadge}>{badge}</b> : null}
      </span>
      <span className={styles.navLabel}>{label}</span>
    </span>
  );
}

/** The video the feed is scrolling away from: its picture and who posted it, carried up and off. */
function LeavingPost({ post }: { post: ReturnType<typeof postOf> }) {
  return (
    <div className={styles.post} data-phase="out" aria-hidden="true">
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a still stands in for the playing video */}
        <img className={styles.video} src={STILL} alt="" draggable={false} />
        <div className={styles.shade} />
      </div>
      <div className={styles.info}>
        <strong className={styles.handle}>{post.handle}</strong>
        <p className={styles.caption}>{post.caption}</p>
      </div>
    </div>
  );
}

/**
 * The largest size (px, after the page's text scale) at which a line still
 * sits in the clear zone of the video — under the top tabs, over the caption
 * block, 8 pt clear of the rail — with every word whole: its longest word
 * must fit the column, and the wrapped block must not grow taller than the
 * zone. It only bites at the page's larger text sizes.
 */
function sizeCap(words: readonly string[]) {
  const longest = Math.max(1, ...words.map((word) => word.length));
  const length = Math.max(1, words.join(" ").length);
  return Math.floor(Math.min(440 / longest, Math.sqrt(150_000 / length)));
}

function TikTokState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  // The video on screen is the newest line's; before the song, the seat's own first video.
  const line = lines.at(-1);
  const creator = postOf(seat, line?.cueIndex ?? -1);
  // When the line changes the feed scrolls: the video before is carried up as the new one rises.
  const [post, setPost] = useState(creator.key);
  const [leaving, setLeaving] = useState<number | null>(null);
  if (post !== creator.key) {
    setLeaving(post);
    setPost(creator.key);
  }
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState("");
  const [likedComments, setLikedComments] = useState<readonly string[]>([]);


  // The participant's comments sit on top, newest first, as TikTok pins your own.
  const own = [...replies].reverse();
  const commentTotal = creator.comments + replies.length;

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const toggleComment = (id: string) =>
    setLikedComments((list) => (list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]));

  return (
    <section
      className={styles.app}
      aria-label="TikTok, For You"
      inert={!shown}
      data-running={(shown && !reducedMotion) || undefined}
      data-sheet={sheet || undefined}
    >
      <div className={styles.feed}>
        {leaving !== null && leaving !== post ? <LeavingPost key={leaving} post={postOf(seat, leaving)} /> : null}
        <div
          key={post}
          className={styles.post}
          data-phase={leaving !== null && leaving !== post && !reducedMotion ? "in" : undefined}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setLeaving(null);
          }}
        >
          <div className={styles.stage}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a still stands in for the playing video */}
            <img className={styles.video} src={STILL} alt="" draggable={false} />
            <div className={styles.shade} aria-hidden="true" />
            {/* The line is the text set on the video, in the middle, large. */}
            {line ? (
              <p key={line.cueIndex} data-lyric className={styles.autoCaption} aria-live="off" style={{ "--cap": `${sizeCap(line.words)}px` } as CSSProperties}>
                {/* One grid item, so the words wrap as running text. */}
                <span>
                  <LyricWords line={line} />
                </span>
              </p>
            ) : null}
          </div>
          <div className={styles.rail}>
            <div className={styles.creator}>
              <span className={styles.railAvatar}>
                <Avatar initials={creator.initials} tint={creator.tint} size="medium" />
              </span>
              <button
                type="button"
                className={styles.follow}
                data-done={followed || undefined}
                onClick={() => setFollowed(true)}
                aria-label={followed ? `Following ${creator.handle}` : `Follow ${creator.handle}`}
              >
                <Icon name={followed ? "check" : "plus"} />
              </button>
            </div>
            <button type="button" className={styles.action} data-on={liked ? "like" : undefined} aria-pressed={liked} aria-label="Like" onClick={() => setLiked((value) => !value)}>
              <Icon name="heart" />
              <span>{count(creator.likes + Number(liked))}</span>
            </button>
            <button type="button" className={styles.action} aria-label="Comments" onClick={() => setSheet(true)}>
              <Icon name="comment" />
              <span>{count(commentTotal)}</span>
            </button>
            <button type="button" className={styles.action} data-on={saved ? "save" : undefined} aria-pressed={saved} aria-label="Favorites" onClick={() => setSaved((value) => !value)}>
              <Icon name="bookmark" />
              <span>{count(creator.saves + Number(saved))}</span>
            </button>
            <span className={styles.action}>
              <Icon name="share" />
              <span>{count(creator.shares)}</span>
            </span>
            <span className={styles.record} aria-hidden="true">
              <span className={styles.notes}>
                <i>♪</i>
                <i>♫</i>
              </span>
              <span className={styles.disc}>
                <Avatar initials={creator.initials} tint={creator.tint} size="tiny" />
              </span>
            </span>
          </div>

          <div className={styles.info}>
            <strong className={styles.handle}>{creator.handle}</strong>
            {creator.caption ? <p className={styles.caption}>{creator.caption}</p> : null}
            <div className={styles.sound}>
              <Icon name="note" />
              <span className={styles.marquee}>
                <span>
                  <span>{creator.sound}</span>
                  <span aria-hidden="true">{creator.sound}</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <header className={styles.top}>
          <span className={styles.topIcon} aria-hidden="true">
            <Icon name="live" />
          </span>
          <nav className={styles.tabs} aria-label="Feeds">
            <span className={styles.tab}>
              Following
              <i className={styles.tabDot} aria-hidden="true" />
            </span>
            <span className={styles.tab} data-active>
              For You
            </span>
          </nav>
          <span className={styles.topIcon} aria-hidden="true">
            <Icon name="search" />
          </span>
        </header>

        <span className={styles.progress} aria-hidden="true">
          <span />
        </span>
      </div>

      <nav className={styles.tabBar} aria-label="Main">
        <NavItem label="Home" icon="home" active />
        <NavItem label="Friends" icon="friends" />
        <span className={styles.navItem}>
          <span className={styles.create}>
            <Icon name="plus" />
          </span>
        </span>
        <NavItem label="Inbox" icon="inbox" badge={3 + (seat % 5)} />
        <NavItem label="Profile" icon="profile" />
      </nav>

      {sheet ? (
        <div className={styles.sheetLayer}>
          <button type="button" className={styles.scrim} onClick={() => setSheet(false)} aria-label="Close comments" />
          <section className={styles.sheet} role="dialog" aria-label="Comments">
            <header className={styles.sheetHead}>
              <strong>{count(commentTotal)} comments</strong>
              <button type="button" onClick={() => setSheet(false)} aria-label="Close comments">
                <Icon name="close" />
              </button>
            </header>
            <div className={styles.commentList}>
              {own.map((reply) => (
                <div className={styles.comment} key={`r${reply.id}`}>
                  <Avatar initials="Y" tint="#c4c5c9" size="small" />
                  <div className={styles.commentBody}>
                    <strong>you</strong>
                    <p data-lyric>{reply.text}</p>
                    <small>
                      Just now<span>Reply</span>
                    </small>
                  </div>
                  <div className={styles.commentActions}>
                    <span>
                      <Icon name="heart" filled={false} />
                    </span>
                    <span>
                      <Icon name="dislike" filled={false} />
                    </span>
                  </div>
                </div>
              ))}
              {SEED_COMMENTS.map((comment) => {
                const on = likedComments.includes(comment.id);
                return (
                  <div className={styles.comment} key={comment.id}>
                    <Avatar initials={comment.initials} tint={comment.tint} size="small" />
                    <div className={styles.commentBody}>
                      <strong>{comment.author}</strong>
                      <p>{comment.body}</p>
                      <small>
                        {comment.time}
                        <span>Reply</span>
                      </small>
                    </div>
                    <div className={styles.commentActions}>
                      <button type="button" data-on={on || undefined} aria-pressed={on} aria-label={`Like comment by ${comment.author}`} onClick={() => toggleComment(comment.id)}>
                        <Icon name="heart" filled={on} />
                        <small>{count(comment.likes + Number(on))}</small>
                      </button>
                      <span>
                        <Icon name="dislike" filled={false} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <form className={styles.commentForm} onSubmit={send}>
              <Avatar initials="Y" tint="#c4c5c9" size="small" />
              <label className={styles.commentInput}>
                <span className={styles.visuallyHidden}>Add comment</span>
                <input
                  value={draft}
                  maxLength={SEND_LIMIT}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Add comment..."
                  enterKeyHint="send"
                  autoComplete="off"
                />
                <span aria-hidden="true">
                  <Icon name="image" />
                </span>
                <span aria-hidden="true">
                  <Icon name="emoji" />
                </span>
                <span aria-hidden="true">
                  <Icon name="at" />
                </span>
              </label>
              {draft.trim() ? (
                <button type="submit" className={styles.sendComment} aria-label="Post comment">
                  <Icon name="arrowUp" />
                </button>
              ) : null}
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default memo(TikTokState);
