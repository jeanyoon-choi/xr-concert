"use client";

import { memo, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { dateLabel } from "../../clock-face";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import { SafariBar } from "../safari/chrome";
import styles from "./naver.module.css";

// 네이버 지식iN (m.kin.naver.com) in iOS 18 Safari: one question page. She
// asks strangers about the ex. The song's first line, once sung, is the
// question's title (Q); the lines after it are the question body; the line
// being sung is an answer someone else is typing under “답변 n개”. Before the
// song the page holds an ordinary question with its answers. The answer
// field (“답변을 입력해주세요”) is real: what the participant writes is posted
// as their own answer.
//
// Sources: m.kin.naver.com question page as served to iOS Safari (Nov 2026,
// fe-kin.pstatic.net 2026.11.2): its CSS modules (Header theme1 #2f54b5 with
// 20 pt gnb padding and 17/42 nav tabs, QnaEnd question 20/24 pt padding,
// EndTitle 24/32 bold, UserInfo 14/21, question body 16/26 #333, answer
// header 18/24, ProfileInfo 48 pt avatar, Badges #ebf1ff, AnswerSuggest
// #f6f8fa pill, #f1f3f5 page) and its inline SVGs (NAVER mark, 지식iN and
// eXpert wordmarks, question pen, comment, alert, share, more, up/down,
// dropdown arrow). Avatars are kin's own default avatar PNGs
// (ssl.pstatic.net/static/kin/09renewal/avatar). The served header is
// kin's current blue theme, not NAVER green; the green is only in the logo.

const ASSETS = "/parametric-interface/v4/apps/naver";
const SEND_LIMIT = 300;
/** Kin's "2026.11.03." for today, and for the day before. */
const kinDate = (offsetDays: number) => dateLabel("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }, offsetDays).replace(/\s/g, "");
const DATE = kinDate(0);
const YESTERDAY = kinDate(-1);

/** Who answers on this seat's page, by kin nickname. */
const ANSWERERS = ["새벽세시반", "고민해결사", "구름빵", "연애상담소", "달빛토끼", "익명의답변러"] as const;

/** The question the page holds before the song: ordinary 연애 상담. */
const REST = {
  title: "헤어진 전 애인이 차단을 풀고 다시 연락하는데 어떻게 해야 할까요?",
  body: "6개월 전에 헤어졌는데 어제 갑자기 인스타 차단을 풀고 '잘 지내?'라고 연락이 왔어요. 사귈 때 질투가 심하고 제 친구들도 싫어해서 많이 힘들었는데, 막상 연락이 오니까 마음이 흔들립니다. 답장해도 될까요?",
  answers: [
    {
      name: "비공개 사용자 답변",
      avatar: "answer-blue.png",
      badge: "물신",
      text: "흔들리는 마음은 자연스러운 거예요. 그런데 헤어진 이유가 질투와 집착이었다면 그 부분은 6개월 만에 잘 바뀌지 않아요. 답장을 하더라도 짧게, 천천히 하세요.",
    },
  ],
} as const;

function Glyph({ name }: { name: "naver" | "kin" | "expert" | "pen" | "comment" | "alert" | "share" | "more" | "up" | "down" | "arrow" }) {
  switch (name) {
    case "naver":
      return <svg aria-hidden="true" width="26" height="26" fill="none" viewBox="0 0 26 26"><path fill="#fff" fillRule="evenodd" d="M26 26H0V0h26zM10.874 12.789 15.068 19H19.5V7H15.13v6.211L10.935 7H6.5v12h4.374z" clipRule="evenodd" /></svg>;
    case "kin":
      return <svg aria-hidden="true" width="61" height="22" viewBox="0 0 64 24"><path fill="#fff" d="M7.16 11.464h-.024c-.216.528-.648 1.056-1.416 1.896a62 62 0 0 1-3.792 3.792l-1.56-1.608a49 49 0 0 0 3.696-3.672c1.584-1.752 1.848-2.664 1.848-4.44V4.288H1.16V2.224h11.784v2.064H8.312v3.144c0 1.896.264 2.616 1.968 4.464 1.032 1.128 2.04 2.064 3.456 3.312l-1.56 1.608c-1.632-1.488-2.64-2.496-3.552-3.48-.672-.72-1.272-1.392-1.464-1.872M18.32 22.36h-2.376V.232h2.376zm19.2-9.264V.232h2.352v12.864zm-12.216 3.192v-2.04h14.568v8.328h-2.376v-6.288zm3.24-8.496h-.024c-.12.408-.864 1.248-1.608 1.92-.984.912-2.448 2.136-3.72 3.144l-1.416-1.68c1.536-1.176 3.072-2.472 3.912-3.312 1.224-1.224 1.56-2.136 1.56-3.816V1.144h2.4v2.808c0 1.488.096 2.28 1.248 3.336 1.128 1.032 2.544 2.16 3.96 3.192l-1.392 1.656c-1.248-.936-2.4-1.896-3.552-2.856-.72-.6-1.224-1.128-1.368-1.488m16.08-1.296h2.328v13.128h-2.328zm-.072-4.704h2.472v2.544h-2.472zm6.312.528H53.6l6.72 11.664a19 19 0 0 1 1.224 2.52V2.32h2.208v17.304h-2.736l-6.72-11.616a21 21 0 0 1-1.224-2.544v14.16h-2.208z" /></svg>;
    case "expert":
      return <svg aria-hidden="true" width="74" height="23" viewBox="0 0 74 23"><path fill="#fff" d="m19.599 9.144-5.939 7.742a.31.31 0 0 0-.022.312c.05.1.151.167.265.173h1.842c.16 0 .31-.073.406-.199l3.464-4.5 3.464 4.5a.52.52 0 0 0 .406.2h1.836a.32.32 0 0 0 .266-.172.31.31 0 0 0-.02-.314z" /><path fill="#fff" d="M29.77 22.866h-1.606a.313.313 0 0 1-.315-.31V4.746c0-.172.141-.31.315-.31h1.606c.174 0 .315.138.315.31v1.352q.16-.161.438-.416.438-.397.944-.703a5.7 5.7 0 0 1 1.282-.556 5.6 5.6 0 0 1 1.64-.246 5.92 5.92 0 0 1 4.409 1.986 6.68 6.68 0 0 1 1.89 4.746 6.66 6.66 0 0 1-1.89 4.737 5.9 5.9 0 0 1-4.408 1.98 5.9 5.9 0 0 1-2.945-.808 7 7 0 0 1-.9-.656 6 6 0 0 1-.457-.42v6.838a.31.31 0 0 1-.318.286m4.629-16.612c-1.09 0-2.094.466-2.982 1.392a4.64 4.64 0 0 0 0 6.527c.888.932 1.89 1.396 2.982 1.396 1.036 0 1.984-.457 2.809-1.356a4.7 4.7 0 0 0 1.26-3.3 4.7 4.7 0 0 0-1.26-3.304c-.825-.902-1.77-1.355-2.809-1.355m-21.778 5.495H2.544c.11.808.756 3.816 4.302 3.816a5.04 5.04 0 0 0 3.889-1.911.32.32 0 0 1 .453-.025l1.02 1.004c.106.11.115.28.022.4a6.96 6.96 0 0 1-5.384 2.593 6.27 6.27 0 0 1-4.6-1.964 6.57 6.57 0 0 1-1.932-4.759 6.6 6.6 0 0 1 1.909-4.758 6.1 6.1 0 0 1 4.503-1.968 6.04 6.04 0 0 1 4.481 1.837 6.4 6.4 0 0 1 1.704 5.486.316.316 0 0 1-.29.249M2.563 9.812h8.187a4.28 4.28 0 0 0-1.306-2.486 3.86 3.86 0 0 0-2.73-1.063 3.96 3.96 0 0 0-2.787 1.116 4.4 4.4 0 0 0-1.364 2.433M64 4.466V6.08a.313.313 0 0 1-.315.311h-.674a3.74 3.74 0 0 0-2.68 1.07 3.72 3.72 0 0 0-1.111 2.797v6.813c0 .171-.141.31-.315.31h-1.593a.313.313 0 0 1-.315-.31V4.746c0-.172.14-.31.315-.31h1.606c.174 0 .314.138.314.31v1.082c1.556-1.623 3.716-1.694 4.488-1.663a.31.31 0 0 1 .28.301m7.721 13.16a3.6 3.6 0 0 1-2.698-1.007c-.65-.668-.98-1.62-.98-2.828V6.508h-2.088a.31.31 0 0 1-.314-.31V4.737c0-.172.14-.311.314-.311h2.088V1.318c0-.172.141-.311.315-.311h1.61c.173 0 .314.14.314.31v3.109h2.46c.173 0 .314.14.314.31v1.48c0 .172-.14.311-.315.311h-2.478v7.264c0 1.209.488 1.774 1.537 1.774a4.1 4.1 0 0 0 1.571-.335.25.25 0 0 1 .229.02.24.24 0 0 1 .108.2v1.474a.4.4 0 0 1-.242.366 4.4 4.4 0 0 1-1.745.336M54.536 11.75H44.46c.107.808.756 3.816 4.301 3.816a5.06 5.06 0 0 0 3.89-1.911.315.315 0 0 1 .453-.025l1.017 1.004c.106.11.117.28.025.4a6.96 6.96 0 0 1-5.385 2.593 6.28 6.28 0 0 1-4.613-1.964 6.58 6.58 0 0 1-1.927-4.759 6.6 6.6 0 0 1 1.908-4.758 6.23 6.23 0 0 1 4.464-1.967 6.24 6.24 0 0 1 4.52 1.836 6.4 6.4 0 0 1 1.726 5.486.315.315 0 0 1-.303.249M44.48 9.812h8.187a4.27 4.27 0 0 0-1.307-2.486 3.85 3.85 0 0 0-2.727-1.063 3.96 3.96 0 0 0-2.787 1.116 4.4 4.4 0 0 0-1.366 2.433M19.6 9.144 26.451.2a.52.52 0 0 1 .416-.199h1.836a.31.31 0 0 1 .246.485l-9.35 12.187L13.66 4.93a.31.31 0 0 1-.022-.312c.05-.1.151-.166.265-.172h1.842c.16.005.31.086.4.217z" /></svg>;
    case "pen":
      return <svg aria-hidden="true" width="28" height="28" fill="none" viewBox="0 0 28 28"><path stroke="#fff" strokeLinejoin="round" strokeWidth="1.8" d="M21.233 10.077a3.03 3.03 0 0 0 .747-1.99C21.98 6.383 20.563 5 18.815 5c-.778 0-1.489.274-2.04.729L4 18.124v4.366h4.477z" /><path stroke="#fff" strokeLinecap="round" strokeWidth="1.8" d="M15.691 22.5H24" /><path stroke="#fff" strokeWidth="1.8" d="m15.016 7.625 4.06 3.957" /></svg>;
    case "comment":
      return <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#D2D8E5" d="M11.637 2H7.456A6.46 6.46 0 0 0 1 8.461a6.46 6.46 0 0 0 6.461 6.461h1.43c.062 0 .109.052.104.114l-.28 2.326a.571.571 0 0 0 .901.529l5.472-3.974c1.964-1.456 3.01-3.156 3.01-5.456A6.46 6.46 0 0 0 11.638 2" /></svg>;
    case "alert":
      return <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#D2D8E5" d="M18.069 15.346a.422.422 0 0 1-.353.654h-4.252a3.5 3.5 0 0 1-6.929 0H2.283a.422.422 0 0 1-.353-.654l.654-.992a4 4 0 0 0 .66-2.2V8.059C3.243 4.183 6.143 1 9.97 1c3.831 0 6.786 3.183 6.786 7.059v4.095a4 4 0 0 0 .66 2.2z" /></svg>;
    case "share":
      return <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#D2D8E5" fillRule="evenodd" d="m18.13 10.016-6.221-5.938a.668.668 0 0 0-1.13.483v3.116H9.18C4.37 7.677 1.42 11.941 1 16.67c0 0 1.92-4.315 8.02-4.315h1.759v3.116c0 .588.704.89 1.13.483z" clipRule="evenodd" /></svg>;
    case "more":
      return <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#C8D1DA" fillRule="evenodd" d="M15.5 4.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0m0 5.25a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0m-1.25 6.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5" clipRule="evenodd" /></svg>;
    case "up":
      return <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#D2D8E5" d="M14.529 18.31H5.646V9.215l2.002-7.607c.108-.408.493-.68.906-.59 1.053.228 2.891.883 2.891 2.678V6.22c0 .222.18.401.401.401h4.065a2.3 2.3 0 0 1 2.273 2.65c-.402 2.612-.717 4.64-1.066 6.832a2.62 2.62 0 0 1-2.59 2.207M3.313 9.74h1.02v8.575h-1.02A1.313 1.313 0 0 1 2 17.003v-5.95c0-.725.588-1.313 1.313-1.313" /></svg>;
    case "down":
      return <svg aria-hidden="true" width="20" height="20" fill="none" viewBox="0 0 20 20"><path fill="#D2D8E5" d="M3.313 10.075h1.02V1.5h-1.02C2.588 1.5 2 2.088 2 2.813v5.949c0 .725.588 1.313 1.313 1.313M14.529 1.505H5.646V10.6l2.002 7.607c.108.408.493.68.906.59 1.053-.227 2.891-.883 2.891-2.678v-2.524c0-.222.18-.402.401-.402h4.065a2.3 2.3 0 0 0 2.273-2.65c-.402-2.612-.717-4.639-1.066-6.831a2.62 2.62 0 0 0-2.59-2.207" /></svg>;
    case "arrow":
      return <svg aria-hidden="true" width="10" height="7" fill="none" viewBox="0 0 10 7"><path fill="#666" d="M.605 1.054a.82.82 0 0 1 1.14 0L5 4.208l3.254-3.154a.82.82 0 0 1 1.141 1.175L5.697 5.823a1 1 0 0 1-1.394 0L.605 2.229a.82.82 0 0 1 0-1.175" /></svg>;
  }
}

type Answer = { key: string; name: string; avatar: string; badge?: string; text: string; date: string; up?: number };

function AnswerItem({ answer }: { answer: Answer }) {
  return (
    <article className={styles.answer}>
      <div className={styles.profile}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.avatar} src={`${ASSETS}/${answer.avatar}`} alt="" width={48} height={48} />
        <div className={styles.info}>
          <div className={styles.infoTop}>
            <span className={styles.name}>{answer.name}</span>
            {answer.badge ? <span className={styles.badge}>{answer.badge}</span> : null}
          </div>
          <div className={styles.infoBottom}>{answer.date}</div>
        </div>
        <span className={styles.more}><Glyph name="more" /></span>
      </div>
      <p className={styles.answerText}>
        {answer.text}
      </p>
      <div className={styles.buttons} aria-hidden="true">
        <span className={styles.endButton}>
          <Glyph name="up" />
          <span className={styles.count}>{answer.up ? answer.up : ""}</span>
        </span>
        <span className={styles.endButton}><Glyph name="down" /></span>
        <span className={styles.endButton}><Glyph name="comment" /></span>
      </div>
    </article>
  );
}

function NaverState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);

  const [first, ...after] = lines;
  const live = after.at(-1);
  const body = after.slice(0, -1);
  const answerer = ANSWERERS[seat % ANSWERERS.length]!;

  const mine: Answer[] = replies
    .slice(-4)
    .reverse()
    .map((reply) => ({ key: `r${reply.id}`, name: "pin****", avatar: "profile-placeholder.png", text: reply.text, date: DATE }));
  const answers: Answer[] = first
    ? [
        ...(live
          ? [{ key: `l${live.cueIndex}`, name: answerer, avatar: "avatar-3d.png", badge: "별신", text: live.text, date: DATE }]
          : []),
        ...mine,
      ]
    : [
        ...mine,
        ...REST.answers.map((answer, index) => ({ ...answer, key: `rest${index}`, date: YESTERDAY, up: 4 })),
      ];

  // The page keeps the answer being written in view, as the reader scrolls to follow it.
  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page || !shown || lines.length === 0) return;
    follow(page, page.scrollHeight - page.clientHeight, reducedMotion);
  }, [lines, replies, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label="네이버 지식iN" inert={!shown}>
      <div ref={pageRef} className={styles.page}>
        <header className={styles.header}>
          <div className={styles.gnb}>
            <div className={styles.logos}>
              <span className={styles.logoNaver}><Glyph name="naver" /></span>
              <span className={styles.logoKin}><Glyph name="kin" /></span>
              <span className={styles.logoExpert}><Glyph name="expert" /></span>
            </div>
            <div className={styles.gnbButtons}>
              <span className={styles.gnbButton}><Glyph name="pen" /></span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.gnbThumb} src={`${ASSETS}/profile-placeholder.png`} alt="" width={28} height={28} />
            </div>
          </div>
          <nav className={styles.nav} aria-hidden="true">
            {["홈", "Q&A", "CHOiCE", "답변하기", "지식기부", "사람들", "명예의전당"].map((tab) => (
              <span key={tab} className={styles.navItem}>
                <span className={styles.navLink} data-current={tab === "Q&A" || undefined}>
                  {tab}
                  {tab === "CHOiCE" ? <span className={styles.dot} /> : null}
                </span>
              </span>
            ))}
          </nav>
        </header>

        <div className={styles.question}>
          <span className={styles.tag}>Q&amp;A</span>
          <h2 className={styles.title}>
            {first ? first.text : REST.title}
          </h2>
          <div className={styles.userInfo}>
            <span className={styles.head}>비공개</span>
            <span className={styles.item}>조회수 {first ? 3 + lines.length * 2 : 41}</span>
            <span className={styles.item}>{first ? DATE : YESTERDAY}</span>
          </div>
          {first ? (
            body.length > 0 ? (
              <div className={styles.detail}>
                {body.map((line) => (
                  <p key={line.cueIndex}>{line.text}</p>
                ))}
              </div>
            ) : null
          ) : (
            <div className={styles.detail}>
              <p>{REST.body}</p>
            </div>
          )}
          <div className={styles.tags}>
            <span>#연애상담</span>
            <span>#전남친</span>
            <span>#재회</span>
          </div>
          <div className={styles.questionButtons} aria-hidden="true">
            <span className={styles.endButton}><Glyph name="comment" /></span>
            <span className={styles.endButton}><Glyph name="alert" /></span>
            <span className={styles.endButton}><Glyph name="share" /></span>
          </div>
        </div>

        <div className={styles.answers}>
          <div className={styles.answersHeader}>
            <div className={styles.titleArea}>
              <span className={styles.answersTitle}>답변 {answers.length}개</span>
              <span className={styles.sort}>
                추천순
                <span className={styles.sortArrow}><Glyph name="arrow" /></span>
              </span>
            </div>
            <form className={styles.suggest} onSubmit={send}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={styles.suggestAvatar} src={`${ASSETS}/profile-placeholder.png`} alt="" width={30} height={30} />
              <label className={styles.suggestField}>
                <span className={styles.visuallyHidden}>답변</span>
                <input value={draft} placeholder="답변을 입력해주세요" enterKeyHint="send" onChange={(event) => setDraft(event.target.value)} />
              </label>
            </form>
          </div>
          {answers.map((answer) => (
            <AnswerItem key={answer.key} answer={answer} />
          ))}
        </div>
      </div>
      {/* Safari tints the status-bar strip with the page's own header colour. */}
      <div className={styles.statusStrip} aria-hidden="true" />
      <SafariBar domain="m.kin.naver.com" />
    </section>
  );
}

export default memo(NaverState);
