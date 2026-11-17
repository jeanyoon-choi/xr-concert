"use client";

import { memo, useMemo } from "react";
import { fitPhoneGrid } from "../phones/layout";
import { Phone, PHONE_HISTORY } from "../phones/phone";
import { appsAt, MOVE_MS, passageOfCue, usePhoneScore } from "../phones/score";
import type { PhoneState } from "../phones/states";
import { usePhoneClock } from "../phones/use-phone-clock";
import type { SungLine } from "../song/lines";
import { sectionOf, type SectionId } from "../song/sections";
import { PHONE_FRAME, useSurface } from "../surface";
import { LYRIC_LEAD_MS, type LyricCue } from "../timeline/use-lyric-cue";
import { useSungLines } from "../timeline/use-sung-lines";
import { resolve, toLine, typedAt, type Message, type Scenario } from "./scenario";
import styles from "./staged.module.css";

// The staged field: twelve phones that are never remounted, so the song
// runs through its sections without a cut.
//
// - During a scenario (./scenario.ts) its phones send what it tells them, in
//   the app it gives them. In the first, they also come in one at a time,
//   each as its first message begins.
// - Into a scenario and out of it a phone scrolls from one app to the next —
//   the same move a phone makes between apps anywhere else — carrying what
//   it showed with it.
// - Outside a scenario every phone follows the score, dealt from the pool of
//   its section (`pools`) or, where a section names none, the pool chosen in
//   the options control.
//
// Pure in the clock: a seek lands on the same picture.

const SEATS = 12;

/**
 * The phones already out make room this long before the next one comes in,
 * so the move is over when it appears and nothing overlaps (the move itself
 * is the CSS transition, shorter than this).
 */
const MAKE_ROOM_MS = 600;

/** How long before the scenario ends its phones mount, out of sight, the app they will scroll to. */
const PRELOAD_MS = 700;

/** The line being sung at `timeMs` (0 before the first). */
function cueAt(cue: LyricCue, timeMs: number) {
  let index = 0;
  for (const word of cue.wordTimings) {
    if (word.startMs > timeMs) break;
    index = word.cueIndex;
  }
  return index;
}

/** A scenario app and the messages it holds on one phone; `typed` is the characters typed in each, joined: "12,4". */
type Hold = { app: PhoneState | null; messages: readonly Message[]; typed: string; scale: number };

type StagedPhoneProps = {
  seat: number;
  width: number;
  /** The sung lines, shared by every phone. */
  lines: readonly SungLine[];
  /** Up to two scenario apps holding their own messages: two while the phone scrolls from one scenario into the next. */
  holdApp: PhoneState | null;
  holdMessages: readonly Message[];
  holdTyped: string;
  holdScale: number;
  nextApp: PhoneState | null;
  nextMessages: readonly Message[];
  nextTyped: string;
  nextScale: number;
  app: PhoneState;
  upcoming: PhoneState | null;
  locked: boolean;
  lineKey: string;
  lyricScale: number;
  clock: string;
  reducedMotion: boolean;
};

function held({ app, messages, typed, scale }: Hold) {
  if (!app) return null;
  const counts = typed.split(",").map(Number);
  const begun = messages.filter((_, index) => counts[index]! > 0);
  return { app, scale, lines: begun.map((message, index) => toLine(message, counts[index]!, index === begun.length - 1)) };
}

/** One phone of the field; while it plays a scenario it re-renders only when a character of its own is typed. */
const StagedPhone = memo(function StagedPhone({ holdApp, holdMessages, holdTyped, holdScale, nextApp, nextMessages, nextTyped, nextScale, ...phone }: StagedPhoneProps) {
  const first = useMemo(() => held({ app: holdApp, messages: holdMessages, typed: holdTyped, scale: holdScale }), [holdApp, holdMessages, holdScale, holdTyped]);
  const second = useMemo(() => held({ app: nextApp, messages: nextMessages, typed: nextTyped, scale: nextScale }), [nextApp, nextMessages, nextScale, nextTyped]);
  const holds = useMemo(() => [first, second].filter((entry) => entry !== null), [first, second]);

  return <Phone {...phone} held={holds} />;
});

export function StagedField({
  cue,
  scenarios,
  pool,
  pools,
  scales,
  locked,
}: {
  cue: LyricCue;
  /** The scenarios, in song order; the first also brings the phones in. */
  scenarios: readonly Scenario[];
  /** The apps chosen in the options control. */
  pool: readonly PhoneState[];
  /** The apps a section deals from, where it names its own. */
  pools: Partial<Record<SectionId, readonly PhoneState[]>>;
  /** How much larger a section sets the lyric where the phones follow the score (default 1). */
  scales: Partial<Record<SectionId, number>>;
  /** Hold every phone on its lock screen. */
  locked: boolean;
}) {
  const stage = useSurface();
  const clock = usePhoneClock(cue);
  const lines = useSungLines(cue, PHONE_HISTORY);
  const poolOf = (cueIndex: number) => pools[sectionOf(cueIndex)] ?? pool;

  const now = cue.currentTimeMs;
  // The scenarios in song time. A move into or out of one is centred on its
  // first line, as every move between apps is on its passage.
  const staged = useMemo(() => {
    const startOf = (cueIndex: number) => cue.wordTimings.find((word) => word.cueIndex === cueIndex)!.startMs;
    return scenarios.map((scenario, order) => ({
      scenario,
      startMs: order === 0 ? -Infinity : startOf(scenario.from) - MOVE_MS / 2,
      endMs: startOf(scenario.until) - MOVE_MS / 2,
      phones: scenario.phones.map((specs, phone) => specs.map((spec, index) => resolve(spec, order * 10_000 + phone * 100 + index, cue.wordTimings))),
      // The apps its phones scroll to when it ends.
      after: appsAt(pools[sectionOf(scenario.until)] ?? pool, SEATS, passageOfCue(scenario.until)),
    }));
  }, [cue.wordTimings, pool, pools, scenarios]);
  /** The scenario playing now, the one about to begin (its app mounts out of sight), and the one whose app still holds its messages. */
  const playing = staged.find((entry) => now >= entry.startMs && now < entry.endMs);
  const coming = staged.find((entry) => now >= entry.startMs - PRELOAD_MS && now < entry.startMs);
  /** The scenarios whose apps hold their own messages now: each from just before it begins until its phones have scrolled away. */
  const holders = staged.filter((entry) => now >= entry.startMs - PRELOAD_MS && now < entry.endMs + MOVE_MS);
  const opening = staged[0]!;

  // The score, from the pool of the section a move now would land in; that section's text size with it.
  const landing = cueAt(cue, now + MOVE_MS / 2);
  const score = usePhoneScore(cue, SEATS, poolOf(landing));
  const sectionScale = scales[sectionOf(landing)] ?? 1;

  // When each phone comes in: a phone of the first scenario as its first
  // message begins (the earliest is out from the start), the others as it ends.
  const arrivals = useMemo(() => {
    const starts = Array.from({ length: SEATS }, (_, index) => opening.phones[index]?.[0]!.startMs ?? opening.endMs + MOVE_MS / 2);
    const earliest = starts.indexOf(Math.min(...starts));
    return starts.map((startMs, index) => (index === earliest ? -Infinity : startMs));
  }, [opening]);
  /** Each phone's seat number, in the order they come in: who it is (its contact, its status bar). */
  const seats = useMemo(
    () => arrivals.map((arrival, index) => arrivals.filter((other, at) => other < arrival || (other === arrival && at < index)).length),
    [arrivals],
  );
  const timeMs = now + LYRIC_LEAD_MS;
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
      {arrivals.map((arrival, index) => {
        const shown = arrival <= timeMs;
        // The row is the phones laid out by now, left to right; one not yet
        // laid out waits, unseen, where it will stand when it comes in.
        const at = Math.max(laidOutAt, arrival);
        const row = arrivals.map((other) => other <= at);
        const { x, y, scale } = seatOf(row.slice(0, index).filter(Boolean).length, row.filter(Boolean).length);

        // In a scenario a phone is in the app it gives; near its end, the app
        // it will scroll to is mounted out of sight. Outside one it follows the
        // score — and before the first has ended, a phone that is not part of
        // it waits already in the app it will come in with.
        const part = playing?.phones[index] ? playing : undefined;
        const joining = coming?.phones[index] ? coming : undefined;
        const [hold, next] = holders.filter((entry) => entry.phones[index]);
        const typedIn = (entry: typeof hold) => (entry ? entry.phones[index]!.map((message) => typedAt(message, timeMs)).join(",") : "");
        const app = part ? part.scenario.app(index) : now < opening.endMs ? opening.after[index]! : score.apps[index]!;
        const upcoming = joining
          ? joining.scenario.app(index)
          : part
            ? now >= part.endMs - PRELOAD_MS
              ? part.after[index]!
              : null
            : score.upcoming[index]!;
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
              lines={lines}
              holdApp={hold ? hold.scenario.app(index) : null}
              holdMessages={hold?.phones[index] ?? NONE}
              holdTyped={typedIn(hold)}
              holdScale={hold?.scenario.scale ?? 1}
              nextApp={next ? next.scenario.app(index) : null}
              nextMessages={next?.phones[index] ?? NONE}
              nextTyped={typedIn(next)}
              nextScale={next?.scenario.scale ?? 1}
              app={app}
              upcoming={upcoming !== app ? upcoming : null}
              locked={!part && now >= opening.endMs && (locked || score.locked)}
              lineKey={part ? "" : `${cue.cueIndex}`}
              lyricScale={part ? 1 : sectionScale}
              clock={clock}
              reducedMotion={cue.reducedMotion}
            />
          </div>
        );
      })}
    </main>
  );
}

const NONE: readonly Message[] = [];
