"use client";

import { useEffect, useMemo, useState } from "react";
import {
  joinPaths,
  pathLength,
  reversePath,
  slicePath,
  toSvgPoints,
  type Polyline,
} from "../1/model/path";
import {
  buildTopology,
  DEFAULT_CONFIG,
  LIMITS,
  normalizeConfig,
  VIEW,
  type SchematicNode,
  type Topology,
  type TopologyConfig,
} from "../1/model/topology";
import { Glyph } from "../1/view/glyphs";
import styles from "./schematic.module.css";

// Study 2: study 1's wiring. Select any number of senders; each keeps sending
// along the wires to the devices it affects. Speakers and the projection only receive.

/** Wire units per second, as in study 1. */
const SPEED = 240;
/** One colour per kind of sender; receivers take the colour of what reached them. */
const SENDER_COLOR: Partial<Record<SchematicNode["kind"], string>> = {
  local: "var(--schematic-local)",
  remote: "var(--schematic-remote)",
  phone: "var(--schematic-phone)",
};
const PHONE_PRESETS = [5, 24, 60, 100] as const;
const SHOWN = new Set<SchematicNode["kind"]>([
  "local",
  "remote",
  "phone",
  "pa",
  "projection",
]);

// Who affects whom, from the sources only:
// phone → projection (Sheet Part 3: faces → projection)
// local ↔ remote (Sheet Part 2: remote–local conversation)
// performer → speakers (NRF_June p.8: PA speakers)
function targetsOf(node: SchematicNode, topology: Topology): string[] {
  const speakers = ["pa-left", "pa-right"];
  const ids = (list: { id: string }[]) => list.map((entry) => entry.id);
  switch (node.kind) {
    case "phone":
      return ["projection"];
    case "remote":
      return [...ids(topology.locals), ...speakers];
    case "local":
      return [...ids(topology.remotes), ...speakers];
    default:
      return [];
  }
}

type Port = { hub: "mix" | "relay"; path: Polyline };

function portsOf(topology: Topology) {
  const ports = new Map<string, Port>(topology.ports);
  ports.set("pa-left", { hub: "mix", path: reversePath(topology.paFeeds[0]) });
  ports.set("pa-right", { hub: "mix", path: reversePath(topology.paFeeds[1]) });
  ports.set("projection", {
    hub: "relay",
    path: reversePath(topology.projectionFeed),
  });
  return ports;
}

function routeBetween(
  ports: Map<string, Port>,
  hubLink: Polyline,
  fromId: string,
  toId: string,
): Polyline {
  const from = ports.get(fromId);
  const to = ports.get(toId);
  if (!from || !to) return [];
  const bridge =
    from.hub === to.hub
      ? []
      : from.hub === "mix"
        ? hubLink
        : reversePath(hubLink);
  return joinPaths(from.path, bridge, reversePath(to.path));
}

function Shape({
  node,
  topology,
  color,
}: {
  node: SchematicNode;
  topology: Topology;
  color: string | undefined;
}) {
  const fill = color ?? "var(--schematic-field)";
  switch (node.kind) {
    case "projection": {
      const { x0, x1, y } = topology.projection;
      return (
        <rect
          x={x0 - node.x}
          y={y - node.y - 7}
          width={x1 - x0}
          height={14}
          className={styles.stroke}
          fill={fill}
        />
      );
    }
    case "pa":
      return (
        <rect
          x={-12}
          y={-12}
          width={24}
          height={24}
          className={styles.stroke}
          fill={fill}
        />
      );
    case "phone":
      return (
        <rect
          x={-node.width / 2}
          y={-node.height / 2}
          width={node.width}
          height={node.height}
          rx={2}
          className={styles.stroke}
          fill={fill}
        />
      );
    default:
      return (
        <circle
          r={19}
          className={node.kind === "remote" ? styles.dashed : styles.stroke}
          fill={fill}
        />
      );
  }
}

export default function SchematicStudy2() {
  const [config, setConfig] = useState<TopologyConfig>(DEFAULT_CONFIG);
  /** Selected sender id → time it was selected. */
  const [selection, setSelection] = useState<ReadonlyMap<string, number>>(new Map());
  const [now, setNow] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);

  const topology = useMemo(() => buildTopology(config), [config]);
  const ports = useMemo(() => portsOf(topology), [topology]);
  const nodes = topology.nodes.filter((node) => SHOWN.has(node.kind));
  const wiring = useMemo(
    () =>
      [
        ...Array.from(ports.values(), (port) => port.path),
        topology.hubLink,
      ].map(toSvgPoints),
    [ports, topology],
  );
  // Each wavefront leaves its sender and travels along the wires; a receiver
  // turns on only when a front reaches it.
  const hasSelection = selection.size > 0;
  useEffect(() => {
    if (!hasSelection) return;
    let frame = 0;
    const tick = (time: number) => {
      setNow(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hasSelection]);

  const routes = useMemo(
    () =>
      Array.from(selection, ([senderId, since]) => {
        const sender = topology.byId.get(senderId);
        if (!sender) return [];
        return targetsOf(sender, topology).map((id) => {
          const path = routeBetween(ports, topology.hubLink, senderId, id);
          return { id, since, color: SENDER_COLOR[sender.kind], path, length: pathLength(path) };
        });
      }).flat(),
    [ports, selection, topology],
  );
  const fronts = routes.map((route) => ({
    ...route,
    front: Math.max(0, ((now - route.since) / 1000) * SPEED),
  }));
  const flows = fronts
    .filter((route) => route.front > 0)
    .map((route) => ({
      color: route.color,
      points: toSvgPoints(route.front >= route.length ? route.path : slicePath(route.path, route.front)),
    }));
  const reached = new Map<string, string | undefined>();
  for (const route of fronts) {
    if (route.front >= route.length && !reached.has(route.id)) reached.set(route.id, route.color);
  }

  const toggle = (id: string) => {
    const since = performance.now();
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else next.set(id, since);
      return next;
    });
  };
  const change = (next: Partial<TopologyConfig>) =>
    setConfig((current) => normalizeConfig({ ...current, ...next }));
  const nextPhones =
    PHONE_PRESETS.find((preset) => preset > config.phones) ?? PHONE_PRESETS[0];
  const hubs = topology.nodes.filter(
    (node) => node.kind === "mix" || node.kind === "relay",
  );

  return (
    <main className={styles.root}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        onClick={() => setSelection(new Map())}
      >
        <rect
          x={topology.venue.x0}
          y={topology.venue.y0}
          width={topology.venue.x1 - topology.venue.x0}
          height={topology.venue.y1 - topology.venue.y0}
          className={styles.venue}
        />

        <g className={styles.wire}>
          {wiring.map((points, index) => (
            <polyline key={index} points={points} />
          ))}
        </g>
        <g className={styles.junction}>
          {topology.junctions.map(([x, y], index) => (
            <circle key={index} cx={x} cy={y} r={4} />
          ))}
        </g>

        {flows.map(({ color, points }, index) => (
          <g key={index}>
            <polyline points={points} className={styles.line} stroke={color} />
            <polyline points={points} className={styles.flow} stroke={color} />
          </g>
        ))}

        {hubs.map((node) => (
          <Glyph key={node.id} node={node} state={{ sounding: 0, lit: 0 }} />
        ))}

        {nodes.map((node) => {
          const sender = targetsOf(node, topology).length > 0;
          const color = selection.has(node.id) ? SENDER_COLOR[node.kind] : reached.get(node.id);
          const shape = (
            <Shape node={node} topology={topology} color={color} />
          );
          if (!sender) {
            return (
              <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                {shape}
              </g>
            );
          }
          return (
            <g
              key={node.id}
              transform={`translate(${node.x} ${node.y})`}
              className={styles.point}
              role="button"
              tabIndex={0}
              aria-label={node.label}
              aria-pressed={selection.has(node.id)}
              onClick={(event) => {
                event.stopPropagation();
                toggle(node.id);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggle(node.id);
                }
              }}
            >
              <circle r={22} className={styles.hit} />
              {shape}
              {node.kind === "local" || node.kind === "remote" ? (
                <text y={44} className={styles.label} textAnchor="middle">
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
          <Stepper
            label="Local"
            value={config.local}
            limits={LIMITS.local}
            onChange={(local) => change({ local })}
          />
          <Stepper
            label="Remote"
            value={config.remote}
            limits={LIMITS.remote}
            onChange={(remote) => change({ remote })}
          />
          <button
            type="button"
            className={styles.button}
            onClick={() => change({ phones: nextPhones })}
          >
            {config.phones} phones
          </button>
        </nav>
      ) : null}
    </main>
  );
}

function Stepper({
  label,
  value,
  limits,
  onChange,
}: {
  label: string;
  value: number;
  limits: { min: number; max: number };
  onChange: (value: number) => void;
}) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        disabled={value <= limits.min}
        aria-label={`${label} −1`}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <span className={styles.value}>
        {label} {value}
      </span>
      <button
        type="button"
        className={styles.button}
        disabled={value >= limits.max}
        aria-label={`${label} +1`}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
