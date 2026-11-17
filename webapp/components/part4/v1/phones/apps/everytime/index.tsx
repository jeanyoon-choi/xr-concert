"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import { EverytimeIcon } from "./icons";
import styles from "./everytime.module.css";

// Everytime (에브리타임, iOS, light), one 자유게시판 post opened from the
// board, written 익명 — her own post, seen from her phone. She is pouring it
// out on the campus board at night: the first sung line is the post's title,
// every line after it is the next line of the same post's body, growing as
// she types. It was posted 방금 and nobody has reacted: 공감 0, 댓글 0,
// 스크랩 0, no comments from anyone. The comment bar is real: what the
// participant writes lands under the post as her own 댓글 — 익명(글쓴이) in
// Everytime's teal, or her nickname with 익명 unchecked. Before the song the
// same screen holds a post of hers from the same night. A line marked bold
// is set in bold.
//
// Sources: glyphs from the served "Everytime Icons" font (see icons.tsx; no
// glyph is drawn here); colours from everytime.kr's served CSS — brand/공감
// red #F91F15, 댓글 teal #05BCBC, 스크랩 yellow #FFC900, ink #292929,
// secondary #737373 / #A6A6A6, rules #E3E3E3, child-comment well #F9F9F9
// (css/container.article.css, css/5ebc99fa8d1304d8e1dd.css, fetched
// 2026-11-03). Layout metrics (nav, 40 pt profile, comment pill controls,
// composer) follow the iOS app and are not measured from a capture. The
// default profile is Everytime's grey person glyph, not a photo.

const COMMENT_LIMIT = 120;
/** Comments kept in the DOM. */
const KEEP = 28;

const NICKNAMES = ["새벽세시", "학식러버", "중도지박령", "막학기", "공강요정", "자취3년차"] as const;

/** Her post at rest, before the song. */
const RESTING = {
  title: "새벽에 전 애인 생각나는 사람",
  body: ["나만 그런 거 아니지", "헤어진 지 반년인데 아직도 이럼"],
} as const;

type Comment = { key: string; text: string; anonymous: boolean };

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
  const postRef = useRef<HTMLElement>(null);
  const nickname = NICKNAMES[seat % NICKNAMES.length]!;

  const resting = lines.length === 0;
  const first = lines[0];
  const last = lines.at(-1);
  const body = lines.slice(1);

  // Only she is here: what the participant writes is the writer's own 댓글.
  const comments = useMemo(
    () => replies.map((reply, index): Comment => ({ key: `r${reply.id}`, text: reply.text, anonymous: anonFlags[index] ?? true })),
    [anonFlags, replies],
  );

  const total = comments.length;
  const visible = comments.slice(Math.max(0, total - KEEP));
  const lastComment = comments.at(-1)?.key;

  // The line being typed stays in view; a comment she adds brings the page to its foot.
  useLayoutEffect(() => {
    const page = pageRef.current;
    const post = postRef.current;
    if (!page || !post || !shown || resting) return;
    const foot = lastComment ? page.scrollHeight - page.clientHeight : post.offsetTop + post.offsetHeight - page.clientHeight;
    follow(page, Math.max(0, foot), reducedMotion);
  }, [lastComment, last?.text, last?.cueIndex, shown, reducedMotion, resting]);

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
          <span>서울대</span>
        </span>
        <span className={styles.navActions}>
          <EverytimeIcon name="notification" size={24} />
          <EverytimeIcon name="more" size={24} />
        </span>
      </header>

      <div ref={pageRef} className={styles.page}>
        <article ref={postRef} className={styles.post}>
          <div className={styles.author}>
            <Profile size="post" />
            <div>
              <strong>익명</strong>
              <time>방금</time>
            </div>
          </div>
          <h1 data-lyric className={styles.title} data-typing={(first?.current && lines.length === 1) || undefined}>
            {first ? first.text : RESTING.title}
          </h1>
          {first ? (
            body.length > 0 ? (
              <div className={styles.body}>
                {body.map((line) => (
                  <p data-lyric key={line.cueIndex} style={line.bold ? { fontWeight: 700 } : undefined}>
                    {line.text}
                  </p>
                ))}
              </div>
            ) : null
          ) : (
            <div className={styles.body}>
              {RESTING.body.map((text) => (
                <p data-lyric key={text}>{text}</p>
              ))}
            </div>
          )}
          <ul className={styles.counts}>
            <li data-kind="like">
              <EverytimeIcon name="like_filled" size={13} />
              0
            </li>
            <li data-kind="comment">
              <EverytimeIcon name="comment_filled" size={13} />
              {total}
            </li>
            <li data-kind="scrap">
              <EverytimeIcon name="scrap_filled" size={13} />
              0
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
          {visible.map((comment) => (
            <div key={comment.key} className={styles.commentRow}>
              <div className={styles.comment}>
                <div className={styles.commentHead}>
                  <Profile size="comment" />
                  <strong data-writer={comment.anonymous || undefined}>{comment.anonymous ? "익명(글쓴이)" : nickname}</strong>
                  <span className={styles.controls}>
                    <span>
                      <EverytimeIcon name="comment_filled" size={12} />
                    </span>
                    <span>
                      <EverytimeIcon name="like_filled" size={12} />
                    </span>
                    <span>
                      <EverytimeIcon name="more" size={12} />
                    </span>
                  </span>
                </div>
                <p data-lyric className={styles.commentText}>{comment.text}</p>
                <div className={styles.commentMeta}>
                  <time>방금</time>
                </div>
              </div>
            </div>
          ))}
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
