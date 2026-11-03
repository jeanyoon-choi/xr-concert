"use client";

import { memo, useLayoutEffect, useMemo, useState } from "react";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { useLyricCue } from "../timeline/use-lyric-cue";
import {
  buildSheet,
  DEFINITIONS_X,
  HEADER_HEIGHT,
  LANE_LEFT,
  LANE_RIGHT,
  RIGHT_YEARS_X,
  SHEET_WIDTH,
  wrap,
  type Edge,
  type Sheet,
} from "./model/layout";
import { ABOUT_THIS_DIAGRAM, DEFINITIONS_TITLE, PLAN_ORG, PLAN_TITLE, PLAN_VERSION } from "./model/sheet";
import styles from "./plan.module.css";

// A long-range program plan in the grammar of the 1989 Integrated Space Plan,
// packed as densely and filling the whole screen at once. As in the radio
// field (/1), the lyric is the sheet's repeated unit: every program element
// is labelled with a word of the line being sung, tiled lane by lane, and
// every element holding the sung word becomes a critical-path element (the
// poster's own double rule). The root element and the circled era
// statements carry the whole line; the definitions column lists every word
// of the song. Nothing scrolls; the sheet is fitted to the viewport.

const INK = "#111";

function useSheetHeight() {
  const [height, setHeight] = useState(1080);

  useLayoutEffect(() => {
    const update = () => setHeight(Math.round((SHEET_WIDTH * window.innerHeight) / window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return height;
}

function bare(word: string) {
  return word.toUpperCase().replace(/^[^A-Z]+|[^A-Z']+$/g, "");
}

// Every distinct word of the song with the first line it appears in.
function definitionsOf(song: ParametricSong) {
  const seen = new Map<string, string>();
  for (const line of song.lyrics) {
    for (const word of line.words) {
      const key = bare(word.text);
      if (key && !seen.has(key)) seen.set(key, line.text);
    }
  }
  return [...seen].sort(([a], [b]) => a.localeCompare(b));
}

function EdgePath({ edge }: { edge: Edge }) {
  const points = edge.points.map((point) => point.join(",")).join(" ");

  if (edge.style === "double") {
    return (
      <>
        <polyline fill="none" points={points} stroke={INK} strokeWidth={3} />
        <polyline fill="none" markerEnd="url(#sheet-arrow)" points={points} stroke="#fff" strokeWidth={1.2} />
      </>
    );
  }

  return (
    <polyline
      fill="none"
      markerEnd="url(#sheet-arrow)"
      points={points}
      stroke={INK}
      strokeDasharray={edge.style === "dashed" ? "4 3" : undefined}
      strokeWidth={edge.style === "heavy" ? 2 : 0.8}
    />
  );
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

// Everything that does not follow the song.
const StaticSheet = memo(function StaticSheet({
  sheet,
  definitions,
}: {
  sheet: Sheet;
  definitions: readonly (readonly [string, string])[];
}) {
  const rowHeight = 9.4;
  const firstRow = HEADER_HEIGHT + 30;
  const visibleDefinitions = definitions.slice(0, Math.floor((sheet.height - firstRow - 10) / rowHeight));

  return (
    <>
      <rect fill="none" height={sheet.height - 8} stroke={INK} strokeWidth={2} width={SHEET_WIDTH - 8} x={4} y={4} />

      {sheet.years.map(({ year, y }) => (
        <g key={year}>
          <line stroke={INK} strokeWidth={0.6} x1={LANE_LEFT - 4} x2={LANE_RIGHT + 4} y1={y} y2={y} />
          <text className={styles.times} fontSize={14} x={10} y={y - 3}>{year}</text>
          <text className={styles.times} fontSize={14} textAnchor="end" x={RIGHT_YEARS_X} y={y - 3}>{year}</text>
        </g>
      ))}

      {sheet.edges.map((edge) => <EdgePath edge={edge} key={edge.id} />)}

      {/* Header: organisation, about, title block, legend. */}
      <rect fill="#fff" height={50} stroke={INK} strokeWidth={1.4} width={300} x={LANE_LEFT} y={14} />
      <text className={styles.helvetica} fontSize={16} fontWeight={700} x={LANE_LEFT + 12} y={38}>{PLAN_ORG[0]}</text>
      <text className={styles.helvetica} fontSize={11} x={LANE_LEFT + 12} y={55}>{PLAN_ORG[1]}</text>
      <Lines anchor="start" className={styles.times} lineHeight={10.5} lines={wrap(ABOUT_THIS_DIAGRAM, 120)} size={9.5} x={LANE_LEFT} y={84} />

      <text className={styles.helvetica} fontSize={12} fontWeight={700} textAnchor="middle" x={960} y={22}>CRITICAL PATH</text>

      <rect fill="#fff" height={96} stroke={INK} strokeWidth={2} width={340} x={1290} y={12} />
      <Lines className={styles.times} lineHeight={30} lines={[PLAN_TITLE, "(Preliminary)"]} size={27} x={1460} y={44} />
      <text className={styles.times} fontSize={12} fontWeight={700} textAnchor="middle" x={1460} y={100}>{PLAN_VERSION}</text>

      <rect fill="#fff" height={96} stroke={INK} strokeWidth={1} width={222} x={DEFINITIONS_X} y={12} />
      <text className={styles.helvetica} fontSize={9} fontWeight={700} textAnchor="middle" x={DEFINITIONS_X + 111} y={26}>LEGEND</text>
      <rect fill="none" height={10} stroke={INK} width={26} x={DEFINITIONS_X + 10} y={34} />
      <text className={styles.helvetica} fontSize={8} x={DEFINITIONS_X + 44} y={42}>PROGRAM ELEMENT</text>
      <rect fill="none" height={10} stroke={INK} strokeWidth={2} width={26} x={DEFINITIONS_X + 10} y={50} />
      <rect fill="none" height={5} stroke={INK} strokeWidth={0.7} width={21} x={DEFINITIONS_X + 12.5} y={52.5} />
      <text className={styles.helvetica} fontSize={8} x={DEFINITIONS_X + 44} y={58}>CRITICAL PATH ELEMENT</text>
      <line markerEnd="url(#sheet-arrow)" stroke={INK} x1={DEFINITIONS_X + 10} x2={DEFINITIONS_X + 36} y1={71} y2={71} />
      <text className={styles.helvetica} fontSize={8} x={DEFINITIONS_X + 44} y={74}>DEPENDENCY</text>
      <line stroke={INK} strokeDasharray="4 3" x1={DEFINITIONS_X + 10} x2={DEFINITIONS_X + 36} y1={84} y2={84} />
      <text className={styles.helvetica} fontSize={8} x={DEFINITIONS_X + 44} y={87}>SUPPORTING TECHNOLOGY</text>
      <circle cx={DEFINITIONS_X + 23} cy={98} fill="none" r={5} stroke={INK} />
      <text className={styles.helvetica} fontSize={8} x={DEFINITIONS_X + 44} y={101}>ERA STATEMENT</text>

      {/* Definitions: every word of the song with the line it comes from. */}
      <rect fill="#fff" height={sheet.height - HEADER_HEIGHT - 4} stroke={INK} strokeWidth={1} width={222} x={DEFINITIONS_X} y={HEADER_HEIGHT - 6} />
      <Lines className={styles.helvetica} lineHeight={9} lines={wrap(DEFINITIONS_TITLE, 30)} size={8} weight={700} x={DEFINITIONS_X + 111} y={HEADER_HEIGHT + 6} />
      {visibleDefinitions.map(([word, line], index) => (
        <g key={word}>
          <text className={styles.times} fontSize={7.6} fontWeight={700} x={DEFINITIONS_X + 6} y={firstRow + index * rowHeight}>{word}</text>
          <text className={styles.times} fontSize={7.6} x={DEFINITIONS_X + 72} y={firstRow + index * rowHeight}>
            {line.length > 40 ? `${line.slice(0, 39)}…` : line}
          </text>
        </g>
      ))}
    </>
  );
});

// The song: element labels, critical-path rules, root and era statements.
const LyricSheet = memo(function LyricSheet({
  sheet,
  words,
  activeWordPosition,
}: {
  sheet: Sheet;
  words: readonly string[];
  activeWordPosition: number;
}) {
  const line = words.join(" ").toUpperCase();
  const firstBox = sheet.boxes.find((box) => box.x + box.w / 2 > 900 && box.x < 960);

  return (
    <>
      {sheet.boxes.map((box) => {
        const position = box.order % words.length;
        const isCritical = position === activeWordPosition;
        const centreX = box.x + box.w / 2;

        return (
          <g key={box.id}>
            <rect fill="#fff" height={box.h} stroke={INK} strokeWidth={isCritical ? 2.2 : 0.8} width={box.w} x={box.x} y={box.y} />
            {isCritical ? (
              <rect fill="none" height={box.h - 5} stroke={INK} strokeWidth={0.7} width={box.w - 5} x={box.x + 2.5} y={box.y + 2.5} />
            ) : null}
            <text
              className={styles.helvetica}
              fill={INK}
              fontSize={8.5}
              fontWeight={isCritical ? 700 : 400}
              textAnchor="middle"
              x={centreX}
              y={box.y + box.h / 2 + 3}
            >
              {words[position]!.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Root element of the critical path carries the whole line. */}
      <rect fill="#fff" height={96} stroke={INK} strokeWidth={2.2} width={300} x={810} y={30} />
      <rect fill="none" height={90} stroke={INK} strokeWidth={0.8} width={294} x={813} y={33} />
      <Lines className={styles.helvetica} lineHeight={17} lines={wrap(line, 26)} size={15} weight={700} x={960} y={62} />
      {firstBox ? (
        <polyline
          fill="none"
          markerEnd="url(#sheet-arrow)"
          points={`960,126 960,${HEADER_HEIGHT - 4} ${firstBox.x + firstBox.w / 2},${HEADER_HEIGHT - 4} ${firstBox.x + firstBox.w / 2},${firstBox.y}`}
          stroke={INK}
          strokeWidth={2.4}
        />
      ) : null}

      {/* Era circles run over the elements, as on the poster. */}
      {sheet.circles.map((circle) => (
        <circle cx={circle.cx} cy={circle.cy} fill="none" key={`ring-${circle.cx}-${circle.cy}`} r={circle.r} stroke={INK} strokeWidth={1} />
      ))}

      {sheet.circles.map((circle) => {
        const size = Math.max(22, circle.r * 0.17);
        const lines = wrap(line, Math.max(8, Math.floor((circle.r * 1.5) / (size * 0.58))));
        return (
          <Lines
            className={`${styles.times} ${styles.statement}`}
            key={`${circle.cx}-${circle.cy}`}
            lineHeight={size * 1.08}
            lines={lines}
            size={size}
            x={circle.cx}
            y={circle.cy - ((lines.length - 1) * size * 1.08) / 2 + size * 0.35}
          />
        );
      })}
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
  const { activeWordPosition, lyric, song } = useLyricCue();
  const height = useSheetHeight();
  const sheet = useMemo(() => buildSheet(height), [height]);
  const definitions = useMemo(() => definitionsOf(song), [song]);

  return (
    <main className={styles.page}>
      <svg
        aria-label={`${PLAN_TITLE} (Preliminary): ${lyric.join(" ")}`}
        className={styles.sheet}
        role="img"
        viewBox={`0 0 ${SHEET_WIDTH} ${height}`}
      >
        <defs>
          <marker id="sheet-arrow" markerHeight={6} markerWidth={6} orient="auto" refX={6} refY={3}>
            <path d="M0,0 L6,3 L0,6 Z" fill={INK} />
          </marker>
        </defs>
        <rect fill="#fff" height={height} width={SHEET_WIDTH} />
        <StaticSheet definitions={definitions} sheet={sheet} />
        <LyricSheet activeWordPosition={activeWordPosition} sheet={sheet} words={lyric} />
      </svg>
    </main>
  );
}
