"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { clockAgo, dateLabel, formatSongClock } from "../../clock-face";
import type { PhoneStateProps } from "../types";
import { follow } from "../follow";
import { KarrotIcon } from "./icons";
import styles from "./karrot.module.css";

// Karrot (당근, iOS, light), one 채팅 about a listing: "회색 후드티 (거의
// 새거)", pinned at the top with its price and 거래 상태. The participant is
// the buyer; the seller turns out to be the ex, selling the hoodie that was
// once the participant's ("이거 원래 너 거잖아"). Each sung line is the
// seller's next message, typing in character by character. Karrot's own
// system rows interrupt the exchange once each: after the second line the
// seller sends a 약속 (time and place), and after the sixth a 거래 후기 —
// at which point the listing flips from 예약중 to 거래완료. The composer is
// real: the participant's message lands after the line it followed.
//
// Sources: every glyph from Daangn's published SEED icon set (see icons.tsx);
// colours from SEED's served tokens, @seed-design/css base.css (unpkg,
// fetched 2026-11-03) — brand carrot-600 #FF6600, ink gray-1000 #1A1C20,
// muted gray-800 #555D6D, subtle gray-700 #868B94, placeholder gray-600
// #B0B3BA, strokes gray-400 #DCDEE3, weak fill gray-200 #F3F4F5, positive
// green-700 #079171, 매너온도 level tokens (l5 bg #FFF1E5 / text #FF7300).
// The chat layout (nav, pinned product bar with action chips, bubble radii,
// composer) follows the iOS app and is not measured from a capture. The
// default profile is SEED's person glyph on grey; the listing thumbnail is a
// flat grey swatch standing in for the seller's photo.

const SEND_LIMIT = 200;
const KEEP = 40;

const SELLERS = ["망원동주민", "초코송이", "도토리묵", "합정고양이", "가을바람", "레몬사탕"] as const;

/** "21:31" → "오후 9:31". */
function koreanStamp(clock: string) {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${hour}:${String(m).padStart(2, "0")}`;
}

/** Today, "2026년 11월 3일"; the meet-up the day after tomorrow, "11월 5일 (목)". */
const TODAY = dateLabel("ko-KR", { year: "numeric", month: "long", day: "numeric" });
const MEET = `${dateLabel("ko-KR", { month: "long", day: "numeric" }, 2)} (${dateLabel("ko-KR", { weekday: "short" }, 2)})`;

type Entry =
  | { kind: "in"; key: string; at: number; text: string; time: string; typing: boolean }
  | { kind: "out"; key: string; at: number; text: string; time: string; typing: boolean }
  | { kind: "promise"; key: string; at: number; time: string }
  | { kind: "review"; key: string; at: number; time: string };

/** The chat at rest: the buyer asked, and the seller recognised them. */
const RESTING: readonly Entry[] = [
  { kind: "out", key: "rest0", at: -10, text: "안녕하세요! 후드티 아직 판매하시나요?", time: koreanStamp(clockAgo(28)), typing: false },
  { kind: "in", key: "rest1", at: -9, text: "네 아직 있어요", time: koreanStamp(clockAgo(26)), typing: false },
  { kind: "out", key: "rest2", at: -8, text: "혹시 망원역에서 거래 가능할까요?", time: koreanStamp(clockAgo(25)), typing: false },
  { kind: "in", key: "rest3", at: -7, text: "네 근데", time: koreanStamp(clockAgo(18)), typing: false },
  { kind: "in", key: "rest4", at: -6, text: "이거 원래 너 거잖아", time: koreanStamp(clockAgo(18)), typing: false },
];

function Profile() {
  return (
    <span className={styles.profile} aria-hidden="true">
      <KarrotIcon name="personFill" size={22} />
    </span>
  );
}

function KarrotState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const seller = SELLERS[seat % SELLERS.length]!;

  const entries = useMemo(() => {
    const base = lines[0]?.cueIndex ?? 0;
    const lastCue = lines.at(-1)?.cueIndex ?? -1;
    const list: Entry[] = [...RESTING];
    for (const line of lines) {
      list.push({
        kind: "in",
        key: `l${line.cueIndex}`,
        at: line.cueIndex,
        text: line.text,
        time: koreanStamp(formatSongClock(line.startMs)),
        typing: line.current,
      });
    }
    // Karrot's own rows, once each, after the 2nd and 6th sung lines.
    const promise = lines.find((line) => line.cueIndex === base + 1);
    if (promise && lastCue >= base + 2) {
      list.push({ kind: "promise", key: "promise", at: base + 1.6, time: koreanStamp(formatSongClock(promise.startMs)) });
    }
    const review = lines.find((line) => line.cueIndex === base + 5);
    if (review && lastCue >= base + 6) {
      list.push({ kind: "review", key: "review", at: base + 5.6, time: koreanStamp(formatSongClock(review.startMs)) });
    }
    for (const reply of replies) {
      const after = lines.find((line) => line.cueIndex === reply.afterCue);
      list.push({
        kind: "out",
        key: `r${reply.id}`,
        at: reply.afterCue + 0.5,
        text: reply.text,
        time: after ? koreanStamp(formatSongClock(after.startMs)) : koreanStamp(clockAgo(17)),
        typing: false,
      });
    }
    list.sort((x, y) => x.at - y.at);
    return list.slice(Math.max(0, list.length - KEEP));
  }, [lines, replies]);

  const done = entries.some((entry) => entry.kind === "review");

  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    follow(thread, thread.scrollHeight - thread.clientHeight, reducedMotion);
  }, [entries, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  const lastOut = entries.findLast((entry) => entry.kind === "out")?.key;

  return (
    <section className={styles.app} aria-label={`당근 채팅 ${seller}`} inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.navButton}>
          <KarrotIcon name="chevronLeftLine" size={24} />
        </span>
        <span className={styles.navTitle}>
          <strong>{seller}</strong>
          <span className={styles.temp}>38.2°C</span>
        </span>
        <span className={styles.navButton}>
          <KarrotIcon name="dot3VerticalLine" size={24} />
        </span>
      </header>

      <div className={styles.product}>
        <div className={styles.productRow}>
          <span className={styles.thumb} aria-hidden="true" />
          <div className={styles.productText}>
            <p className={styles.productTitle}>
              <span className={styles.status} data-done={done || undefined}>
                {done ? "거래완료" : "예약중"}
              </span>
              회색 후드티 (거의 새거)
            </p>
            <p className={styles.price}>15,000원</p>
          </div>
        </div>
        <div className={styles.chips}>
          <span>
            <KarrotIcon name="calendarLine" size={16} />
            약속잡기
          </span>
          <span>
            <KarrotIcon name="wonCircleLine" size={16} />
            송금하기
          </span>
          <span>
            <KarrotIcon name="pencilLine" size={16} />
            후기 보내기
          </span>
        </div>
      </div>

      <div ref={threadRef} className={styles.thread}>
        <div className={styles.rows}>
          <p className={styles.date}>{TODAY}</p>
          {entries.map((entry, index) => {
            const previous = entries[index - 1];
            const next = entries[index + 1];
            if (entry.kind === "promise") {
              return (
                <div key={entry.key} className={styles.incoming} data-head>
                  <Profile />
                  <div className={styles.card}>
                    <p className={styles.cardTitle}>
                      <KarrotIcon name="calendarLine" size={18} />
                      약속을 만들었어요
                    </p>
                    <p className={styles.cardBody}>
                      {MEET} 오후 7:00
                      <br />
                      망원역 2번 출구
                    </p>
                    <span className={styles.cardButton}>약속 보기</span>
                  </div>
                  <time className={styles.time}>{entry.time}</time>
                </div>
              );
            }
            if (entry.kind === "review") {
              return (
                <div key={entry.key} className={styles.system}>
                  <p>
                    {seller}님이 거래 후기를 보냈어요.
                  </p>
                  <div className={styles.card} data-center>
                    <p className={styles.cardTitle}>
                      <KarrotIcon name="checkmarkCircleFill" size={18} />
                      거래가 완료되었어요
                    </p>
                    <span className={styles.cardButton}>받은 후기 보기</span>
                  </div>
                </div>
              );
            }
            const head = previous?.kind !== entry.kind;
            const tail = next?.kind !== entry.kind || next.time !== entry.time;
            if (entry.kind === "out") {
              return (
                <div key={entry.key} className={styles.outgoing} data-head={head || undefined}>
                  {tail ? (
                    <span className={styles.meta}>
                      {entry.key === lastOut ? <span>읽음</span> : null}
                      <time className={styles.time}>{entry.time}</time>
                    </span>
                  ) : null}
                  <p className={styles.bubble} data-side="out">
                    {entry.text}
                  </p>
                </div>
              );
            }
            return (
              <div key={entry.key} className={styles.incoming} data-head={head || undefined}>
                {head ? <Profile /> : <span className={styles.profileGap} />}
                <p className={styles.bubble} data-side="in" data-typing={entry.typing || undefined}>
                  {entry.text}
                </p>
                {tail ? <time className={styles.time}>{entry.time}</time> : null}
              </div>
            );
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.plus} aria-label="더보기" tabIndex={-1}>
          <KarrotIcon name="plusLine" size={24} />
        </button>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>메시지 입력</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            placeholder="메시지 보내기"
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="send"
            autoComplete="off"
          />
          <span className={styles.emoji} aria-hidden="true">
            <KarrotIcon name="faceSmileCircleLine" size={24} />
          </span>
        </label>
        <button type="submit" className={styles.send} aria-label="전송" disabled={!draft.trim()}>
          <KarrotIcon name="paperplaneFill" size={24} />
        </button>
      </form>
    </section>
  );
}

export default memo(KarrotState);
