"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import { follow } from "../follow";
import type { PhoneStateProps } from "../types";
import styles from "./toss.module.css";

// 토스 (iOS, light), 토스뱅크 통장 → 거래내역. The ex is blocked everywhere
// else, so they do what people actually do: send 1원 with the 받는 분에게
// 표시 text set to what they want to say. Each sung line arrives as a +1원
// 입금 whose display text is the line; the newest row types it. Toss lists
// newest first. The participant can 보내기 back: a confirm sheet with the
// 받는 분에게 표시 field; it goes out as a -1원 row through `act`.
//
// Sources: Toss Design System (TDS) grey/blue scale — blue500 #3182F6,
// grey900 #191F28, grey800 #333D4B, grey700 #4E5968, grey600 #6B7684,
// grey500 #8B95A1, grey100 #F2F4F6 — and current Toss iOS 통장 detail frames
// (account name + underlined number, 28 pt balance, 채우기 / 보내기 pair,
// date column, title over time, amount over 잔액). Toss Product Sans is not
// redistributable; the frame's SF / Apple SD Gothic Neo stands in. Glyphs
// (back chevron, search, caret) are drawn to those frames.

const EX_NAMES = ["정다니엘", "이재현", "한민서", "박태오", "최아리", "윤상민"] as const;
const BASE_BALANCE = 1_284_310;
const LINE_LIMIT = 12;
const MEMO_LIMIT = 20;

type Row = {
  readonly key: string;
  readonly at: number;
  readonly title: string;
  readonly sub: string;
  readonly amount: number;
  readonly balance: number;
  readonly typing?: boolean;
};

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const signed = (value: number) => `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString("ko-KR")}원`;

/** Ordinary days before the song, newest first, ending at BASE_BALANCE. */
const PRIOR: readonly { day: string; date: string; rows: readonly Omit<Row, "key" | "at">[] }[] = [
  {
    day: "11월 3일",
    date: "11.03",
    rows: [
      { title: "배달의민족", sub: "19:12 · 체크카드", amount: -18_500, balance: BASE_BALANCE },
      { title: "GS25 역삼센터점", sub: "12:41 · 체크카드", amount: -3_600, balance: 1_302_810 },
    ],
  },
  {
    day: "11월 2일",
    date: "11.02",
    rows: [
      { title: "모임통장 회비", sub: "20:03 · 이체", amount: -30_000, balance: 1_306_410 },
      { title: "토스뱅크 이자", sub: "00:00 · 이자", amount: 312, balance: 1_336_410 },
    ],
  },
  {
    day: "11월 1일",
    date: "11.01",
    rows: [
      { title: "11월 월세", sub: "09:00 · 자동이체", amount: -550_000, balance: 1_336_098 },
      { title: "쿠팡", sub: "08:17 · 체크카드", amount: -24_900, balance: 1_886_098 },
    ],
  },
];

function Glyph({ name }: { name: "back" | "search" | "caret" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M15 4.5 7.5 12l7.5 7.5" {...stroke} strokeWidth={2} /></svg>;
    case "search":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><circle cx="10.8" cy="10.8" r="6.6" {...stroke} strokeWidth={2} /><path d="m15.8 15.8 4.4 4.4" {...stroke} strokeWidth={2} /></svg>;
    case "caret":
      return <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12"><path d="M2.5 4.5 6 8l3.5-3.5" {...stroke} strokeWidth={1.6} /></svg>;
  }
}

function TransactionRow({ row, date }: { row: Omit<Row, "key" | "at">; date: string }) {
  return (
    <li className={styles.row}>
      <span className={styles.date}>{date}</span>
      <span className={styles.main}>
        <span className={styles.title} data-typing={row.typing || undefined}>{row.title}</span>
        <span className={styles.sub}>{row.sub}</span>
      </span>
      <span className={styles.money}>
        <span className={styles.amount} data-in={row.amount > 0 || undefined}>{signed(row.amount)}</span>
        <span className={styles.balance}>{won(row.balance)}</span>
      </span>
    </li>
  );
}

function TossState({ seat, lines, replies, clock, shown, reducedMotion, act }: PhoneStateProps) {
  const ex = EX_NAMES[seat % EX_NAMES.length]!;
  const [sheet, setSheet] = useState(false);
  const [memo, setMemo] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    const kept = lines.slice(-LINE_LIMIT);
    const firstCue = kept[0]?.cueIndex ?? 0;
    const events = [
      ...kept.map((line) => ({
        key: `l${line.cueIndex}`,
        at: line.cueIndex,
        title: line.text,
        time: formatSongClock(line.startMs),
        amount: 1,
        typing: line.current,
      })),
      ...replies.map((reply) => {
        const line = lines.find((entry) => entry.cueIndex === reply.afterCue);
        return {
          key: `r${reply.id}`,
          at: reply.afterCue + 0.5 + reply.id * 1e-9,
          title: reply.text,
          time: line ? formatSongClock(line.startMs) : clock,
          amount: -1,
          typing: false,
        };
      }),
    ].sort((x, y) => x.at - y.at);
    // Every cue before the kept window also came in as 1원.
    let running = BASE_BALANCE + firstCue;
    const list: Row[] = events.map((event) => {
      running += event.amount;
      return {
        key: event.key,
        at: event.at,
        title: event.title,
        sub: `${event.time} · ${ex}`,
        amount: event.amount,
        balance: running,
        typing: event.typing,
      };
    });
    return list.filter((row) => row.at >= firstCue - 1).slice(-LINE_LIMIT * 2).reverse();
  }, [clock, ex, lines, replies]);

  const balance = rows[0]?.balance ?? BASE_BALANCE;

  // Newest is first; keep the top of the list in view as rows arrive.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !shown) return;
    follow(list, 0, reducedMotion);
  }, [rows.length, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = memo.trim().slice(0, MEMO_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setMemo("");
    setSheet(false);
  };

  return (
    <section className={styles.app} aria-label="토스 토스뱅크 통장 거래내역" inert={!shown}>
      <header className={styles.nav}>
        <span className={styles.back}>
          <Glyph name="back" />
        </span>
      </header>

      <div ref={listRef} className={styles.scroll} data-feed>
        <div className={styles.account}>
          <p className={styles.accountName}>
            토스뱅크 통장 <span className={styles.number}>1000-2391-7824</span>
          </p>
          <p className={styles.total}>{won(balance)}</p>
          <div className={styles.pair}>
            <button type="button" className={styles.fill} tabIndex={-1}>채우기</button>
            <button type="button" className={styles.send} onClick={() => setSheet(true)}>보내기</button>
          </div>
        </div>

        <div className={styles.gap} />

        <div className={styles.filter}>
          <span className={styles.search}>
            <Glyph name="search" />
          </span>
          <span className={styles.sort}>
            전체 · 최신순 <Glyph name="caret" />
          </span>
        </div>

        {rows.length > 0 ? (
          <>
            <p className={styles.day}>11월 3일</p>
            <ul className={styles.rows}>
              {rows.map((row) => (
                <TransactionRow key={row.key} row={row} date="11.03" />
              ))}
              {PRIOR[0]!.rows.map((row) => (
                <TransactionRow key={row.title} row={row} date="11.03" />
              ))}
            </ul>
            {PRIOR.slice(1).map((group) => (
              <div key={group.day}>
                <p className={styles.day}>{group.day}</p>
                <ul className={styles.rows}>
                  {group.rows.map((row) => (
                    <TransactionRow key={row.title} row={row} date={group.date} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          PRIOR.map((group) => (
            <div key={group.day}>
              <p className={styles.day}>{group.day}</p>
              <ul className={styles.rows}>
                {group.rows.map((row) => (
                  <TransactionRow key={row.title} row={row} date={group.date} />
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {sheet ? (
        <div className={styles.dim} onClick={() => setSheet(false)}>
          <form className={styles.sheet} onSubmit={send} onClick={(event) => event.stopPropagation()}>
            <h2 className={styles.sheetTitle}>
              {ex}님에게
              <br />
              1원을 보낼까요?
            </h2>
            <dl className={styles.facts}>
              <div>
                <dt>받는 분에게 표시</dt>
                <dd>
                  <label className={styles.memo}>
                    <span className={styles.visuallyHidden}>받는 분에게 표시</span>
                    <input
                      value={memo}
                      maxLength={MEMO_LIMIT}
                      placeholder="입력해주세요"
                      onChange={(event) => setMemo(event.target.value)}
                      enterKeyHint="send"
                      autoComplete="off"
                    />
                  </label>
                </dd>
              </div>
              <div>
                <dt>출금 계좌</dt>
                <dd>토스뱅크 통장</dd>
              </div>
              <div>
                <dt>입금 계좌</dt>
                <dd>카카오뱅크 3333-07-•••••</dd>
              </div>
            </dl>
            <div className={styles.sheetPair}>
              <button type="button" className={styles.fill} onClick={() => setSheet(false)}>닫기</button>
              <button type="submit" className={styles.send} disabled={!memo.trim()}>보내기</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default memo(TossState);
