"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { clockAgo, dateLabel, formatSongClock } from "../../clock-face";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import { EverytimeIcon } from "./icons";
import styles from "./everytime.module.css";

// Everytime (에브리타임, iOS, light), one 자유게시판 post opened from the
// board, written 익명. The song is someone writing about their ex at 9:30 pm:
// the first sung line becomes the post's title, the next two its body, and
// every later line arrives as a 댓글 underneath — 익명1, 익명2 … numbered in
// order of first comment, as Everytime does; every third line is a 대댓글 to
// the comment above it, half of those from 익명(글쓴이) (the post's writer,
// in Everytime's teal). 공감 counts accrue as comments age. The comment bar is
// real: the participant's 댓글 takes the next 익명 number (or their nickname
// with 익명 unchecked) and lands after the line it followed. Before the song
// the same screen shows an ordinary post with its comments.
//
// Sources: glyphs from the served "Everytime Icons" font (see icons.tsx);
// colours from everytime.kr's served CSS — brand/공감 red #F91F15, 댓글 teal
// #05BCBC, 스크랩 yellow #FFC900, ink #292929, secondary #737373 / #A6A6A6,
// rules #E3E3E3, child-comment well #F9F9F9 (css/container.article.css,
// css/5ebc99fa8d1304d8e1dd.css, fetched 2026-11-03). Layout metrics (nav,
// 40 pt profile, comment pill controls, composer) follow the iOS app and are
// not measured from a capture. The default profile is Everytime's grey
// person glyph, not a photo.

const COMMENT_LIMIT = 120;
/** Comments kept in the DOM (the post keeps its own three lines). */
const KEEP = 28;
const POST_LINES = 3;

const NICKNAMES = ["새벽세시", "학식러버", "중도지박령", "막학기", "공강요정", "자취3년차"] as const;

/** Today as Everytime writes it: "11/03". */
const DAY = dateLabel("en-US", { month: "2-digit", day: "2-digit" });

/** The board at rest: an ordinary 자유게시판 post from before the song. */
const RESTING = {
  title: "전 애인한테 연락오면 다들 답장함?",
  body: "헤어진 지 반년 됐는데 방금 잘 지내냐고 연락옴\n읽씹하는 게 맞겠지..?",
  time: `${DAY} ${clockAgo(18)}`,
  comments: [
    { author: 1, text: "ㄴㄴ 절대 하지마", time: `${DAY} ${clockAgo(16)}`, likes: 6, child: false },
    { author: 2, text: "새벽에 오는 연락은 다 똑같음 ㅋㅋ", time: `${DAY} ${clockAgo(14)}`, likes: 3, child: false },
    { author: 0, text: "아직 안 읽었어 미리보기로만 봄", time: `${DAY} ${clockAgo(13)}`, likes: 1, child: true },
    { author: 3, text: "답장하는 순간 또 반년 날아간다", time: `${DAY} ${clockAgo(9)}`, likes: 4, child: false },
  ],
} as const;

type Comment = {
  key: string;
  at: number;
  /** 0 = 글쓴이; otherwise a commenter id, numbered on first appearance. */
  author: number | "me";
  text: string;
  time: string;
  likes: number;
  child: boolean;
  typing: boolean;
};

/** "21:31" → "11/03 21:31", Everytime's comment stamp. */
function stamp(songMs: number) {
  return `${DAY} ${formatSongClock(songMs)}`;
}

function Profile({ size }: { size: "post" | "comment" }) {
  return (
    <span className={styles.profile} data-size={size} aria-hidden="true">
      <EverytimeIcon name="user_filled" size={size === "post" ? 30 : 18} />
    </span>
  );
}

function EverytimeState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  // Whether each of the participant's comments was sent 익명, by send order.
  const [anonFlags, setAnonFlags] = useState<readonly boolean[]>([]);
  const pageRef = useRef<HTMLDivElement>(null);
  const nickname = NICKNAMES[seat % NICKNAMES.length]!;

  const resting = lines.length === 0;
  const base = lines[0]?.cueIndex ?? 0;
  const lastCue = lines.at(-1)?.cueIndex ?? -1;
  const postLines = lines.filter((line) => line.cueIndex < base + POST_LINES);
  const title = resting ? RESTING.title : postLines[0]!.text;
  const body = resting ? RESTING.body.split("\n") : postLines.slice(1).map((line) => line.text);
  const postTime = resting ? RESTING.time : stamp(lines[0]!.startMs);

  const comments = useMemo(() => {
    const list: Comment[] = [];
    if (resting) {
      RESTING.comments.forEach((comment, index) =>
        list.push({ key: `rest${index}`, at: -10 + index, author: comment.author, text: comment.text, time: comment.time, likes: comment.likes, child: comment.child, typing: false }),
      );
    }
    for (const line of lines) {
      const ordinal = line.cueIndex - base - POST_LINES;
      if (ordinal < 0) continue;
      const child = ordinal % 3 === 2;
      const age = lastCue - line.cueIndex;
      list.push({
        key: `l${line.cueIndex}`,
        at: line.cueIndex,
        // A 대댓글 is the writer answering half the time; everyone else is new.
        author: child && ordinal % 6 === 2 ? 0 : 100 + ordinal,
        text: line.text,
        time: stamp(line.startMs),
        likes: age < 1 ? 0 : Math.min(Math.ceil(age / 2), 1 + ((line.cueIndex * 7) % 5)),
        child,
        typing: line.current,
      });
    }
    replies.forEach((reply) => {
      const at = lines.find((line) => line.cueIndex === reply.afterCue);
      list.push({
        key: `r${reply.id}`,
        at: reply.afterCue + 0.5,
        author: "me",
        text: reply.text,
        time: at ? stamp(at.startMs) : RESTING.time,
        likes: 0,
        child: false,
        typing: false,
      });
    });
    list.sort((x, y) => x.at - y.at);
    // A 대댓글 needs a comment above it to answer.
    if (list[0]?.child) list[0] = { ...list[0], child: false };
    return list;
  }, [base, lastCue, lines, replies, resting]);

  // 익명N in order of first comment; the participant is one person.
  const names = useMemo(() => {
    const order = new Map<number | "me", number>();
    let replyIndex = -1;
    return comments.map((comment) => {
      if (comment.author === "me") {
        replyIndex += 1;
        if (!(anonFlags[replyIndex] ?? true)) return { label: nickname, writer: false };
      }
      if (comment.author === 0) return { label: "익명(글쓴이)", writer: true };
      if (!order.has(comment.author)) order.set(comment.author, order.size + 1);
      return { label: `익명${order.get(comment.author)}`, writer: false };
    });
  }, [anonFlags, comments, nickname]);

  const total = comments.length;
  const visible = comments.slice(Math.max(0, total - KEEP));
  const offset = total - visible.length;
  const postLikes = resting ? 7 : Math.max(0, Math.floor(total / 2));
  const scraps = resting ? 1 : Math.floor(total / 6);

  // Once the comments start arriving, the newest one is kept in view.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !shown || resting) return;
    follow(page, page.scrollHeight - page.clientHeight, reducedMotion);
  }, [comments, title, shown, reducedMotion, resting]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, COMMENT_LIMIT);
    if (!text) return;
    setAnonFlags((flags) => [...flags, anonymous]);
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label="에브리타임 자유게시판" inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.navButton}>
          <EverytimeIcon name="arrow_back" size={24} />
        </span>
        <span className={styles.navTitle}>
          <strong>자유게시판</strong>
          <span>연세대 신촌캠</span>
        </span>
        <span className={styles.navActions}>
          <EverytimeIcon name="notification" size={24} />
          <EverytimeIcon name="more" size={24} />
        </span>
      </header>

      <div ref={pageRef} className={styles.page}>
        <article className={styles.post}>
          <div className={styles.author}>
            <Profile size="post" />
            <div>
              <strong>익명</strong>
              <time>{postTime}</time>
            </div>
          </div>
          <h1 className={styles.title} data-typing={(!resting && postLines.length === 1 && lines[0]!.current) || undefined}>
            {title}
          </h1>
          {body.length > 0 ? (
            <p className={styles.body}>
              {body.map((text, index) => (
                <span key={index}>
                  {text}
                  {index < body.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          ) : null}
          <ul className={styles.counts}>
            <li data-kind="like">
              <EverytimeIcon name="like_filled" size={13} />
              {postLikes}
            </li>
            <li data-kind="comment">
              <EverytimeIcon name="comment_filled" size={13} />
              {total}
            </li>
            <li data-kind="scrap">
              <EverytimeIcon name="scrap_filled" size={13} />
              {scraps}
            </li>
          </ul>
          <div className={styles.buttons}>
            <span>
              <EverytimeIcon name="like" size={14} />
              공감
            </span>
            <span>
              <EverytimeIcon name="scrap" size={14} />
              스크랩
            </span>
          </div>
        </article>

        <div className={styles.comments}>
          {visible.map((comment, index) => {
            const name = names[offset + index]!;
            return (
              <div key={comment.key} className={styles.commentRow} data-child={comment.child || undefined}>
                {comment.child ? (
                  <span className={styles.replyMark}>
                    <EverytimeIcon name="reply" size={16} />
                  </span>
                ) : null}
                <div className={styles.comment}>
                  <div className={styles.commentHead}>
                    <Profile size="comment" />
                    <strong data-writer={name.writer || undefined}>{name.label}</strong>
                    <span className={styles.controls}>
                      {comment.child ? null : (
                        <span>
                          <EverytimeIcon name="comment_filled" size={12} />
                        </span>
                      )}
                      <span>
                        <EverytimeIcon name="like_filled" size={12} />
                      </span>
                      <span>
                        <EverytimeIcon name="more" size={12} />
                      </span>
                    </span>
                  </div>
                  <p className={styles.commentText}>{comment.text}</p>
                  <div className={styles.commentMeta}>
                    <time>{comment.time}</time>
                    {comment.likes > 0 ? (
                      <span>
                        <EverytimeIcon name="like_filled" size={11} />
                        {comment.likes}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <div className={styles.field}>
          <button
            type="button"
            className={styles.anon}
            aria-pressed={anonymous}
            onClick={() => setAnonymous((value) => !value)}
          >
            <EverytimeIcon name={anonymous ? "check_mini_on" : "check_mini_off"} size={16} />
            익명
          </button>
          <label className={styles.input}>
            <span className={styles.visuallyHidden}>댓글 입력</span>
            <input
              value={draft}
              maxLength={COMMENT_LIMIT}
              placeholder="댓글을 입력하세요."
              onChange={(event) => setDraft(event.target.value)}
              enterKeyHint="send"
              autoComplete="off"
            />
          </label>
          <button type="submit" className={styles.send} aria-label="댓글 작성" disabled={!draft.trim()}>
            <EverytimeIcon name="send_filled" size={22} />
          </button>
        </div>
      </form>
    </section>
  );
}

export default memo(EverytimeState);
