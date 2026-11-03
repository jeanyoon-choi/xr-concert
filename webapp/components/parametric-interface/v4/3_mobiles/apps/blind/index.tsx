"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import styles from "./blind.module.css";

// Blind (블라인드, Korea, iOS, light), one post in the 썸·연애 topic. The
// song is an office worker posting about their ex after hours: the first sung
// line is the post's title, the next two its body, and every later line is a
// comment from another company's employee — company · masked nickname, as
// Blind shows them. Every third line is a 대댓글 in the grey reply well under
// the comment above it, half of those from the writer (작성자). Views and
// 좋아요 accrue as the thread grows. The comment bar is real: the
// participant's comment goes in under their own company tag after the line
// it followed. Before the song the screen shows an ordinary 썸·연애 post.
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
// fixed comment bar follow the app and are not measured from a capture.

const ASSET = "/parametric-interface/v4/apps/blind";
const COMMENT_LIMIT = 300;
const KEEP = 28;
const POST_LINES = 3;

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

/** Who comments: other companies, in turn. */
const COMMENTERS: readonly Tag[] = [
  { company: "SK하이닉스", nick: "k*****", linked: true },
  { company: "쿠팡", nick: "퇴****", linked: true },
  { company: "토스", nick: "m******", linked: true },
  { company: "공무원", nick: "9**", linked: false },
  { company: "대한항공", nick: "b****", linked: true },
  { company: "신한은행", nick: "y*******", linked: true },
  { company: "배달의민족", nick: "치****", linked: true },
  { company: "약사", nick: "악*", linked: false },
  { company: "CJ제일제당", nick: "r*****", linked: true },
  { company: "KT", nick: "w****", linked: true },
  { company: "아모레퍼시픽", nick: "d******", linked: true },
  { company: "새회사", nick: "1*******", linked: false },
];

/** The participant's own tag, per seat. */
const ME: readonly Tag[] = [
  { company: "LG유플러스", nick: "n*****", linked: true },
  { company: "롯데쇼핑", nick: "p****", linked: true },
  { company: "한국전력공사", nick: "e******", linked: true },
  { company: "넥슨", nick: "q*****", linked: true },
];

const RESTING = {
  title: "헤어진 지 반년인데 아직도 생각나는 거 정상임?",
  body: ["회사에선 멀쩡한데 퇴근하고 집 오면 그냥 생각남", "다들 얼마나 걸렸음?"],
  date: "1시간",
  views: 1284,
  likes: 9,
  comments: [
    { tag: 0, text: "1년은 걸리더라", date: "52분", likes: 14, reply: false, op: false },
    { tag: -1, text: "1년이요..?", date: "50분", likes: 0, reply: true, op: true },
    { tag: 1, text: "운동 시작해 진짜 그게 답임", date: "41분", likes: 8, reply: false, op: false },
    { tag: 2, text: "정상임. 생각나는 거랑 다시 만나는 건 다른 문제", date: "23분", likes: 21, reply: false, op: false },
  ],
} as const;

type Comment = {
  key: string;
  at: number;
  tag: Tag;
  op: boolean;
  text: string;
  date: string;
  likes: number;
  reply: boolean;
};

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
  const writer = WRITERS[seat % WRITERS.length]!;
  const me = ME[seat % ME.length]!;

  const resting = lines.length === 0;
  const base = lines[0]?.cueIndex ?? 0;
  const last = lines.at(-1);
  const now = last?.startMs ?? 0;
  const postLines = lines.filter((line) => line.cueIndex < base + POST_LINES);
  const title = resting ? RESTING.title : postLines[0]!.text;
  const body = resting ? RESTING.body : postLines.slice(1).map((line) => line.text);

  const comments = useMemo(() => {
    const list: Comment[] = [];
    if (resting) {
      RESTING.comments.forEach((comment, index) =>
        list.push({
          key: `rest${index}`,
          at: -10 + index,
          tag: comment.tag < 0 ? writer : COMMENTERS[(seat + comment.tag) % COMMENTERS.length]!,
          op: comment.op,
          text: comment.text,
          date: comment.date,
          likes: comment.likes,
          reply: comment.reply,
        }),
      );
    }
    const lastCue = last?.cueIndex ?? -1;
    for (const line of lines) {
      const ordinal = line.cueIndex - base - POST_LINES;
      if (ordinal < 0) continue;
      const reply = ordinal % 3 === 2;
      const op = reply && ordinal % 6 === 2;
      const age = lastCue - line.cueIndex;
      list.push({
        key: `l${line.cueIndex}`,
        at: line.cueIndex,
        tag: op ? writer : COMMENTERS[(seat * 5 + ordinal) % COMMENTERS.length]!,
        op,
        text: line.text,
        date: ago(now - line.startMs),
        likes: age < 1 ? 0 : Math.min(age, 1 + ((line.cueIndex * 5) % 7)),
        reply,
      });
    }
    replies.forEach((reply) => {
      const after = lines.find((line) => line.cueIndex === reply.afterCue);
      list.push({
        key: `r${reply.id}`,
        at: reply.afterCue + 0.5,
        tag: me,
        op: false,
        text: reply.text,
        date: after ? ago(now - after.startMs) : "방금",
        likes: 0,
        reply: false,
      });
    });
    list.sort((x, y) => x.at - y.at);
    if (list[0]?.reply) list[0] = { ...list[0], reply: false };
    return list;
  }, [base, last, lines, me, now, replies, resting, seat, writer]);

  const total = comments.length;
  const visible = comments.slice(Math.max(0, total - KEEP));
  // Each top-level comment counts the 대댓글 under it.
  const replyCounts = new Map<string, number>();
  let parentKey = "";
  for (const comment of comments) {
    if (comment.reply) replyCounts.set(parentKey, (replyCounts.get(parentKey) ?? 0) + 1);
    else parentKey = comment.key;
  }
  // Group the visible comments: each parent with the replies in its well.
  const groups: { parent: Comment | null; replies: Comment[] }[] = [];
  for (const comment of visible) {
    if (!comment.reply || groups.length === 0) groups.push({ parent: comment.reply ? null : comment, replies: comment.reply ? [comment] : [] });
    else groups.at(-1)!.replies.push(comment);
  }

  const views = resting ? RESTING.views : 37 + total * 41 + lines.length * 13;
  const likes = resting ? RESTING.likes : Math.floor(total / 2);
  const postDate = resting ? RESTING.date : ago(now - lines[0]!.startMs);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !shown || resting) return;
    follow(page, page.scrollHeight - page.clientHeight, reducedMotion);
  }, [comments, title, shown, reducedMotion, resting]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, COMMENT_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const renderComment = (comment: Comment) => (
    <div key={comment.key} className={styles.comment}>
      <Name tag={comment.tag} op={comment.op} />
      <p className={styles.commentText}>{comment.text}</p>
      <div className={styles.info}>
        <span>
          <Icon name="date" />
          {comment.date}
        </span>
        <span>
          <Icon name="like" />
          {comment.likes > 0 ? comment.likes : "좋아요"}
        </span>
        {!comment.reply && (replyCounts.get(comment.key) ?? 0) > 0 ? (
          <span>
            <Icon name="cmt" />
            {replyCounts.get(comment.key)}
          </span>
        ) : null}
        {comment.reply ? null : (
          <span className={styles.fnc}>
            <Icon name="more" size={16} />
          </span>
        )}
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
          <h1 className={styles.title}>{title}</h1>
          <Name tag={writer} op={false} />
          <div className={styles.info} data-head>
            <span>
              <Icon name="date" />
              {postDate}
            </span>
            <span>
              <Icon name="pv" />
              {views.toLocaleString("ko-KR")}
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

        <div className={styles.contents}>
          {body.length > 0 ? (
            <p className={styles.text}>
              {body.map((text, index) => (
                <span key={index}>
                  {text}
                  {index < body.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          ) : null}
          <div className={styles.articleInfo}>
            <span>
              <Icon name="like" />
              {likes}
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
          {groups.map((group, index) => (
            <div key={group.parent?.key ?? `g${index}`}>
              {group.parent ? renderComment(group.parent) : null}
              {group.replies.length > 0 ? <div className={styles.replies}>{group.replies.map(renderComment)}</div> : null}
            </div>
          ))}
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
