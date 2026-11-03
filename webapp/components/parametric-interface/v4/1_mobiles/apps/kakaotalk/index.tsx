"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatSongClock } from "../../../model/clock-face";
import type { PhoneStateProps } from "../types";
import styles from "./kakaotalk.module.css";

// KakaoTalk (iOS, 기본 테마, light), one group chat room: 우리끼리, four
// members. The friends were talking about the ex and karaoke; then the song
// arrives as the room singing along — each sung line is posted by the next
// friend in turn (line i → friend i mod 3), filling word by word. The unread
// counters behave as KakaoTalk's do: a friend's message starts at 2 (the
// other two have not read it) and drops by one as each later line is posted;
// the participant's own yellow bubbles start at 3. The composer is real.
//
// Sources: layout, colours and metrics from current KakaoTalk iOS chat-room
// frames (room background #BACEE0, own bubble #FEE500, white incoming,
// squircle profile 40 pt, yellow unread digits, 오전/오후 stamps, date pill
// with calendar glyph, composer + / field / emoji / #). Kakao publishes no
// in-app icon set, so the bar glyphs are drawn to those frames, not
// downloaded. Profiles are monograms rather than photos.

type Friend = { readonly name: string; readonly initial: string; readonly tint: string };

const ROSTER: readonly Friend[] = [
  { name: "지민", initial: "지", tint: "#9fb4c9" },
  { name: "수아", initial: "수", tint: "#c4a9a0" },
  { name: "현우", initial: "현", tint: "#a3b39a" },
  { name: "예린", initial: "예", tint: "#b3a4c2" },
  { name: "도윤", initial: "도", tint: "#a7a99a" },
  { name: "하은", initial: "하", tint: "#c2b392" },
];

const SEND_LIMIT = 80;
const MEMBERS = 4;

/** Three friends per seat, rotating through the roster. */
function friendsFor(seat: number): readonly Friend[] {
  return [0, 1, 2].map((offset) => ROSTER[(seat + offset * 2) % ROSTER.length]!);
}

/** "21:31" → "오후 9:31", KakaoTalk's stamp. */
function koreanStamp(clock: string) {
  const [h, m] = clock.split(":").map(Number) as [number, number];
  const half = h < 12 ? "오전" : "오후";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${half} ${hour}:${String(m).padStart(2, "0")}`;
}

type Entry =
  | { kind: "in"; key: string; at: number; friend: Friend; text: string; time: string; unread: number; arriving: boolean }
  | { kind: "out"; key: string; at: number; text: string; time: string; unread: number };

function Glyph({ name }: { name: "back" | "search" | "menu" | "calendar" | "plus" | "emoji" | "hash" | "send" }) {
  const stroke = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "back":
      return <svg aria-hidden="true" viewBox="0 0 12 20" width="12" height="20"><path d="M10 1.5 1.8 10l8.2 8.5" {...stroke} strokeWidth={2} /></svg>;
    case "search":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="10.5" cy="10.5" r="7" {...stroke} strokeWidth={1.8} /><path d="m15.6 15.6 5.4 5.4" {...stroke} strokeWidth={1.8} /></svg>;
    case "menu":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M3.5 5.5h17M3.5 12h17M3.5 18.5h17" {...stroke} strokeWidth={1.8} /></svg>;
    case "calendar":
      return <svg aria-hidden="true" viewBox="0 0 12 12" width="11" height="11"><rect x="1" y="2" width="10" height="9" rx="1.6" {...stroke} strokeWidth={1.1} /><path d="M1 4.8h10M3.8 1v2M8.2 1v2" {...stroke} strokeWidth={1.1} /></svg>;
    case "plus":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M12 3.5v17M3.5 12h17" {...stroke} strokeWidth={1.7} /></svg>;
    case "emoji":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="9.2" {...stroke} strokeWidth={1.6} /><circle cx="8.9" cy="10" r="1.15" fill="currentColor" /><circle cx="15.1" cy="10" r="1.15" fill="currentColor" /><path d="M8.2 14.2a4.4 4.4 0 0 0 7.6 0" {...stroke} strokeWidth={1.6} /></svg>;
    case "hash":
      return <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><path d="M9.6 3.5 7.8 20.5M16.2 3.5l-1.8 17M4.2 8.6h16M3.6 15.4h16" {...stroke} strokeWidth={1.7} /></svg>;
    case "send":
      return <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20"><path d="M10 16V4.4M4.8 9.4 10 4.2l5.2 5.2" {...stroke} strokeWidth={2.1} /></svg>;
  }
}

function Profile({ friend }: { friend: Friend }) {
  return (
    <span className={styles.profile} aria-hidden="true" style={{ background: friend.tint }}>
      {friend.initial}
    </span>
  );
}

function Meta({ unread, time, side }: { unread: number; time: string; side: "in" | "out" }) {
  return (
    <span className={styles.meta} data-side={side}>
      {unread > 0 ? <span className={styles.unread}>{unread}</span> : null}
      <span className={styles.time}>{time}</span>
    </span>
  );
}

function KakaoTalkState({ seat, lines, replies, shown, reducedMotion, act }: PhoneStateProps) {
  const friends = useMemo(() => friendsFor(seat), [seat]);
  const [a, b, c] = friends as [Friend, Friend, Friend];
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => {
    const lastCue = lines.at(-1)?.cueIndex ?? -1;
    const list: Entry[] = [
      ...lines.map((line): Entry => ({
        kind: "in",
        key: `l${line.cueIndex}`,
        at: line.cueIndex,
        friend: friends[line.cueIndex % friends.length]!,
        text: line.text,
        time: koreanStamp(formatSongClock(line.startMs)),
        // Two others have yet to read it; each later post is one more reader.
        unread: Math.max(0, MEMBERS - 2 - (lastCue - line.cueIndex)),
        arriving: line.current,
      })),
      ...replies.map((reply): Entry => {
        const after = lines.filter((line) => line.cueIndex > reply.afterCue).length;
        const at = lines.find((line) => line.cueIndex === reply.afterCue);
        return {
          kind: "out",
          key: `r${reply.id}`,
          at: reply.afterCue + 0.5,
          text: reply.text,
          time: koreanStamp(formatSongClock(at?.startMs ?? 0)),
          unread: Math.max(0, MEMBERS - 1 - after),
        };
      }),
    ];
    return list.sort((x, y) => x.at - y.at);
  }, [friends, lines, replies]);

  // The room keeps its newest message in view, as KakaoTalk does.
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread || !shown) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }, [entries, shown, reducedMotion]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, SEND_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label="카카오톡 우리끼리" inert={!shown}>
      <header className={styles.bar}>
        <span className={styles.back}>
          <Glyph name="back" />
        </span>
        <span className={styles.title}>
          우리끼리 <span className={styles.count}>{MEMBERS}</span>
        </span>
        <span className={styles.actions}>
          <Glyph name="search" />
          <Glyph name="menu" />
        </span>
      </header>

      <div ref={threadRef} className={styles.thread} data-feed>
        <div className={styles.rows}>
          <p className={styles.date}>
            <Glyph name="calendar" />
            2026년 11월 3일 화요일
          </p>

          <div className={styles.incoming}>
            <Profile friend={a} />
            <div className={styles.column}>
              <span className={styles.name}>{a.name}</span>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in" data-head>야 걔 또 연락왔다며?</p>
                <Meta unread={0} time="오후 8:47" side="in" />
              </div>
            </div>
          </div>

          <div className={styles.incoming}>
            <Profile friend={b} />
            <div className={styles.column}>
              <span className={styles.name}>{b.name}</span>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in" data-head>헐 진짜??</p>
              </div>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in">답장하지마라 진짜로</p>
                <Meta unread={0} time="오후 8:48" side="in" />
              </div>
            </div>
          </div>

          <div className={styles.outgoing}>
            <div className={styles.line} data-side="out">
              <Meta unread={0} time="오후 8:52" side="out" />
              <p className={styles.bubble} data-side="out" data-head>ㅋㅋㅋ 안 해 이번엔</p>
            </div>
          </div>

          <div className={styles.incoming}>
            <Profile friend={c} />
            <div className={styles.column}>
              <span className={styles.name}>{c.name}</span>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in" data-head>이번엔 ㅋㅋ</p>
              </div>
              <div className={styles.line}>
                <p className={styles.bubble} data-side="in">노래방 갈 사람</p>
                <Meta unread={0} time="오후 9:05" side="in" />
              </div>
            </div>
          </div>

          {entries.map((entry, index) => {
            const previous = index > 0 ? entries[index - 1] : undefined;
            if (entry.kind === "out") {
              const head = previous?.kind !== "out";
              return (
                <div key={entry.key} className={styles.outgoing} data-follow={!head || undefined}>
                  <div className={styles.line} data-side="out">
                    <Meta unread={entry.unread} time={entry.time} side="out" />
                    <p className={styles.bubble} data-side="out" data-head={head || undefined}>
                      {entry.text}
                    </p>
                  </div>
                </div>
              );
            }
            return (
              <div key={entry.key} className={styles.incoming}>
                <Profile friend={entry.friend} />
                <div className={styles.column}>
                  <span className={styles.name}>{entry.friend.name}</span>
                  <div className={styles.line}>
                    <p className={styles.bubble} data-side="in" data-head data-arriving={entry.arriving || undefined}>
                      {entry.text}
                    </p>
                    <Meta unread={entry.unread} time={entry.time} side="in" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form className={styles.composer} onSubmit={send}>
        <button type="button" className={styles.plus} aria-label="더보기" tabIndex={-1}>
          <Glyph name="plus" />
        </button>
        <label className={styles.field}>
          <span className={styles.visuallyHidden}>메시지 입력</span>
          <input
            value={draft}
            maxLength={SEND_LIMIT}
            onChange={(event) => setDraft(event.target.value)}
            enterKeyHint="send"
            autoComplete="off"
          />
          <span className={styles.emoji} aria-hidden="true">
            <Glyph name="emoji" />
          </span>
        </label>
        {draft.trim() ? (
          <button type="submit" className={styles.send} aria-label="전송">
            <Glyph name="send" />
          </button>
        ) : (
          <span className={styles.hash} aria-hidden="true">
            <Glyph name="hash" />
          </span>
        )}
      </form>
    </section>
  );
}

export default memo(KakaoTalkState);
