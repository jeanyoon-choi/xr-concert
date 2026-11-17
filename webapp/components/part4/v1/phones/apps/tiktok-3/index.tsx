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
// Lyric slot (variant 3, "black-screen lyric edit"): the video itself. Every
// video is pure black, no picture, the line set large in lowercase white in
// the dead centre of the video. The whole line is laid out from its first
// word (so it never reflows): words already sung are white, words to come are
// dim grey, each easing to white as it is sung (../lyric-words, rest="dim").
// The account is one private person per phone — the woman of the
// song, posting about her ex: the same handle on every video, small numbers,
// short private captions. Each sung line is her next video, so the feed
// scrolls and the caption and counts change. No sound, handle or caption
// names the song or the singer.
// The comment sheet is real: what the participant posts goes through `act`
// and stays at the top of the sheet as their own comment.
//
// Glyphs: all icons come from ./icons (the ported replica's own drawings of
// TikTok's glyphs); nothing new is drawn in this variant.

import { memo, useState, type CSSProperties, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Icon, type IconName } from "./icons";
import type { SungLine } from "../../../song/lines";
import { LyricWords } from "../lyric-words";
import styles from "./tiktok.module.css";

const SEND_LIMIT = 150;
/** One private person per phone: every video on a phone is hers. */
const HANDLES = ["hannah_0412", "sofia.rey", "jiwoo__97", "mia.k02", "chloe_brn", "nat.alvz", "yuna0308", "em.hartley", "lena_vv", "zoe.m_", "rin__404", "isa.bel7", "dani_0x", "noor.h_", "kate.lin3", "ari_0921"] as const;
const TINTS = ["#6f5b8f", "#8d6a52", "#4f7a71", "#5b6f94", "#94705a", "#6a7f5a"] as const;
/** What she writes under a video: short, lowercase, often nothing. */
const CAPTIONS = [
  "",
  "",
  "",
  "anyway",
  "don't ask",
  "he knows",
  "not about anyone",
  "ok last one",
  "its fine im fine",
  "delete later",
  "3am again",
  "for me not for you",
  "day 12 of not texting",
  "posting this then logging off",
  "should've made this close friends only",
  "no one reply to this",
] as const;
const TAGS = [[], [], [], [], [], [], [], ["nocontact"], ["fyp"], ["exes", "fyp"]] as const;

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The video a seat is on at line `cue`: fixed by (seat, cue), so a seek lands on the same post. The person is fixed by the seat alone. */
function postOf(seat: number, cue: number) {
  const h = hash(seat * 131 + cue * 17 + 5);
  const roll = (salt: number) => (hash(h + salt) % 10_000) / 10_000;
  // A private account's numbers: 4 to 300 likes, a handful of everything else.
  const likes = Math.round(4 * 75 ** roll(1));
  const handle = HANDLES[Math.abs(seat) % HANDLES.length]!;
  return {
    key: cue,
    handle,
    initials: handle[0]!.toUpperCase(),
    tint: TINTS[(hash(seat + 11) >>> 5) % TINTS.length]!,
    caption: CAPTIONS[(h >>> 9) % CAPTIONS.length]!,
    tags: TAGS[(h >>> 14) % TAGS.length]!,
    sound: `original sound - ${handle}`,
    likes,
    comments: Math.min(20, Math.floor(roll(2) * (likes / 6 + 1))),
    saves: Math.min(15, Math.floor(roll(3) * (likes / 12 + 1))),
    shares: Math.min(10, Math.floor(roll(4) * (likes / 20 + 1))),
  };
}

type Comment = { id: string; author: string; initials: string; tint: string; body: string; time: string; likes: number };

/** Her friends, under her video. */
const SEED_COMMENTS: readonly Comment[] = [
  { id: "c1", author: "hyejin", initials: "H", tint: "#7d8aa3", body: "girl. call me", time: "12m", likes: 3 },
  { id: "c2", author: "noah.k", initials: "N", tint: "#9a8070", body: "we never liked him btw", time: "40m", likes: 6 },
  { id: "c3", author: "dani 🌙", initials: "D", tint: "#7a9488", body: "proud of you fr", time: "1h", likes: 2 },
  { id: "c4", author: "kiraaa", initials: "K", tint: "#9384a8", body: "DO NOT text him. text me", time: "2h", likes: 4 },
  { id: "c5", author: "lou", initials: "L", tint: "#a39274", body: "omw with ice cream", time: "3h", likes: 1 },
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

/**
 * The largest size (px, after the page's text scale) at which a line still
 * sits inside the clear zone of the video — under the top tabs, over the
 * caption block, beside the rail: its longest word must fit the column, and
 * the wrapped block must not grow taller than the zone.
 */
function sizeCap(words: readonly string[]) {
  const longest = Math.max(1, ...words.map((word) => word.length));
  const length = Math.max(1, words.join(" ").length);
  return Math.floor(Math.min(500 / longest, Math.sqrt(125_000 / length)));
}

/** The line on the black video: every word laid out from the start, white once sung, dim until then. */
function Lyric({ line }: { line: SungLine }) {
  return (
    <p data-lyric className={styles.lyric} aria-live="off" style={{ "--cap": `${sizeCap(line.words)}px` } as CSSProperties}>
      {/* One grid item, so the words wrap as running text. */}
      <span>
        <LyricWords line={line} rest="dim" />
      </span>
    </p>
  );
}

/** The video the feed is scrolling away from: its finished line and who posted it, carried up and off. */
function LeavingPost({ post, line }: { post: ReturnType<typeof postOf>; line: SungLine | undefined }) {
  return (
    <div className={styles.post} data-phase="out" aria-hidden="true">
      <div className={styles.stage}>{line ? <Lyric line={line} /> : null}</div>
      <div className={styles.info}>
        <strong className={styles.handle}>{post.handle}</strong>
        {post.caption ? <p className={styles.caption}>{post.caption}</p> : null}
      </div>
    </div>
  );
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
        {leaving !== null && leaving !== post ? <LeavingPost key={leaving} post={postOf(seat, leaving)} line={lines.find((entry) => entry.cueIndex === leaving)} /> : null}
        <div
          key={post}
          className={styles.post}
          data-phase={leaving !== null && leaving !== post && !reducedMotion ? "in" : undefined}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setLeaving(null);
          }}
        >
          <div className={styles.stage}>{line ? <Lyric line={line} /> : null}</div>
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
            {creator.caption || creator.tags.length ? (
              <p className={styles.caption}>
                {creator.caption}{" "}
                {creator.tags.map((tag) => (
                  <b key={tag}>#{tag} </b>
                ))}
              </p>
            ) : null}
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
              {SEED_COMMENTS.slice(0, creator.comments).map((comment) => {
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
