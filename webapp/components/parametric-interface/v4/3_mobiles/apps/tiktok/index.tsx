"use client";

// TikTok iOS, For You feed (dark, full-bleed video), at native points.
//
// Sources: ported from the measured replica in experiments-jyc SCC
// components/mobile/clone/12 (record docs/experiments/sns/mobile/12.md), whose
// glyphs, rail order, top tabs, caption block, opaque tab bar and comment sheet
// were checked against the TikTok App Store iPhone frames
// (apps.apple.com/us/app/tiktok/id835599320) and the comment-sheet image in
// TikTok's September 2026 newsroom post "Say more in the comments". Type is
// TikTok Sans, TikTok's own open-source face (OFL, Google Fonts).
//
// Lyric slot: the video's auto-captions. The sung line is the creator's
// voice in the clip, so it appears as TikTok's on-video caption — white
// text on a dark rounded backing, centred over the lower third — word by
// word, and leaves when the line ends, as captions do. The post itself uses
// the song's sound ("toxic till the end - ROSÉ"), shown in the ♫ marquee.
// The comment sheet is real: what the participant posts goes through `act`
// and stays at the top of the sheet as their own comment.

import { TikTok_Sans } from "next/font/google";
import { memo, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Icon, type IconName } from "./icons";
import styles from "./tiktok.module.css";

const tiktokSans = TikTok_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "swap", preload: false });

const SEND_LIMIT = 150;
const STILL = "/parametric-interface/v4/apps/tiktok/room.svg";
const SOUND = "original sound - sunny.on.repeat";

/** Each seat scrolled onto a different stranger's post. */
const CREATORS = [
  { handle: "mina.afterdark", initials: "M", tint: "#6f5b8f", caption: "pov: you finally stopped answering his 2am texts", likes: 248_300, comments: 3104, saves: 41_200, shares: 18_900 },
  { handle: "julesrewrites", initials: "J", tint: "#8d6a52", caption: "the way i defended him to my friends for 2 years", likes: 96_400, comments: 1872, saves: 12_700, shares: 6408 },
  { handle: "sunny.on.repeat", initials: "S", tint: "#4f7a71", caption: "blocked, unblocked, blocked again. healing isnt linear", likes: 512_000, comments: 8731, saves: 77_900, shares: 40_100 },
  { handle: "theo.leaves.early", initials: "T", tint: "#5b6f94", caption: "me pretending i dont still check his close friends story", likes: 33_800, comments: 912, saves: 4410, shares: 2087 },
  { handle: "ari.in.her.era", initials: "A", tint: "#94705a", caption: "this song came on in the uber and i had to sit with it", likes: 187_600, comments: 2655, saves: 25_300, shares: 11_400 },
  { handle: "samdeletedthepics", initials: "S", tint: "#6a7f5a", caption: "finally threw out the hoodie. it still smelled like him", likes: 74_100, comments: 1430, saves: 9802, shares: 5316 },
] as const;

const TAGS = ["exes", "situationship", "fyp"] as const;

type Comment = { id: string; author: string; initials: string; tint: string; body: string; time: string; likes: number };

const SEED_COMMENTS: readonly Comment[] = [
  { id: "c1", author: "hyejin", initials: "H", tint: "#7d8aa3", body: "why is this literally my last relationship", time: "2h", likes: 4812 },
  { id: "c2", author: "noah.k", initials: "N", tint: "#9a8070", body: "the sound choice is personal at this point", time: "5h", likes: 2209 },
  { id: "c3", author: "dani 🌙", initials: "D", tint: "#7a9488", body: "go no contact bestie we are so proud of you", time: "6h", likes: 1377 },
  { id: "c4", author: "kiraaa", initials: "K", tint: "#9384a8", body: "he’s not coming back and that’s the good part", time: "1d", likes: 968 },
  { id: "c5", author: "lou", initials: "L", tint: "#a39274", body: "saving this for when i get the urge to text him", time: "1d", likes: 512 },
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

function TikTokState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const creator = CREATORS[seat % CREATORS.length]!;
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState("");
  const [likedComments, setLikedComments] = useState<readonly string[]>([]);

  // Captions show the line being sung, and clear once it is over.
  const line = lines.at(-1);
  const caption = line?.current ? line.text : null;

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
      className={`${styles.app} ${tiktokSans.className}`}
      aria-label="TikTok, For You"
      inert={!shown}
      data-running={(shown && !reducedMotion) || undefined}
      data-sheet={sheet || undefined}
    >
      <div className={styles.feed}>
        <div className={styles.stage}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a local still stands in for the playing video */}
          <img className={styles.video} src={STILL} alt="" draggable={false} />
          <div className={styles.shade} aria-hidden="true" />
          {caption ? (
            <p className={styles.autoCaption} aria-live="off">
              <span>{caption}</span>
            </p>
          ) : null}
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
          <p className={styles.caption}>
            {creator.caption}{" "}
            {TAGS.map((tag) => (
              <b key={tag}>#{tag} </b>
            ))}
          </p>
          <div className={styles.sound}>
            <Icon name="note" />
            <span className={styles.marquee}>
              <span>
                <span>{SOUND}</span>
                <span aria-hidden="true">{SOUND}</span>
              </span>
            </span>
          </div>
        </div>

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
                    <p>{reply.text}</p>
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
