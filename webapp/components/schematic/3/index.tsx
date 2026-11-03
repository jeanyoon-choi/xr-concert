"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { toSvgPoints } from "../1/model/path";
import {
  buildSheet,
  DEFAULT_CONFIG,
  LIMITS,
  normalizeConfig,
  VIEW,
  type Mark,
  type NodeShape,
  type SheetConfig,
  type SheetNode,
} from "./sheet";
import styles from "./schematic.module.css";

/** Wire units per second. */
const SPEED = 640;
const RINGS = 2;
/** One family per kind of sender, one shade per sender; receivers take the
 * colour of what reached them. */
const SHADES: Record<string, readonly string[]> = {
  local: ["#c46a3e", "#dc8a52", "#a8522c", "#e6a273", "#b86446"],
  remote: ["#c9a640", "#e0c062", "#a98a2c", "#ecd389"],
  phone: ["#5f9aa2"],
  laptop: ["#e4dcc4"],
};

function colorOf(id: string, kind: string | undefined) {
  const shades = kind ? SHADES[kind] : undefined;
  if (!shades) return "#f2f0e7";
  const index = Number(id.slice(id.lastIndexOf("-") + 1)) - 1;
  return shades[Number.isFinite(index) ? index % shades.length : 0];
}

type Send = { since: number; releasedAt: number | null };

// ── Static drawing: rendered once per configuration ────────────────────────
function MarkView({ mark }: { mark: Mark }) {
  const layer = styles[mark.layer];
  switch (mark.kind) {
    case "wire":
      return (
        <polyline
          points={toSvgPoints(mark.points)}
          className={`${styles.wire} ${layer} ${mark.bus ? styles.bus : ""} ${mark.dashed ? styles.dashedWire : ""}`}
        />
      );
    case "rect":
      return (
        <rect
          x={mark.x}
          y={mark.y}
          width={mark.w}
          height={mark.h}
          className={`${styles.outline} ${layer} ${mark.dashed ? styles.dashedWire : ""}`}
        />
      );
    case "circle":
      return <circle cx={mark.x} cy={mark.y} r={mark.r} className={`${styles.outline} ${layer}`} />;
    case "shape":
      return <polygon points={toSvgPoints(mark.points)} className={`${styles.outline} ${layer}`} />;
    case "dot":
      return <circle cx={mark.x} cy={mark.y} r={2} className={`${styles.dot} ${layer}`} />;
    case "text":
      return (
        <text
          x={mark.x}
          y={mark.y}
          fontSize={mark.size}
          textAnchor={mark.anchor ?? "start"}
          transform={mark.vertical ? `rotate(-90 ${mark.x} ${mark.y})` : undefined}
          className={`${styles.text} ${layer} ${mark.strong ? styles.strong : ""}`}
        >
          {mark.text}
        </text>
      );
  }
}

const Drawing = memo(function Drawing({ marks }: { marks: readonly Mark[] }) {
  return (
    <g>
      {marks.map((mark, index) => (
        <MarkView key={index} mark={mark} />
      ))}
    </g>
  );
});

function ShapeView({ shape, className, fill }: { shape: NodeShape; className: string; fill?: string }) {
  return shape.type === "circle" ? (
    <circle cx={shape.x} cy={shape.y} r={shape.r} fill={fill} className={`${className} ${shape.dashed ? styles.dashed : ""}`} />
  ) : (
    <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} fill={fill} className={className} />
  );
}

/** Ring circles whose radius and opacity the animation loop sets directly. */
function RingSet({ node, color, receiving, register }: {
  node: SheetNode;
  color?: string;
  receiving: boolean;
  register: (element: SVGGElement | null) => void;
}) {
  if (!node.ring) return null;
  return (
    <g ref={register} className={receiving ? styles.ringsIn : styles.rings} stroke={color} visibility={receiving ? "hidden" : undefined}>
      {Array.from({ length: RINGS }, (_, index) => (
        <circle key={index} cx={node.ring!.x} cy={node.ring!.y} r={node.ring!.base} />
      ))}
    </g>
  );
}

export default function SchematicStudy3() {
  const [config, setConfig] = useState<SheetConfig>(DEFAULT_CONFIG);
  /** Sender id → when it was selected and, once deselected, when it was
   * released. Any number at once. Changes only on input, never per frame. */
  const [selection, setSelection] = useState<ReadonlyMap<string, Send>>(new Map());
  const [panelOpen, setPanelOpen] = useState(false);

  const sheet = useMemo(() => buildSheet(config), [config]);
  const nodeById = useMemo(() => new Map(sheet.nodes.map((node) => [node.id, node])), [sheet]);
  const longest = useMemo(() => Math.max(0, ...sheet.routes.map((route) => route.length)), [sheet]);
  /** Every route's points, computed once per configuration. */
  const routePoints = useMemo(() => sheet.routes.map((route) => toSvgPoints(route.path)), [sheet]);

  // Routes and receivers in play for the current selection.
  const live = useMemo(() => {
    const routes = sheet.routes
      .map((route, index) => ({ route, index }))
      .filter(({ route }) => selection.has(route.from));
    const receivers = [...new Set(routes.map(({ route }) => route.to))]
      .map((id) => nodeById.get(id))
      .filter((node): node is SheetNode => node !== undefined);
    return { routes, receivers };
  }, [sheet, selection, nodeById]);

  // Elements the loop writes to, keyed by route index or node id.
  // Stable registries, filled by ref callbacks and read only by the loop.
  const [routeRefs] = useState(() => new Map<number, SVGPolylineElement>());
  const [sendRefs] = useState(() => new Map<string, SVGGElement>());
  const [receiveRefs] = useState(() => new Map<string, SVGGElement>());
  const [fillRefs] = useState(() => new Map<string, SVGElement>());
  const selectionRef = useRef(selection);
  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const hasSelection = selection.size > 0;
  useEffect(() => {
    if (!hasSelection) return;
    let frame = 0;
    const tick = (time: number) => {
      const current = selectionRef.current;
      const reached = new Map<string, string>();

      for (const { route, index } of live.routes) {
        const element = routeRefs.get(index);
        const send = current.get(route.from);
        if (!element || !send) continue;
        const head = Math.max(0, ((time - send.since) / 1000) * SPEED);
        const tail = send.releasedAt === null ? 0 : Math.max(0, ((time - send.releasedAt) / 1000) * SPEED);
        const end = Math.min(head, route.length);
        const visible = end - tail;
        // Reveal [tail, end] of the full route with one dash.
        element.setAttribute("stroke-dasharray", visible > 0 ? `0 ${tail} ${visible} ${route.length + 1}` : `0 ${route.length + 1}`);
        if (head >= route.length && tail < route.length && !reached.has(route.to)) {
          reached.set(route.to, colorOf(route.from, nodeById.get(route.from)?.kind));
        }
      }

      const seconds = time / 1000;
      const placeRings = (group: SVGGElement, node: SheetNode, inward: boolean) => {
        const ring = node.ring!;
        const circles = group.children;
        for (let index = 0; index < circles.length; index += 1) {
          const phase = (seconds * 0.9 + index / RINGS) % 1;
          const distance = inward ? 1 - phase : phase;
          circles[index].setAttribute("r", String(ring.base + distance * ring.reach));
          circles[index].setAttribute("stroke-opacity", String((1 - distance) * 0.8));
        }
      };
      for (const [id, group] of sendRefs) {
        const node = nodeById.get(id);
        if (node) placeRings(group, node, false);
      }
      for (const [id, group] of receiveRefs) {
        const node = nodeById.get(id);
        const color = reached.get(id);
        if (!node) continue;
        if (color) {
          group.setAttribute("visibility", "visible");
          group.setAttribute("stroke", color);
          placeRings(group, node, true);
        } else {
          group.setAttribute("visibility", "hidden");
        }
      }
      for (const [id, element] of fillRefs) {
        const color = reached.get(id);
        if (color) {
          element.setAttribute("fill", color);
          element.setAttribute("visibility", "visible");
        } else {
          element.setAttribute("visibility", "hidden");
        }
      }

      // Drop released senders once their tail has drained every route.
      const drained = [...current].filter(
        ([, send]) => send.releasedAt !== null && ((time - send.releasedAt) / 1000) * SPEED > longest,
      );
      if (drained.length > 0) {
        setSelection((previous) => {
          const next = new Map(previous);
          for (const [id] of drained) next.delete(id);
          return next;
        });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasSelection, live, longest, nodeById, routeRefs, sendRefs, receiveRefs, fillRefs]);

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
  const change = (next: Partial<SheetConfig>) => {
    setSelection(new Map());
    setConfig((current) => normalizeConfig({ ...current, ...next }));
  };

  const register = <K, T>(map: Map<K, T>, key: K) => (element: T | null) => {
    if (element) map.set(key, element);
    else map.delete(key);
  };
  const isSending = (id: string) => {
    const send = selection.get(id);
    return send !== undefined && send.releasedAt === null;
  };

  return (
    <main className={styles.root}>
      <svg className={styles.svg} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} onClick={(event) => releaseAll(event.timeStamp)}>
        <Drawing marks={sheet.marks} />

        <g className={styles.live}>
          {live.routes.map(({ route, index }) => (
            <polyline
              key={index}
              ref={register(routeRefs, index)}
              points={routePoints[index]}
              className={styles.line}
              stroke={colorOf(route.from, nodeById.get(route.from)?.kind)}
              strokeDasharray={`0 ${route.length + 1}`}
            />
          ))}

          {[...selection.keys()].filter(isSending).map((id) => {
            const node = nodeById.get(id);
            return node ? (
              <RingSet
                key={`send-${id}`}
                node={node}
                color={colorOf(id, node.kind)}
                receiving={false}
                register={register(sendRefs, id)}
              />
            ) : null;
          })}
          {live.receivers.map((node) => (
            <RingSet
              key={`receive-${node.id}`}
              node={node}
              receiving
              register={register(receiveRefs, node.id)}
            />
          ))}
        </g>

        {sheet.nodes.map((node) => {
          const sending = isSending(node.id);
          const fill = sending ? colorOf(node.id, node.kind) : node.kind === "laptop" ? "none" : "var(--schematic-field)";
          const body = (
            <>
              <ShapeView shape={node.shape} fill={fill} className={styles.stroke} />
              {live.receivers.includes(node) && !sending ? (
                <g ref={register(fillRefs, node.id)} visibility="hidden">
                  <ShapeView shape={node.shape} className={styles.stroke} />
                </g>
              ) : null}
            </>
          );
          if (!node.sender) return <g key={node.id}>{body}</g>;
          return (
            <g
              key={node.id}
              className={styles.point}
              role="button"
              tabIndex={0}
              aria-label={node.label}
              aria-pressed={sending}
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
              <ShapeView shape={node.hit} fill="transparent" className={styles.hit} />
              {body}
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
          <Stepper label="Phones" value={config.phones} limits={LIMITS.phones} onChange={(phones) => change({ phones })} />
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
