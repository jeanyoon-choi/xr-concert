"use client";

// TikTok iOS, For You feed (dark, full-bleed video), at native points.
// Variant 2: the "flash digicam photo dump".
//
// Sources: ported from the measured replica in experiments-jyc SCC
// components/mobile/clone/12 (record docs/experiments/sns/mobile/12.md), whose
// glyphs, rail order, top tabs, caption block, opaque tab bar and comment sheet
// were checked against the TikTok App Store iPhone frames
// (apps.apple.com/us/app/tiktok/id835599320) and the comment-sheet image in
// TikTok's September 2026 newsroom post "Say more in the comments". Type is
// TikTok Sans, TikTok's own open-source face (OFL), self-hosted:
// public/fonts/tiktok-sans (the latin subset of the variable font). No glyph
// is drawn here; the icons are icons.tsx (see its header).
//
// Pictures: twelve direct-flash night candids (Unsplash License), 780 x 1520,
// in public/part4/v1/tiktok-2 with attribution.json. Each sung line is the next
// post of the feed, and the post (picture, handle, caption) is fixed by
// (seat, line).
//
// Lyric slot: the text the creator set on the picture with TikTok's text
// tool in its highlight mode: black type on a white rounded box that hugs
// each line, the boxes of neighbouring lines fused with rounded inner
// corners (an SVG threshold filter over a copy of the text does the fusing).
// It is centred on both axes of the video area. The whole line is laid out
// from its first word (../lyric-words): the white boxes of the full line are
// there with the first word and never change, and the words ease into them
// one by one, so nothing reflows or jumps.
// The comment sheet is real: what the participant posts goes through `act`
// and stays at the top of the sheet as their own comment.

import { memo, useState, type CSSProperties, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Icon, type IconName } from "./icons";
import type { SungLine } from "../../../song/lines";
import { LyricWords } from "../lyric-words";
import styles from "./tiktok.module.css";

const SEND_LIMIT = 150;
const PHOTOS = "/part4/v1/tiktok-2";

/**
 * The account is one private person's: the woman of the song, posting her own
 * camera roll. A phone keeps one handle and one profile picture; scrolling to
 * the next line is her next post. Captions are hers, short, some posts have
 * none, and a hashtag is rare.
 */
const POSTS: readonly { file: string; caption: string; tags?: readonly string[] }[] = [
  { file: "crowd", caption: "last night" },
  { file: "car-hood", caption: "found this on the digicam. not deleting it yet" },
  { file: "peace", caption: "" },
  { file: "mirror-camera", caption: "took myself out", tags: ["digicam"] },
  { file: "him", caption: "last one i took of him" },
  { file: "blur", caption: "it's blurry bc i was leaving" },
  { file: "walk-home", caption: "walking home w the girls" },
  { file: "geese", caption: "went to see the geese at midnight instead of texting back" },
  { file: "the-boys", caption: "his friends still tag me lol" },
  { file: "fence", caption: "" },
  { file: "crosswalk", caption: "sat down in the road abt it", tags: ["photodump"] },
  { file: "bathroom-mirror", caption: "never going to his friend's party again" },
];

/** Whose phone's feed this is: one personal handle and profile picture per seat. */
const OWNERS = [
  { handle: "mina_0412", face: "peace" },
  { handle: "jules.kwon", face: "fence" },
  { handle: "sunny__97", face: "crosswalk" },
  { handle: "ari.hye", face: "bathroom-mirror" },
  { handle: "noor.k_", face: "mirror-camera" },
  { handle: "wren02_", face: "geese" },
  { handle: "dahlia_y", face: "fence" },
  { handle: "june.seo", face: "peace" },
  { handle: "kit_0317", face: "bathroom-mirror" },
  { handle: "roo.park", face: "crosswalk" },
  { handle: "leah__m", face: "geese" },
  { handle: "theaa.02", face: "mirror-camera" },
] as const;

function hash(value: number) {
  let h = (value ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** The post a seat is on at line `cue`: fixed by (seat, cue), so a seek lands on the same post. */
function postOf(seat: number, cue: number) {
  const h = hash(seat * 131 + cue * 17 + 5);
  const roll = (salt: number) => (hash(h + salt) % 10_000) / 10_000;
  const owner = OWNERS[((seat % OWNERS.length) + OWNERS.length) % OWNERS.length]!;
  // A private account's numbers: 4 to about 300 likes, a few friends commenting.
  const likes = Math.round(4 * 75 ** roll(1));
  // Seats start 7 apart and each line steps 5 on (both coprime with 12): twelve
  // phones side by side show twelve different pictures, no phone shows one
  // twice in a row, and all twelve pass before any repeats.
  const post = POSTS[(((seat * 7 + (cue + 1) * 5) % POSTS.length) + POSTS.length) % POSTS.length]!;
  return {
    key: cue,
    handle: owner.handle,
    face: `${PHOTOS}/${owner.face}.jpg`,
    photo: `${PHOTOS}/${post.file}.jpg`,
    caption: post.caption,
    tags: post.tags ?? [],
    sound: `original sound - ${owner.handle}`,
    likes,
    comments: Math.min(20, Math.floor(roll(2) * Math.min(21, likes / 6 + 2))),
    saves: Math.min(15, Math.floor(roll(3) * Math.min(16, likes / 12 + 1))),
    shares: Math.min(10, Math.floor(roll(4) * Math.min(11, likes / 20 + 1))),
  };
}

type Comment = { id: string; author: string; initials: string; tint: string; body: string; time: string; likes: number };

/** Her friends, under her posts. */
const SEED_COMMENTS: readonly Comment[] = [
  { id: "c1", author: "hyejin__", initials: "H", tint: "#7d8aa3", body: "DO NOT text him", time: "2h", likes: 3 },
  { id: "c2", author: "dani.lee", initials: "D", tint: "#7a9488", body: "proud of u fr", time: "5h", likes: 2 },
  { id: "c3", author: "noah_k", initials: "N", tint: "#9a8070", body: "who took this", time: "6h", likes: 0 },
  { id: "c4", author: "kira.jung", initials: "K", tint: "#9384a8", body: "call me when ur home", time: "1d", likes: 1 },
  { id: "c5", author: "lou_b", initials: "L", tint: "#a39274", body: "ok but u look so good", time: "1d", likes: 1 },
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

/** A creator's profile picture: their own post, cropped to the circle. */
function PhotoAvatar({ photo, size }: { photo: string; size: "tiny" | "medium" }) {
  return <span className={styles.avatar} data-size={size} style={{ backgroundImage: `url(${photo})` }} aria-hidden="true" />;
}

/**
 * The largest size (px, after the page's text scale) at which a line still
 * sits in the clear zone of the video — under the top tabs, over the caption
 * block, its boxes 8 pt clear of the rail — with every word whole: its
 * longest word must fit the column, and the wrapped block must not grow
 * taller than the zone. It only bites at the page's larger text sizes.
 */
function sizeCap(text: string) {
  const longest = Math.max(1, ...text.split(" ").map((word) => word.length));
  // The column is 250 pt; a word's box is its letters (about 0.54 em each) and 0.36 em of room on each side.
  return Math.floor(Math.min(250 / (0.54 * longest + 0.8), Math.sqrt(75_000 / Math.max(1, text.length))));
}

/**
 * The line as TikTok's text tool sets it in highlight mode. The white boxes
 * are a copy of the text (transparent type, white per-line background) run
 * through the threshold filter, which fuses the lines and rounds the inner
 * corners; the black type sits over it in the same grid cell.
 */
function Lyric({ text, line }: { text: string; line?: SungLine }) {
  return (
    <div data-lyric className={styles.lyric} style={{ "--cap": `${sizeCap(text)}px` } as CSSProperties}>
      {/* The boxes of the whole line, from its first word. */}
      <p className={styles.lyricBox} aria-hidden="true">
        <span>{text}</span>
      </p>
      <p className={styles.lyricText} aria-live="off">
        <span>{line ? <LyricWords line={line} /> : text}</span>
      </p>
    </div>
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
function LeavingPost({ post, text }: { post: ReturnType<typeof postOf>; text: string | null }) {
  return (
    <div className={styles.post} data-phase="out" aria-hidden="true">
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a still stands in for the playing video */}
        <img className={styles.video} src={post.photo} alt="" draggable={false} />
        <div className={styles.shade} />
        {text ? <Lyric text={text} /> : null}
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

  // The post scrolling away keeps its whole line on it.
  const before = lines.at(-2);
  const leavingText = before && before.cueIndex === leaving ? before.full : null;

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
        {leaving !== null && leaving !== post ? <LeavingPost key={leaving} post={postOf(seat, leaving)} text={leavingText} /> : null}
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
            <img className={styles.video} src={creator.photo} alt="" draggable={false} />
            <div className={styles.shade} aria-hidden="true" />
            {/* The line is the text set on the picture, in the middle, large. */}
            {line ? <Lyric text={line.full} line={line} /> : null}
          </div>
          <div className={styles.rail}>
            <div className={styles.creator}>
              <span className={styles.railAvatar}>
                <PhotoAvatar photo={creator.face} size="medium" />
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
                <PhotoAvatar photo={creator.face} size="tiny" />
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

      {/* The text tool's highlight: blur the per-line white boxes, then cut the alpha back hard, so they fuse with rounded inner corners. Also keeps every picture of the feed loaded, so a scroll never lands on black. */}
      <svg className={styles.defs} aria-hidden="true">
        <filter id="tiktok-2-highlight" x="-10%" y="-20%" width="120%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 24 -11" />
        </filter>
      </svg>
      <div className={styles.preload} aria-hidden="true">
        {POSTS.map((entry) => (
          // eslint-disable-next-line @next/next/no-img-element -- warms the cache for the feed's stills
          <img key={entry.file} src={`${PHOTOS}/${entry.file}.jpg`} alt="" />
        ))}
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
              <strong>{commentTotal === 1 ? "1 comment" : `${count(commentTotal)} comments`}</strong>
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
