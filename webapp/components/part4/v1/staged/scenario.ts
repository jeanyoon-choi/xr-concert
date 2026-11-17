import type { PhoneState } from "../phones/states";
import type { SungLine } from "../song/lines";
import type { LyricWordTiming } from "../timeline/use-lyric-cue";

// What a staged phone is told to send: messages cut from the song's lines,
// each typed as its words are sung. A scenario (./opening.ts) is written
// with `line` and `shout`; the field (./field.tsx) plays it.

/** One message: words `from`–`to` of line `cue` (the whole line by default). */
export type MessageSpec = { cue: number; from?: number; to?: number; shout?: boolean; bold?: boolean };

export const line = (cue: number, from?: number, to?: number): MessageSpec => ({ cue, from, to });
/** The same, set in bold. */
export const bold = (cue: number, from?: number, to?: number): MessageSpec => ({ cue, from, to, bold: true });
/** The same, shouted: typed in capitals and set in bold. */
export const shout = (cue: number, from?: number, to?: number): MessageSpec => ({ cue, from, to, shout: true });

/** A typist's pace per character, capped so a word finishes before the next one (as timeline/use-sung-lines). */
const CHARACTER_MS = 55;

type Word = { text: string; startMs: number; durationMs: number };
export type Message = { key: number; startMs: number; words: readonly Word[]; bold: boolean };

export function resolve(spec: MessageSpec, key: number, timings: readonly LyricWordTiming[]): Message {
  const words = timings
    .filter((word) => word.cueIndex === spec.cue && word.wordIndex >= (spec.from ?? 0) && word.wordIndex <= (spec.to ?? Infinity))
    .map((word): Word => ({ text: spec.shout ? word.word.toUpperCase() : word.word, startMs: word.startMs, durationMs: word.durationMs }));
  return { key, startMs: words[0]!.startMs, words, bold: Boolean(spec.shout || spec.bold) };
}

/** How many characters of a message are typed at `timeMs` (each word from its onset). */
export function typedAt(message: Message, timeMs: number) {
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
export function toLine(message: Message, typed: number, newest: boolean): SungLine {
  const texts = message.words.map((word) => word.text);
  const begun: string[] = [];
  let left = typed;
  for (const text of texts) {
    if (left <= 0) break;
    begun.push(text.slice(0, left));
    left -= text.length;
  }
  return { cueIndex: message.key, words: texts, sung: begun.length, text: begun.join(" "), full: texts.join(" "), startMs: message.startMs, current: newest, bold: message.bold };
}

/**
 * A scenario: for a stretch of the song the phones stop following the score
 * and each sends what it is told, in the app it is given.
 */
export type Scenario = {
  /** The line (cue index) it begins at; the first scenario runs from the start of the song. */
  readonly from: number;
  /** The line at which it hands the phones back to the score. */
  readonly until: number;
  /** Sets the lyric this many times larger in its apps (default 1), on top of the page's text size. */
  readonly scale?: number;
  /** The app each phone is in. */
  readonly app: (phone: number) => PhoneState;
  /** The phones as they stand, left to right then row by row, and the messages each one sends. */
  readonly phones: readonly (readonly MessageSpec[])[];
};
