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
// Lyric slot: the film's subtitle. The account is one private person's — the
// same handle on every video of a phone, with a private account's small
// counts and a few friends in the comments. Each of her videos is made like a
// "movie scene with subtitles" edit: a 16:9 frame letterboxed in the
// vertical video (black above and below), and the sung line burnt in as the
// subtitle — yellow sans with a black edge, centred at the foot of the frame,
// in a column clear of the rail, balanced. The whole line is laid out at once and the
// words not yet sung are left unpainted, so the line break never moves while
// the line is sung; each word eases in (../lyric-words). Each line is her next video: the feed scrolls, the frame,
// the caption and the counts change.
// The frames are photographs (Unsplash License), cropped to 16:9:
// public/part4/v1/tiktok-4, credits in attribution.json there. The grain over
// them is an feTurbulence noise tile and the vignette a gradient (both CSS).
// No glyph was drawn for this variant; the icons are the ones in icons.tsx.
// The comment sheet is real: what the participant posts goes through `act`
// and stays at the top of the sheet as their own comment.

import { memo, useState, type CSSProperties, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Icon, type IconName } from "./icons";
import type { SungLine } from "../../../song/lines";
import { LyricWords } from "../lyric-words";
import styles from "./tiktok.module.css";

const SEND_LIMIT = 150;

/** The frames: twelve photographs in one warm, autumnal, shot-on-film look. */
const STILLS = Array.from({ length: 12 }, (_, index) => `/part4/v1/tiktok-4/still-${String(index + 1).padStart(2, "0")}.jpg`);

/** The frame of a seat's video at line `cue`: fixed by (seat, cue), never the same twice running, and different on neighbouring seats. */
function stillOf(seat: number, cue: number) {
  const count = STILLS.length;
  const step = seat % 2 ? 7 : 5;
  return STILLS[(((seat * 5 + (cue + 1) * step) % count) + count) % count]!;
}

/** Whose phone-sized account this is: one private person per seat, the same on all her videos. */
const HANDLES = ["minji_0211", "sophie.k97", "jules.park", "yuna__02", "claire.hw", "nari_98", "emma.jy", "dahye.k", "lena_0417", "sora.lim", "ivy.cho", "mina.r_"] as const;
const TINTS = ["#6f5b8f", "#8d6a52", "#4f7a71", "#5b6f94", "#94705a", "#6a7f5a"] as const;
/** What she writes under a video: short, to no one in particular, often nothing. */
const CAPTIONS = [
  "",
  "anyway",
  "posting this so i dont text him",
  "",
  "it was always like this",
  "one year",
  "dont ask",
  "found these on the old camera",
  "",
  "ok last one",
  "he hated this photo",
  "for me, not for you",
  "autumn again",
  "",
] as const;
const TAG_SETS: readonly (readonly string[])[] = [[], [], [], [], ["35mm"], ["fall"], ["35mm", "fall"]];

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
  // A private account: a few to a few hundred likes, a handful of everything else.
  const likes = Math.round(4 * 75 ** roll(1));
  const handle = HANDLES[((seat % HANDLES.length) + HANDLES.length) % HANDLES.length]!;
  return {
    key: cue,
    still: stillOf(seat, cue),
    handle,
    initials: handle[0]!.toUpperCase(),
    tint: TINTS[hash(seat + 11) % TINTS.length]!,
    caption: CAPTIONS[(h >>> 9) % CAPTIONS.length]!,
    tags: TAG_SETS[(h >>> 14) % TAG_SETS.length]!,
    sound: `original sound - ${handle}`,
    likes,
    // As many as the sheet lists: friends, none to six.
    comments: Math.min(SEED_COMMENTS.length, Math.floor(roll(2) ** 1.5 * (SEED_COMMENTS.length + 1))),
    saves: Math.floor(roll(3) ** 2 * 16),
    shares: Math.floor(roll(4) ** 2 * 11),
  };
}

type Comment = { id: string; author: string; initials: string; tint: string; body: string; time: string; likes: number };

/** Her friends, under her videos. */
const SEED_COMMENTS: readonly Comment[] = [
  { id: "c1", author: "hyejin", initials: "H", tint: "#7d8aa3", body: "are you ok. call me", time: "2h", likes: 3 },
  { id: "c2", author: "noah.k", initials: "N", tint: "#9a8070", body: "we never liked him btw", time: "5h", likes: 6 },
  { id: "c3", author: "dani", initials: "D", tint: "#7a9488", body: "coming over tonight, not a question", time: "6h", likes: 2 },
  { id: "c4", author: "kiraaa", initials: "K", tint: "#9384a8", body: "the subtitles. stop", time: "1d", likes: 1 },
  { id: "c5", author: "lou", initials: "L", tint: "#a39274", body: "proud of you for not texting him", time: "1d", likes: 4 },
  { id: "c6", author: "jisoo_y", initials: "J", tint: "#8a8f7a", body: "delete his number i mean it", time: "2d", likes: 0 },
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
 * The largest size (px, after the page's text scale) at which a subtitle
 * still sits inside the film frame, 8 pt clear of the rail, with every word
 * whole: its longest word must fit the column, and the wrapped block must
 * not grow taller than the frame. It only bites at the page's larger text
 * sizes.
 */
function sizeCap(text: string) {
  const longest = Math.max(1, ...text.split(" ").map((word) => word.length));
  return Math.floor(Math.min(440 / longest, Math.sqrt(62_000 / Math.max(1, text.length))));
}

/**
 * The video: one film frame letterboxed in the vertical video, the line burnt
 * in as its subtitle. The whole line is set, the part not yet sung unpainted,
 * so the two-line break holds from the first word.
 */
function Frame({ still, line, text }: { still: string; line?: SungLine; text?: string | null }) {
  const full = line?.full ?? text ?? "";
  return (
    <div className={styles.band}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a still stands in for the playing video */}
      <img className={styles.video} src={still} alt="" draggable={false} />
      <span className={styles.grain} aria-hidden="true" />
      {line || text ? (
        <p data-lyric className={styles.subtitle} aria-live="off" style={{ "--cap": `${sizeCap(full)}px` } as CSSProperties}>
          {line ? <LyricWords line={line} /> : text}
        </p>
      ) : null}
    </div>
  );
}

/** The video the feed is scrolling away from: its picture and who posted it, carried up and off. */
function LeavingPost({ post, subtitle }: { post: ReturnType<typeof postOf>; subtitle: string | null }) {
  return (
    <div className={styles.post} data-phase="out" aria-hidden="true">
      <div className={styles.stage}>
        <Frame still={post.still} text={subtitle} />
        <div className={styles.shade} />
      </div>
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

  // The line is the frame's subtitle; the video scrolling away keeps the line it carried.
  const before = lines.at(-2);
  const leavingSubtitle = before && before.cueIndex === leaving ? before.full : null;

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
        {leaving !== null && leaving !== post ? <LeavingPost key={leaving} post={postOf(seat, leaving)} subtitle={leavingSubtitle} /> : null}
        <div
          key={post}
          className={styles.post}
          data-phase={leaving !== null && leaving !== post && !reducedMotion ? "in" : undefined}
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setLeaving(null);
          }}
        >
          <div className={styles.stage}>
            <Frame still={creator.still} line={line} />
            <div className={styles.shade} aria-hidden="true" />
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
            {creator.caption || creator.tags.length ? (
              <p className={styles.caption}>
                {creator.caption}{" "}
                {creator.tags.map((tag) => (
                  <b key={tag}>#{tag} </b>
                ))}
              </p>
            ) : (
              <span className={styles.captionGap} />
            )}
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

        {/* Every frame is fetched once, so the next video never rises blank. */}
        <div hidden>
          {STILLS.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element -- preload only
            <img key={src} src={src} alt="" />
          ))}
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
                        <small>{comment.likes + Number(on) || ""}</small>
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
