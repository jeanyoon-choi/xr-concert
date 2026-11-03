"use client";

import { memo, useLayoutEffect, useMemo, useState } from "react";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { useLyricCue } from "../timeline/use-lyric-cue";
import {
  buildSheet,
  CHORUS_FONT,
  CHORUS_ROW,
  LEXICON_FONT,
  LINE_FONT,
  LINE_ROW,
  PART_X,
  RIGHT_YEARS_X,
  SHEET_WIDTH,
  TABLES_WIDTH,
  TABLES_X,
  wrap,
  type LineBox,
  type Point,
  type Sheet,
} from "./model/layout";
import { LEXICON_HEAD, PART_HEADS, ROOT_LABEL, SECTIONS, TERMINAL_LABEL } from "./model/structure";
import { ABOUT_THIS_DIAGRAM, PLAN_ORG, PLAN_TITLE, PLAN_VERSION } from "./model/sheet";
import styles from "./plan.module.css";

// A long-range plan sheet in the grammar of the 1989 Integrated Space Plan,
// organised by the song: time runs down the sheet; lanes are the song's
// parts under their headings; the chorus is the central critical path; each
// line is an element at its own start, depending on the line before; repeated
// lines are tied along recurrence rails; each section's era statement sits
// at its time in the lanes empty while it plays; the lexicon lists each word
// at its first use. As the song plays, the dependencies already sung turn
// into the heavy critical path, the element being sung takes the heavy
// double rule with its sung words set bold, and the sung word is selected
// in the lexicon.

const INK = "#111";
const ROOT = { x: PART_X.chorus.x + 4, y: 22, w: PART_X.chorus.w - 8, h: 70 };

function useSheetHeight() {
  const [height, setHeight] = useState(844);

  useLayoutEffect(() => {
    const update = () => setHeight(Math.round((SHEET_WIDTH * window.innerHeight) / window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return height;
}

function polyline(points: readonly Point[]) {
  return points.map((point) => point.join(",")).join(" ");
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function Lines({
  lines,
  x,
  y,
  size,
  lineHeight,
  anchor = "middle",
  className,
  weight,
}: {
  lines: readonly string[];
  x: number;
  y: number;
  size: number;
  lineHeight: number;
  anchor?: "start" | "middle" | "end";
  className: string;
  weight?: number;
}) {
  return (
    <text className={className} fill={INK} fontSize={size} fontWeight={weight} textAnchor={anchor} x={x} y={y}>
      {lines.map((line, index) => (
        <tspan dy={index === 0 ? 0 : lineHeight} key={index} x={x}>{line}</tspan>
      ))}
    </text>
  );
}

function LineElement({
  box,
  words,
  state,
  sungUntil = -1,
}: {
  box: LineBox;
  words: readonly string[];
  state: "plain" | "current";
  sungUntil?: number;
}) {
  const isChorus = box.part === "chorus";
  const font = isChorus ? CHORUS_FONT : LINE_FONT;
  const row = isChorus ? CHORUS_ROW : LINE_ROW;
  const centreX = box.x + box.w / 2;
  const firstY = box.y + (isChorus ? 5 : 3) + font * 0.92;
  const outer = state === "current" ? 2.4 : isChorus ? 1.6 : 0.8;

  return (
    <g>
      <rect fill="#fff" height={box.h} stroke={INK} strokeWidth={outer} width={box.w} x={box.x} y={box.y} />
      {isChorus || state === "current" ? (
        <rect fill="none" height={box.h - 5} stroke={INK} strokeWidth={0.7} width={box.w - 5} x={box.x + 2.5} y={box.y + 2.5} />
      ) : null}
      <text
        className={styles.helvetica}
        fill={INK}
        fontSize={font}
        fontWeight={isChorus ? 700 : 400}
        textAnchor="middle"
        x={centreX}
        y={firstY}
      >
        {box.rows.map((indexes, rowIndex) => (
          <tspan dy={rowIndex === 0 ? 0 : row} key={rowIndex} x={centreX}>
            {indexes.map((wordIndex, position) => (
              <tspan fontWeight={wordIndex <= sungUntil ? 700 : undefined} key={wordIndex}>
                {position > 0 ? " " : ""}
                {words[wordIndex]}
              </tspan>
            ))}
          </tspan>
        ))}
      </text>
    </g>
  );
}

// Under the elements: frame, years, rings, dependencies and rails.
const PlanSheet = memo(function PlanSheet({ sheet }: { sheet: Sheet }) {
  return (
    <>
      <rect fill="none" height={sheet.height - 6} stroke={INK} strokeWidth={1.6} width={SHEET_WIDTH - 6} x={3} y={3} />

      {sheet.years.map(({ year, y }) => (
        <g key={year}>
          <line stroke={INK} strokeWidth={0.5} x1={36} x2={RIGHT_YEARS_X - 30} y1={y} y2={y} />
          <text className={styles.times} fontSize={11} x={6} y={y - 2}>{year}</text>
          <text className={styles.times} fontSize={11} textAnchor="end" x={RIGHT_YEARS_X} y={y - 2}>{year}</text>
        </g>
      ))}

      {sheet.statements.map((statement) => (
        <circle cx={statement.cx} cy={statement.cy} fill="none" key={`ring-${statement.id}`} r={statement.r} stroke={INK} strokeWidth={0.9} />
      ))}

      {/* Dependencies, recurrence rails and lexicon chains, under the elements. */}
      {sheet.progress.map((points, index) => (
        <polyline fill="none" key={`progress-${index}`} markerEnd="url(#sheet-arrow)" points={polyline(points)} stroke={INK} strokeWidth={0.8} />
      ))}
      {sheet.rails.map((rail) => (
        <g key={rail.id}>
          <polyline fill="none" points={polyline(rail.points)} stroke={INK} strokeDasharray="3 2" strokeWidth={0.8} />
          <text
            className={styles.helvetica}
            fontSize={5.6}
            textAnchor="middle"
            transform={`rotate(-90 ${rail.labelAt[0]} ${rail.labelAt[1]})`}
            x={rail.labelAt[0]}
            y={rail.labelAt[1]}
          >
            {rail.label}
          </text>
        </g>
      ))}
      {sheet.lexiconChains.map((points, index) => (
        <polyline fill="none" key={`chain-${index}`} points={polyline(points)} stroke={INK} strokeWidth={0.7} />
      ))}
      <polyline fill="none" markerEnd="url(#sheet-arrow)" points={polyline(sheet.rootToFirst)} stroke={INK} strokeWidth={1.6} />
      <polyline fill="none" markerEnd="url(#sheet-arrow)" points={polyline(sheet.lastToEnd)} stroke={INK} strokeWidth={1.6} />

    </>
  );
});

// Elements, headings, statements, header and tables, over the critical path.
const PlanElements = memo(function PlanElements({
  sheet,
  song,
  lyrics,
}: {
  sheet: Sheet;
  song: ParametricSong;
  lyrics: readonly (readonly string[])[];
}) {
  const scheduleRow = 8.2;
  const sectionTop = 112;
  const lineTop = sectionTop + 18 + SECTIONS.length * scheduleRow + 22;
  const visibleLines = song.lyrics.slice(0, Math.floor((sheet.height - lineTop - 10) / scheduleRow));

  return (
    <>
      {sheet.lines.map((box) => (
        <LineElement box={box} key={box.lineIndex} state="plain" words={lyrics[box.lineIndex]!} />
      ))}

      {sheet.words.map((box) => (
        <g key={box.key}>
          <rect fill="#fff" height={box.h} stroke={INK} strokeWidth={0.7} width={box.w} x={box.x} y={box.y} />
          <text className={styles.helvetica} fontSize={LEXICON_FONT} textAnchor="middle" x={box.x + box.w / 2} y={box.y + 7.4}>{box.word}</text>
        </g>
      ))}

      {/* Lane headings, as the poster's program-area titles. */}
      {sheet.heads.map((head) => (
        <Lines
          anchor="start"
          className={styles.helvetica}
          key={head.part}
          lineHeight={10}
          lines={[head.part === "lexicon" ? LEXICON_HEAD : PART_HEADS[head.part]]}
          size={9}
          weight={700}
          x={head.x}
          y={head.y}
        />
      ))}

      {/* Era statements, at their section's time, in the empty lanes. */}
      {sheet.statements.map((statement) => (
        <Lines
          className={styles.times}
          key={statement.id}
          lineHeight={statement.size * 1.12}
          lines={statement.rows}
          size={statement.size}
          x={statement.cx}
          y={statement.cy - ((statement.rows.length - 1) * statement.size * 1.12) / 2 + statement.size * 0.34}
        />
      ))}

      <text className={styles.times} fontSize={14} fontWeight={700} x={PART_X.bridge.x} y={sheet.height - 12}>
        {TERMINAL_LABEL}
      </text>

      {/* Header: organisation, about, root, title block, legend. */}
      <rect fill="#fff" height={40} stroke={INK} strokeWidth={1.3} width={250} x={40} y={10} />
      <text className={styles.helvetica} fontSize={13} fontWeight={700} x={50} y={29}>{PLAN_ORG[0]}</text>
      <text className={styles.helvetica} fontSize={9} x={50} y={43}>{PLAN_ORG[1]}</text>
      <Lines anchor="start" className={styles.times} lineHeight={9} lines={wrap(ABOUT_THIS_DIAGRAM, 128)} size={8} x={40} y={62} />

      <text className={styles.helvetica} fontSize={10} fontWeight={700} textAnchor="middle" x={ROOT.x + ROOT.w / 2} y={16}>CRITICAL PATH</text>
      <rect fill="#fff" height={ROOT.h} stroke={INK} strokeWidth={2} width={ROOT.w} x={ROOT.x} y={ROOT.y} />
      <rect fill="none" height={ROOT.h - 5} stroke={INK} strokeWidth={0.7} width={ROOT.w - 5} x={ROOT.x + 2.5} y={ROOT.y + 2.5} />
      <Lines className={styles.helvetica} lineHeight={15} lines={ROOT_LABEL} size={12} weight={700} x={ROOT.x + ROOT.w / 2} y={ROOT.y + 22} />

      <rect fill="#fff" height={84} stroke={INK} strokeWidth={1.8} width={RIGHT_YEARS_X - 30 - 916} x={916} y={8} />
      <Lines className={styles.times} lineHeight={25} lines={[PLAN_TITLE, "(Preliminary)"]} size={22} x={(916 + RIGHT_YEARS_X - 30) / 2} y={36} />
      <text className={styles.times} fontSize={10} fontWeight={700} textAnchor="middle" x={(916 + RIGHT_YEARS_X - 30) / 2} y={84}>{PLAN_VERSION}</text>

      <rect fill="#fff" height={92} stroke={INK} strokeWidth={0.9} width={TABLES_WIDTH} x={TABLES_X} y={8} />
      <text className={styles.helvetica} fontSize={8} fontWeight={700} textAnchor="middle" x={TABLES_X + TABLES_WIDTH / 2} y={20}>LEGEND</text>
      {[
        { y: 26, label: "PROGRAM ELEMENT" },
        { y: 39, label: "CRITICAL PATH ELEMENT", double: true },
        { y: 52, label: "DEPENDENCY", arrow: true },
        { y: 64, label: "CRITICAL PATH (SUNG)", heavy: true },
        { y: 76, label: "RECURRENCE", dashed: true },
        { y: 88, label: "ERA STATEMENT", circle: true },
      ].map((entry) => (
        <g key={entry.label}>
          {entry.arrow || entry.dashed || entry.heavy ? (
            <line markerEnd={entry.arrow ? "url(#sheet-arrow)" : undefined} stroke={INK} strokeDasharray={entry.dashed ? "3 2" : undefined} strokeWidth={entry.heavy ? 2.6 : 0.8} x1={TABLES_X + 8} x2={TABLES_X + 30} y1={entry.y + 4} y2={entry.y + 4} />
          ) : entry.circle ? (
            <circle cx={TABLES_X + 19} cy={entry.y + 4} fill="none" r={4.5} stroke={INK} />
          ) : (
            <>
              <rect fill="none" height={9} stroke={INK} strokeWidth={entry.double ? 1.6 : 0.8} width={22} x={TABLES_X + 8} y={entry.y} />
              {entry.double ? <rect fill="none" height={4.5} stroke={INK} strokeWidth={0.6} width={17.5} x={TABLES_X + 10.25} y={entry.y + 2.25} /> : null}
            </>
          )}
          <text className={styles.helvetica} fontSize={7} x={TABLES_X + 36} y={entry.y + 7}>{entry.label}</text>
        </g>
      ))}

      {/* Schedules, as the poster's data tables. */}
      <rect fill="#fff" height={sheet.height - 112 - 8} stroke={INK} strokeWidth={0.9} width={TABLES_WIDTH} x={TABLES_X} y={106} />
      <text className={styles.helvetica} fontSize={7.4} fontWeight={700} textAnchor="middle" x={TABLES_X + TABLES_WIDTH / 2} y={sectionTop + 8}>SECTION SCHEDULE</text>
      {SECTIONS.map((section, index) => (
        <g key={section.id}>
          <text className={styles.times} fontSize={7} fontWeight={700} x={TABLES_X + 5} y={sectionTop + 20 + index * scheduleRow}>{section.name}</text>
          <text className={styles.times} fontSize={7} x={TABLES_X + 74} y={sectionTop + 20 + index * scheduleRow}>{formatTime(song.lyrics[section.first]!.startMs)}</text>
          <text className={styles.times} fontSize={7} x={TABLES_X + 104} y={sectionTop + 20 + index * scheduleRow}>LINES {section.first + 1}–{section.last + 1}</text>
        </g>
      ))}
      <line stroke={INK} strokeWidth={0.7} x1={TABLES_X} x2={TABLES_X + TABLES_WIDTH} y1={lineTop - 16} y2={lineTop - 16} />
      <text className={styles.helvetica} fontSize={7.4} fontWeight={700} textAnchor="middle" x={TABLES_X + TABLES_WIDTH / 2} y={lineTop - 6}>LINE SCHEDULE</text>
      {visibleLines.map((line, index) => (
        <g key={line.id}>
          <text className={styles.times} fontSize={6.6} fontWeight={700} x={TABLES_X + 5} y={lineTop + 4 + index * scheduleRow}>{index + 1}</text>
          <text className={styles.times} fontSize={6.6} x={TABLES_X + 18} y={lineTop + 4 + index * scheduleRow}>{formatTime(line.startMs)}</text>
          <text className={styles.times} fontSize={6.6} x={TABLES_X + 40} y={lineTop + 4 + index * scheduleRow}>
            {line.text.length > 30 ? `${line.text.slice(0, 29)}…` : line.text}
          </text>
        </g>
      ))}
    </>
  );
});

// The heavy critical path through the dependencies already sung.
const SungPath = memo(function SungPath({ sheet, cueIndex, hasBegun }: { sheet: Sheet; cueIndex: number; hasBegun: boolean }) {
  if (!hasBegun) return null;
  return [sheet.rootToFirst, ...sheet.progress.slice(0, cueIndex)].map((points, index) => (
    <polyline fill="none" key={`sung-${index}`} points={polyline(points)} stroke={INK} strokeWidth={2.8} />
  ));
});

// The element being sung, and the sung word selected in the lexicon.
const CurrentState = memo(function CurrentState({
  sheet,
  cueIndex,
  activeWordPosition,
  words,
  hasBegun,
}: {
  sheet: Sheet;
  cueIndex: number;
  activeWordPosition: number;
  words: readonly string[];
  hasBegun: boolean;
}) {
  if (!hasBegun) return null;
  const current = sheet.lines[cueIndex]!;
  const sungWord = (words[activeWordPosition] ?? "").replace(/^[^A-Z]+|[^A-Z']+$/g, "");
  const lexiconBox = sheet.words.find((box) => box.word === sungWord);

  return (
    <>
      <LineElement box={current} state="current" sungUntil={activeWordPosition} words={words} />
      {lexiconBox ? (
        <g>
          <rect fill="#fff" height={lexiconBox.h} stroke={INK} strokeWidth={2} width={lexiconBox.w} x={lexiconBox.x} y={lexiconBox.y} />
          <rect fill="none" height={lexiconBox.h - 4} stroke={INK} strokeWidth={0.6} width={lexiconBox.w - 4} x={lexiconBox.x + 2} y={lexiconBox.y + 2} />
          <text className={styles.helvetica} fontSize={LEXICON_FONT} fontWeight={700} textAnchor="middle" x={lexiconBox.x + lexiconBox.w / 2} y={lexiconBox.y + 7.4}>{lexiconBox.word}</text>
        </g>
      ) : null}
    </>
  );
});

export default function ParametricInterfaceTen({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <IntegratedPlan />
    </SongPlayback>
  );
}

function IntegratedPlan() {
  const { activeWordPosition, cueIndex, currentTimeMs, hasStarted, lyric, song } = useLyricCue();
  const height = useSheetHeight();
  const sheet = useMemo(() => buildSheet(height, song), [height, song]);
  const lyrics = useMemo(() => song.lyrics.map((line) => line.words.map((word) => word.text.toUpperCase())), [song]);
  const words = useMemo(() => lyric.map((word) => word.toUpperCase()), [lyric]);
  const hasBegun = hasStarted && currentTimeMs >= (song.lyrics[0]?.startMs ?? 0) - 200;

  return (
    <main className={styles.page}>
      <svg
        aria-label={`${PLAN_TITLE} (Preliminary): ${lyric.join(" ")}`}
        className={styles.sheet}
        role="img"
        viewBox={`0 0 ${SHEET_WIDTH} ${height}`}
      >
        <defs>
          <marker id="sheet-arrow" markerHeight={5} markerWidth={5} orient="auto" refX={5} refY={2.5}>
            <path d="M0,0 L5,2.5 L0,5 Z" fill={INK} />
          </marker>
        </defs>
        <rect fill="#fff" height={height} width={SHEET_WIDTH} />
        <PlanSheet sheet={sheet} />
        <SungPath cueIndex={cueIndex} hasBegun={hasBegun} sheet={sheet} />
        <PlanElements lyrics={lyrics} sheet={sheet} song={song} />
        <CurrentState activeWordPosition={activeWordPosition} cueIndex={cueIndex} hasBegun={hasBegun} sheet={sheet} words={words} />
      </svg>
    </main>
  );
}
