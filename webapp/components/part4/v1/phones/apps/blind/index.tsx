"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import styles from "./blind.module.css";

// Blind (블라인드, Korea, iOS, light), one post in the 썸·연애 topic — her
// own post, seen from her phone. She is an office worker pouring it out
// after hours under her company tag: the first sung line is the post's
// title, every line after it is the next line of the same post's body,
// growing as she types. It was posted 방금 and nobody has reacted: a handful
// of views, 좋아요 0, 댓글 0, no comments from anyone. The comment bar is
// real: what the participant writes lands under the post as her own comment
// (her tag with 작성자). Before the song the screen holds a post of hers from
// the same night. A line marked bold is set in bold.
//
// Sources: icons are 16 pt crops of Blind's served sprite
// (https://static.teamblind.com/img/www_kr/sp-kr-new.png?time=july202507,
// 1200 × 1800 @2x) at the positions the served teamblind.com/kr post page
// CSS uses (.wrap-info .date/.pv/.like/.cmt, head .mark/.more, h2 chevron,
// .h-links .btn-back, attach); metrics and colours from that CSS, fetched
// 2026-11-03 — head padding 25/20/19, h1 20/28 bold, name row 12/16,
// body 15 × 1.6, comment padding 20, cmt-txt 14 × 1.43, reply well #F8F8F8
// with 30 pt inset, company link #37ACC9, 작성자 #DA3238 10 pt, meta
// #94969B, rules #EEE, ink #222, input well #F2F2F3. The iOS nav bar and
// fixed comment bar follow the app and are not measured from a capture. No
// glyph is drawn here.

const ASSET = "/part4/v0/apps/blind";
const COMMENT_LIMIT = 300;
const KEEP = 28;

type Tag = { readonly company: string; readonly nick: string; readonly linked: boolean };

/** Writers per seat: the post's author. */
const WRITERS: readonly Tag[] = [
  { company: "삼성전자", nick: "a****", linked: true },
  { company: "카카오", nick: "뭉*****", linked: true },
  { company: "현대자동차", nick: "h*******", linked: true },
  { company: "네이버", nick: "s*****", linked: true },
  { company: "LG전자", nick: "j******", linked: true },
  { company: "새회사", nick: "I*********", linked: false },
];

/** Her post at rest, before the song. */
const RESTING = {
  title: "헤어진 지 반년인데 아직도 생각나는 거 정상임?",
  body: ["회사에선 멀쩡한데 퇴근하고 집 오면 그냥 생각남", "나만 이럼?"],
} as const;

type Comment = { key: string; text: string; date: string };

/** Blind's relative stamp: "방금", then minutes. */
function ago(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  return minutes < 1 ? "방금" : `${minutes}분`;
}

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element -- a 16 pt sprite crop, served as is
  return <img className={styles.icon} src={`${ASSET}/${name}.png`} alt="" width={size} height={size} draggable={false} />;
}

function Name({ tag, op }: { tag: Tag; op: boolean }) {
  return (
    <p className={styles.name}>
      <span className={tag.linked ? styles.point : styles.cp}>{tag.company}</span>
      <span className={styles.middot}>·</span>
      {tag.nick}
      {op ? <em className={styles.op}>작성자</em> : null}
    </p>
  );
}

function BlindState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);
  const contentsRef = useRef<HTMLDivElement>(null);
  const writer = WRITERS[seat % WRITERS.length]!;

  const resting = lines.length === 0;
  const first = lines[0];
  const last = lines.at(-1);
  const now = last?.startMs ?? 0;
  const body = lines.slice(1);

  // Only she is here: what the participant writes is the writer's own comment.
  const comments = useMemo(
    () =>
      replies.map((reply): Comment => {
        const after = lines.find((line) => line.cueIndex === reply.afterCue);
        return { key: `r${reply.id}`, text: reply.text, date: after ? ago(now - after.startMs) : "방금" };
      }),
    [lines, now, replies],
  );

  const total = comments.length;
  const visible = comments.slice(Math.max(0, total - KEEP));
  const lastComment = comments.at(-1)?.key;
  const views = 2 + (seat % 4) + Math.min(9, lines.length);
  const postDate = first ? ago(now - first.startMs) : "방금";

  // The line being typed stays in view; a comment she adds brings the page to its foot.
  useLayoutEffect(() => {
    const page = pageRef.current;
    const contents = contentsRef.current;
    if (!page || !contents || !shown || resting) return;
    const foot = lastComment ? page.scrollHeight - page.clientHeight : contents.offsetTop + contents.offsetHeight - page.clientHeight;
    follow(page, Math.max(0, foot), reducedMotion);
  }, [lastComment, last?.text, last?.cueIndex, shown, reducedMotion, resting]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, COMMENT_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const renderComment = (comment: Comment) => (
    <div key={comment.key} className={styles.comment}>
      <Name tag={writer} op />
      <p data-lyric className={styles.commentText}>{comment.text}</p>
      <div className={styles.info}>
        <span>
          <Icon name="date" />
          {comment.date}
        </span>
        <span>
          <Icon name="like" />
          좋아요
        </span>
        <span className={styles.fnc}>
          <Icon name="more" size={16} />
        </span>
      </div>
    </div>
  );

  return (
    <section className={styles.app} aria-label="블라인드 썸·연애" inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.navButton}>
          <Icon name="back" size={24} />
        </span>
        <span className={styles.navTitle}>썸·연애</span>
        <span className={styles.navButton} />
      </header>

      <div ref={pageRef} className={styles.page}>
        <div className={styles.head}>
          <h2 className={styles.topic}>
            채널
            <Icon name="chev" />
            썸·연애
            <span className={styles.topicDot} aria-hidden="true" />
            <span className={styles.follow}>팔로우</span>
          </h2>
          <h1 data-lyric className={styles.title}>{first ? first.text : RESTING.title}</h1>
          <Name tag={writer} op={false} />
          <div className={styles.info} data-head>
            <span>
              <Icon name="date" />
              {postDate}
            </span>
            <span>
              <Icon name="pv" />
              {views}
            </span>
            <span>
              <Icon name="cmt" />
              {total}
            </span>
            <span className={styles.fnc}>
              <Icon name="mark" />
              <Icon name="more" />
            </span>
          </div>
        </div>

        <div ref={contentsRef} className={styles.contents}>
          {first ? (
            body.length > 0 ? (
              <div className={styles.text}>
                {body.map((line) => (
                  <p data-lyric key={line.cueIndex} style={line.bold ? { fontWeight: 700 } : undefined}>
                    {line.text}
                  </p>
                ))}
              </div>
            ) : null
          ) : (
            <div className={styles.text}>
              {RESTING.body.map((text) => (
                <p data-lyric key={text}>{text}</p>
              ))}
            </div>
          )}
          <div className={styles.articleInfo}>
            <span>
              <Icon name="like" />
              0
            </span>
            <span>
              <Icon name="cmt" />
              {total}
            </span>
          </div>
        </div>

        <div className={styles.comments}>
          <div className={styles.commentsHead}>
            <h3>댓글 {total}</h3>
            <span>최신순</span>
          </div>
          {visible.map(renderComment)}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <span className={styles.attach}>
          <Icon name="write" size={24} />
        </span>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>댓글 입력</span>
          <input
            value={draft}
            maxLength={COMMENT_LIMIT}
            placeholder="댓글을 남겨주세요."
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="send"
            autoComplete="off"
          />
        </label>
        <button type="submit" className={styles.post} disabled={!draft.trim()}>
          등록
        </button>
      </form>
    </section>
  );
}

export default memo(BlindState);
