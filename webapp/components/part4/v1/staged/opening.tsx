"use client";

import { memo, useMemo } from "react";
import { fitPhoneGrid } from "../phones/layout";
import { Phone } from "../phones/phone";
import type { PhoneState } from "../phones/states";
import { usePhoneClock } from "../phones/use-phone-clock";
import type { SungLine } from "../song/lines";
import { PHONE_FRAME, useSurface } from "../surface";
import { LYRIC_LEAD_MS, type LyricWordTiming } from "../timeline/use-lyric-cue";
import type { StagingProps } from ".";
import styles from "./staged.module.css";

// Verse 1, Pre-Chorus 1 and Chorus 1, as one staging: phones come in,
// each an empty 1:1 KakaoTalk room with the ex in which the phone's owner
// sends her part of the lyric.
//
// - Verse 1: one phone takes the first two lines (to “… in the dark”); a
//   second comes in on the right for the next two.
// - Pre-Chorus 1: a third comes in for “That you were jealous and
//   possessive”, a fourth for “So manipulating”. A fifth comes in on the
//   right on “Honestly, impressive”, a sixth on “YOU” — six in a row. “Honestly, impressive” and “YOU” “HAD” “ME” “PARTICIPATING” (in capitals at twice the
//   size, a message a word) are sent as new messages on every phone at once.
// - Chorus 1: six more come in together as a second row — 2 × 6, twelve —
//   and every phone sends each line of the chorus.
//
// Pure in the clock: a seek lands on the same picture.

/** One message: words `from`–`to` of line `cue` (the whole line by default). */
type MessageSpec = { cue: number; from?: number; to?: number; shout?: boolean };

const line = (cue: number, from?: number, to?: number): MessageSpec => ({ cue, from, to });
/** The same, shouted: typed in capitals, at SHOUT_SCALE times the usual size (type and bubble). */
const shout = (cue: number, from?: number, to?: number): MessageSpec => ({ cue, from, to, shout: true });
const SHOUT_SCALE = 2;

const APP: PhoneState = "kakaotalk-direct";

/** Sent on every phone, after its own lines. */
// “YOU” “HAD” “ME” “PARTICIPATING”: a message a word, as each is sung.
const SHOUTED = [shout(7, 0, 0), shout(7, 1, 1), shout(7, 2, 2), shout(7, 3, 3)];
/** Chorus 1, a message a line. */
const CHORUS = [8, 9, 10, 11, 12, 13, 14, 15].map((cue) => line(cue));
const ALL = [line(6), ...SHOUTED, ...CHORUS];

/**
 * The scenario: the phones as they stand left to right, and the messages
 * each one sends. A phone comes in when its first message begins (the
 * earliest is out from the start), wherever in the row it stands.
 */
const PHONES: readonly (readonly MessageSpec[])[] = [
  [line(0), line(1), ...ALL],
  [line(2), line(3), ...ALL],
  [line(4), ...ALL],
  [line(5), ...ALL],
  [...ALL],
  [...SHOUTED, ...CHORUS],
  // Chorus 1: six more, the second row.
  ...Array.from({ length: 6 }, () => CHORUS),
];

/**
 * The phones already out make room this long before the next one comes in,
 * so the move is over when it appears and nothing overlaps (the move itself
 * is the CSS transition, shorter than this).
 */
const MAKE_ROOM_MS = 600;

/** A typist's pace per character, capped so a word finishes before the next one (as timeline/use-sung-lines). */
const CHARACTER_MS = 55;

type Word = { text: string; startMs: number; durationMs: number };
type Message = { key: number; startMs: number; words: readonly Word[]; scale: number };

function resolve(spec: MessageSpec, key: number, timings: readonly LyricWordTiming[]): Message {
  const words = timings
    .filter((word) => word.cueIndex === spec.cue && word.wordIndex >= (spec.from ?? 0) && word.wordIndex <= (spec.to ?? Infinity))
    .map((word): Word => ({ text: spec.shout ? word.word.toUpperCase() : word.word, startMs: word.startMs, durationMs: word.durationMs }));
  return { key, startMs: words[0]!.startMs, words, scale: spec.shout ? SHOUT_SCALE : 1 };
}

/** How many characters of a message are typed at `timeMs` (each word from its onset). */
function typedAt(message: Message, timeMs: number) {
  let typed = 0;
  for (const word of message.words) {
    if (word.startMs > timeMs) break;
    const length = word.text.length;
    const span = Math.min(length * CHARACTER_MS, word.durationMs * 0.8);
    typed += span <= 0 ? length : Math.min(length, Math.max(1, Math.ceil(((timeMs - word.startMs) / span) * length)));
  }
  return typed;
}

/** A message as the line an app shows: the first `typed` characters of its words. */
function toLine(message: Message, typed: number, newest: boolean): SungLine {
  const texts = message.words.map((word) => word.text);
  const begun: string[] = [];
  let left = typed;
  for (const text of texts) {
    if (left <= 0) break;
    begun.push(text.slice(0, left));
    left -= text.length;
  }
  return { cueIndex: message.key, words: texts, sung: begun.length, text: begun.join(" "), full: texts.join(" "), startMs: message.startMs, current: newest, scale: message.scale };
}

/** One phone of the staging; re-renders only when a character of its own is typed. */
const StagedPhone = memo(function StagedPhone({
  seat,
  width,
  messages,
  typed,
  clock,
  reducedMotion,
}: {
  seat: number;
  width: number;
  messages: readonly Message[];
  /** Characters typed in each message, joined: "12,4". */
  typed: string;
  clock: string;
  reducedMotion: boolean;
}) {
  const lines = useMemo(() => {
    const counts = typed.split(",").map(Number);
    const begun = messages.filter((_, index) => counts[index]! > 0);
    return begun.map((message, index) => toLine(message, counts[index]!, index === begun.length - 1));
  }, [messages, typed]);

  return <Phone seat={seat} width={width} lines={lines} app={APP} upcoming={null} locked={false} lineKey="" clock={clock} reducedMotion={reducedMotion} />;
});

export function Opening({ cue }: StagingProps) {
  const stage = useSurface();
  const clock = usePhoneClock(cue);
  const phones = useMemo(
    () => PHONES.map((specs, phone) => specs.map((spec, index) => resolve(spec, phone * 100 + index, cue.wordTimings))),
    [cue.wordTimings],
  );
  const timeMs = cue.currentTimeMs + LYRIC_LEAD_MS;
  // When each phone comes in: as its first message begins; the earliest is out from the start.
  const arrivals = useMemo(() => {
    const starts = phones.map((messages) => messages[0]!.startMs);
    const first = starts.indexOf(Math.min(...starts));
    return starts.map((startMs, index) => (index === first ? -Infinity : startMs));
  }, [phones]);
  /** Each phone's seat number, in the order they come in: who it is (its contact, its status bar). */
  const seats = useMemo(
    () => arrivals.map((arrival, index) => arrivals.filter((other, at) => other < arrival || (other === arrival && at < index)).length),
    [arrivals],
  );
  // The stage is laid out for the phones about to come in, ahead of them.
  const laidOutAt = timeMs + MAKE_ROOM_MS;

  // Phones are drawn once, at the size of a phone alone on the stage, and scaled to their seat.
  const base = fitPhoneGrid(stage.width, stage.height, 1).width;
  /** Seat `index` when `count` phones are out: the phone grid's own layout for that many. */
  const seatOf = (index: number, count: number) => {
    const layout = fitPhoneGrid(stage.width, stage.height, count);
    const columns = Math.min(layout.columns, count);
    const rows = Math.ceil(count / columns);
    const left = (stage.width - columns * layout.width - (columns - 1) * layout.gap) / 2;
    const top = (stage.height - rows * layout.height - (rows - 1) * layout.gap) / 2;
    return {
      x: left + (index % columns) * (layout.width + layout.gap),
      y: top + Math.floor(index / columns) * (layout.height + layout.gap),
      scale: layout.width / base,
    };
  };

  return (
    <main className={styles.stage} data-reduced-motion={cue.reducedMotion || undefined}>
      {phones.map((messages, index) => {
        const shown = arrivals[index]! <= timeMs;
        // The row is the phones laid out by now, left to right; one not yet
        // laid out waits, unseen, where it will stand when it comes in.
        const at = Math.max(laidOutAt, arrivals[index]!);
        const row = arrivals.map((arrival) => arrival <= at);
        const { x, y, scale } = seatOf(row.slice(0, index).filter(Boolean).length, row.filter(Boolean).length);
        return (
          <div
            key={index}
            className={styles.phone}
            data-shown={shown || undefined}
            inert={!shown}
            style={{
              width: base,
              height: (base * PHONE_FRAME.height) / PHONE_FRAME.width,
              transform: `translate(${x}px, ${y}px) scale(${shown ? scale : scale * 0.96})`,
            }}
          >
            <StagedPhone
              seat={seats[index]!}
              width={base}
              messages={messages}
              typed={messages.map((message) => typedAt(message, timeMs)).join(",")}
              clock={clock}
              reducedMotion={cue.reducedMotion}
            />
          </div>
        );
      })}
    </main>
  );
}
