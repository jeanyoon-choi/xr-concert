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

// Verse 1 and Pre-Chorus 1, as one staging: phones come in one at a time,
// each an empty 1:1 KakaoTalk room with the ex in which the phone's owner
// sends her part of the lyric.
//
// - Verse 1: one phone takes the first two lines (to “… in the dark”); a
//   second comes in on the right for the next two.
// - Pre-Chorus 1: a phone each for “That you were jealous and possessive”,
//   “So manipulatin'”, “Honestly,” and “impressive” — six in a row.
// - “You had me participatin'”: a phone each for “You”, “had”, “me”,
//   “part”, “icip”, “atin'”, as sung — a second row of six, 2 × 6.
// The 2 × 6 is the phone grid's own layout for twelve, so the chorus (the
// grid) takes over with every phone where it already is.
//
// Pure in the clock: a seek lands on the same picture.

/** One message: words `from`–`to` of line `cue`, or one piece of a single word. */
type MessageSpec = { cue: number; from?: number; to?: number; piece?: { text: string; at: number; until: number } };

const line = (cue: number, from?: number, to?: number): MessageSpec => ({ cue, from, to });
/** A piece of word `word` of line `cue`, sung from `at` to `until` (shares of the word's length). */
const piece = (cue: number, word: number, text: string, at: number, until: number): MessageSpec => ({ cue, from: word, to: word, piece: { text, at, until } });

const APP: PhoneState = "kakaotalk-direct";

/** The scenario: the phones in the order they come in, and the messages each one sends. */
const PHONES: readonly (readonly MessageSpec[])[] = [
  [line(0), line(1)],
  [line(2), line(3)],
  [line(4)],
  [line(5)],
  [line(6, 0, 0)],
  [line(6, 1, 1)],
  [line(7, 0, 0)],
  [line(7, 1, 1)],
  [line(7, 2, 2)],
  // “participatin'” is one timed word; its pieces are spread over the part of it that is sung.
  [piece(7, 3, "part", 0, 0.25)],
  [piece(7, 3, "icip", 0.25, 0.5)],
  [piece(7, 3, "atin'", 0.5, 0.75)],
];

/** Phones in the first row; from the next phone on, the stage is the grid for all of them. */
const ROW = 6;

/**
 * The phones already out make room this long before the next one comes in,
 * so the move is over when it appears and nothing overlaps (the move itself
 * is the CSS transition, shorter than this).
 */
const MAKE_ROOM_MS = 600;

/** A typist's pace per character, capped so a word finishes before the next one (as timeline/use-sung-lines). */
const CHARACTER_MS = 55;

type Word = { text: string; startMs: number; durationMs: number };
type Message = { key: number; startMs: number; words: readonly Word[] };

function resolve(spec: MessageSpec, key: number, timings: readonly LyricWordTiming[]): Message {
  const words = timings
    .filter((word) => word.cueIndex === spec.cue && word.wordIndex >= (spec.from ?? 0) && word.wordIndex <= (spec.to ?? Infinity))
    .map((word): Word => {
      if (!spec.piece) return { text: word.word, startMs: word.startMs, durationMs: word.durationMs };
      const { text, at, until } = spec.piece;
      return { text, startMs: word.startMs + at * word.durationMs, durationMs: (until - at) * word.durationMs };
    });
  return { key, startMs: words[0]!.startMs, words };
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
  return { cueIndex: message.key, words: texts, sung: begun.length, text: begun.join(" "), full: texts.join(" "), startMs: message.startMs, current: newest };
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
    () => PHONES.map((specs, phone) => specs.map((spec, index) => resolve(spec, phone * 10 + index, cue.wordTimings))),
    [cue.wordTimings],
  );
  const timeMs = cue.currentTimeMs + LYRIC_LEAD_MS;
  // A phone comes in when its first message begins; the first is out from the start.
  const out = Math.max(1, phones.filter((messages) => messages[0]!.startMs <= timeMs).length);
  // The stage is laid out for the phones about to come in, ahead of them.
  const laidOut = Math.max(out, phones.filter((messages) => messages[0]!.startMs <= timeMs + MAKE_ROOM_MS).length);

  // Phones are drawn once, at the size of a phone alone on the stage, and scaled to their seat.
  const base = fitPhoneGrid(stage.width, stage.height, 1).width;
  /** Seat `index` when `count` phones are out: one row up to ROW, then the grid for all. */
  const seatOf = (index: number, count: number) => {
    const layout = fitPhoneGrid(stage.width, stage.height, count <= ROW ? count : PHONES.length);
    const columns = Math.min(layout.columns, count <= ROW ? count : PHONES.length);
    const rows = Math.ceil((count <= ROW ? count : PHONES.length) / columns);
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
        const shown = index < out;
        // A phone not yet out waits, unseen, at the seat it will come in at.
        const { x, y, scale } = seatOf(index, Math.max(laidOut, index + 1));
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
              seat={index}
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
