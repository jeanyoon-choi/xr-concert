"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { reversePath, slicePath, toSvgPoints, type Polyline } from "../1/model/path";
import { DEFAULT_CONFIG, LIMITS, normalizeConfig, type TopologyConfig } from "../1/model/topology";
import { buildCircuit, NODE_R, VENUE, VIEW, type CircuitNode } from "./circuit";
import styles from "./schematic.module.css";

/** Wire units per second. */
const SPEED = 640;
const PHONE_PRESETS = [5, 24, 60, 100] as const;
/** One family per kind of sender, one shade per sender; receivers take the
 * colour of what reached them. */
const SHADES: Record<string, readonly string[]> = {
  local: ["#c46a3e", "#dc8a52", "#a8522c", "#e6a273", "#b86446"],
  remote: ["#c9a640", "#e0c062", "#a98a2c", "#ecd389"],
  phone: ["#5f9aa2"],
};

function colorOf(id: string, kind: string | undefined) {
  const shades = kind ? SHADES[kind] : undefined;
  if (!shades) return undefined;
  const index = Number(id.slice(id.lastIndexOf("-") + 1)) - 1;
  return shades[index % shades.length];
}

/** The part of a path between distances a and b from its start. */
function subPath(path: Polyline, a: number, b: number): Polyline {
  const head = slicePath(path, b);
  return a <= 0 ? head : reversePath(slicePath(reversePath(head), b - a));
}

/** Study 1's rings. Sending: solid rings expand out of the device.
 * Receiving: dashed rings close in on the device. */
function Rings({ x, y, base, reach, color, seconds, receiving }: {
  x: number;
  y: number;
  base: number;
  reach: number;
  color: string;
  seconds: number;
  receiving: boolean;
}) {
  const count = 3;
  return (
    <g className={receiving ? styles.ringsIn : styles.rings} stroke={color}>
      {Array.from({ length: count }, (_, index) => {
        const phase = (seconds * 0.9 + index / count) % 1;
        const distance = receiving ? 1 - phase : phase;
        return <circle key={index} cx={x} cy={y} r={base + distance * reach} strokeOpacity={(1 - distance) * 0.9} />;
      })}
    </g>
  );
}

type Send = { since: number; releasedAt: number | null };

function Shape({ node, color }: { node: CircuitNode; color: string | undefined }) {
  const fill = color ?? "var(--schematic-field)";
  switch (node.kind) {
    case "projection":
    case "speaker": {
      const { x0, x1, y0, y1 } = node.rect;
      return <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} className={styles.stroke} fill={fill} />;
    }
    case "phone":
      return (
        <rect
          x={node.x - node.width / 2}
          y={node.y - node.height / 2}
          width={node.width}
          height={node.height}
          rx={2}
          className={styles.stroke}
          fill={fill}
        />
      );
    default:
      return (
        <circle cx={node.x} cy={node.y} r={NODE_R} className={node.kind === "remote" ? styles.dashed : styles.stroke} fill={fill} />
      );
  }
}

export default function SchematicStudy2() {
  const [config, setConfig] = useState<TopologyConfig>(DEFAULT_CONFIG);
  /** Sender id → when it was selected and, once deselected, when it was
   * released. Any number at once. */
  const [selection, setSelection] = useState<ReadonlyMap<string, Send>>(new Map());
  const [now, setNow] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const circuit = useMemo(() => buildCircuit(config), [config]);
  const traces = useMemo(() => circuit.edges.map((edge) => toSvgPoints(edge.path)), [circuit]);
  const kindOf = useMemo(() => new Map(circuit.nodes.map((node) => [node.id, node.kind])), [circuit]);

  const longest = useMemo(() => Math.max(0, ...circuit.edges.map((edge) => edge.length)), [circuit]);
  const hasSelection = selection.size > 0;
  useEffect(() => {
    if (!hasSelection) return;
    let frame = 0;
    const tick = (time: number) => {
      setNow(time);
      // Drop released senders once their tail has drained every trace.
      setSelection((current) => {
        const done = [...current].filter(
          ([, send]) => send.releasedAt !== null && ((time - send.releasedAt) / 1000) * SPEED > longest,
        );
        if (done.length === 0) return current;
        const next = new Map(current);
        for (const [id] of done) next.delete(id);
        return next;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasSelection, longest]);

  // Each wavefront leaves its sender along that sender's own traces. After
  // release a tail follows from the sender at the same speed, so the trace
  // drains in order; a receiver is on while the signal covers its end.
  const flows: { color: string; points: string; tail: number }[] = [];
  const reached = new Map<string, string>();
  for (const [senderId, send] of selection) {
    const color = colorOf(senderId, kindOf.get(senderId));
    const head = Math.max(0, ((now - send.since) / 1000) * SPEED);
    const tail = send.releasedAt === null ? 0 : Math.max(0, ((now - send.releasedAt) / 1000) * SPEED);
    if (!color || head <= 0) continue;
    for (const edge of circuit.edgesFrom.get(senderId) ?? []) {
      const end = Math.min(head, edge.length);
      if (tail >= end) continue;
      flows.push({ color, tail, points: toSvgPoints(subPath(edge.path, tail, end)) });
      if (head >= edge.length && !reached.has(edge.to)) reached.set(edge.to, color);
    }
  }

  // Event timestamps share requestAnimationFrame's time origin.
  const toggle = (id: string, time: number) => {
    setSelection((current) => {
      const next = new Map(current);
      const send = next.get(id);
      next.set(id, send && send.releasedAt === null ? { ...send, releasedAt: time } : { since: time, releasedAt: null });
      return next;
    });
  };
  const releaseAll = (time: number) => {
    setSelection((current) => {
      const next = new Map(current);
      for (const [id, send] of next) if (send.releasedAt === null) next.set(id, { ...send, releasedAt: time });
      return next;
    });
  };
  const change = (next: Partial<TopologyConfig>) => {
    setSelection(new Map());
    setConfig((current) => normalizeConfig({ ...current, ...next }));
  };
  const nextPhones = PHONE_PRESETS.find((preset) => preset > config.phones) ?? PHONE_PRESETS[0];

  return (
    <main className={styles.root}>
      <svg className={styles.svg} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} onClick={(event) => releaseAll(event.timeStamp)}>
        <rect
          x={VENUE.x0}
          y={VENUE.y0}
          width={VENUE.x1 - VENUE.x0}
          height={VENUE.y1 - VENUE.y0}
          className={styles.venue}
        />

        <g className={styles.wire}>
          {traces.map((points, index) => (
            <polyline key={index} points={points} />
          ))}
        </g>

        {flows.map(({ color, points, tail }, index) => (
          <g key={index}>
            <polyline points={points} className={styles.line} stroke={color} />
            <polyline
              points={points}
              className={styles.flow}
              stroke={color}
              // Keep dots anchored to the full trace while the tail drains it.
              style={{ "--tail": `${tail}px` } as CSSProperties}
            />
          </g>
        ))}

        {circuit.nodes.map((node) => {
          if (node.kind === "projection") return null;
          const send = selection.get(node.id);
          const sendColor = send && send.releasedAt === null ? colorOf(node.id, node.kind) : undefined;
          const receiveColor = reached.get(node.id);
          if (!sendColor && !receiveColor) return null;
          const center =
            node.kind === "speaker"
              ? { x: node.x, y: (node.rect.y0 + node.rect.y1) / 2, base: 16, reach: 72 }
              : node.kind === "phone"
                ? { x: node.x, y: node.y, base: node.height * 0.6, reach: node.height * 0.9 }
                : { x: node.x, y: node.y, base: NODE_R + 4, reach: 46 };
          const seconds = now / 1000;
          return (
            <g key={`rings-${node.id}`}>
              {sendColor ? <Rings {...center} color={sendColor} seconds={seconds} receiving={false} /> : null}
              {receiveColor ? <Rings {...center} color={receiveColor} seconds={seconds} receiving /> : null}
            </g>
          );
        })}

        {circuit.nodes.map((node) => {
          const send = selection.get(node.id);
          const color = send && send.releasedAt === null ? colorOf(node.id, node.kind) : reached.get(node.id);
          if (node.kind === "speaker" || node.kind === "projection") {
            return <Shape key={node.id} node={node} color={color} />;
          }
          return (
            <g
              key={node.id}
              className={styles.point}
              role="button"
              tabIndex={0}
              aria-label={node.label ?? node.id}
              aria-pressed={send !== undefined && send.releasedAt === null}
              onClick={(event) => {
                event.stopPropagation();
                toggle(node.id, event.timeStamp);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(node.id, event.timeStamp);
                }
              }}
            >
              <circle cx={node.x} cy={node.y} r={node.kind === "phone" ? Math.max(12, node.height * 0.7) : NODE_R + 6} className={styles.hit} />
              <Shape node={node} color={color} />
              {node.kind === "local" ? (
                <text x={node.x} y={node.y - NODE_R - 12} className={styles.label} textAnchor="middle">
                  {node.label}
                </text>
              ) : null}
              {node.kind === "remote" ? (
                <text x={node.x} y={node.y + NODE_R + 26} className={styles.label} textAnchor="middle">
                  {node.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <button
        type="button"
        className={`${styles.button} ${styles.toggle}`}
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen((open) => !open)}
      >
        {panelOpen ? "Close" : "Options"}
      </button>
      {panelOpen ? (
        <nav className={styles.panel} aria-label="Options">
          <Stepper label="Local" value={config.local} limits={LIMITS.local} onChange={(local) => change({ local })} />
          <Stepper label="Remote" value={config.remote} limits={LIMITS.remote} onChange={(remote) => change({ remote })} />
          <button type="button" className={styles.button} onClick={() => change({ phones: nextPhones })}>
            {config.phones} phones
          </button>
        </nav>
      ) : null}
    </main>
  );
}

function Stepper({ label, value, limits, onChange }: {
  label: string;
  value: number;
  limits: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <button type="button" className={styles.button} disabled={value <= limits.min} aria-label={`${label} −1`} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className={styles.value}>
        {label} {value}
      </span>
      <button type="button" className={styles.button} disabled={value >= limits.max} aria-label={`${label} +1`} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
