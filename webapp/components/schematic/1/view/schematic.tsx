import { useMemo } from "react";
import { pathLength, pointAt, slicePath, toSvgPoints, type Polyline } from "../model/path";
import { FLOW_SPEED, PARTS, type Activity, type Flow, type PartKey } from "../model/score";
import { VIEW, type Topology } from "../model/topology";
import styles from "../schematic.module.css";
import { Glyph } from "./glyphs";

const DOT_SPACING = 30;

type SchematicProps = {
  topology: Topology;
  activity: Activity;
  part: PartKey;
  /** Seconds since the part began; drives wavefronts. */
  t: number;
  /** Seconds since mount; drives dot and ring rhythm independent of parts. */
  clock: number;
  reducedMotion: boolean;
};

function toneClass(tone: Flow["tone"]) {
  return tone === "sound" ? styles.sound : styles.signal;
}

function FlowLine({ flow, t, clock, reducedMotion }: { flow: Flow; t: number; clock: number; reducedMotion: boolean }) {
  const length = pathLength(flow.path);
  const front = reducedMotion ? length : (t - flow.since) * FLOW_SPEED;
  if (front <= 0) return null;
  const visible = front >= length ? flow.path : slicePath(flow.path, front);
  const phase = reducedMotion ? 0 : (clock * FLOW_SPEED) % DOT_SPACING;
  // Dots sit at s = k·spacing − offset. Anchoring to the end makes every
  // flow converging on the same hub share dot positions on the shared trunk.
  const offset = flow.anchor === "start" ? -phase : phase - length;
  const points = toSvgPoints(visible);
  return (
    <g className={toneClass(flow.tone)}>
      <polyline points={points} className={styles.flowLine} />
      <polyline
        points={points}
        className={styles.flowDots}
        strokeDasharray={`0 ${DOT_SPACING}`}
        strokeDashoffset={offset}
      />
    </g>
  );
}

function PacketTrail({ path, tone, progress }: { path: Polyline; tone: Flow["tone"]; progress: number }) {
  const length = pathLength(path);
  if (length === 0) return null;
  const head = pointAt(path, progress * length);
  return (
    <g className={toneClass(tone)}>
      <polyline points={toSvgPoints(slicePath(path, progress * length))} className={styles.packetTrail} />
      {progress < 1 ? <circle cx={head[0]} cy={head[1]} r={8} className={styles.packetHead} /> : null}
    </g>
  );
}

function Rings({ x, y, level, base, reach, count, clock, reducedMotion }: {
  x: number;
  y: number;
  level: number;
  base: number;
  reach: number;
  count: number;
  clock: number;
  reducedMotion: boolean;
}) {
  return (
    <g className={styles.rings}>
      {Array.from({ length: count }, (_, index) => {
        const phase = reducedMotion ? (index + 1) / (count + 1) : (clock * 0.9 + index / count) % 1;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={base + phase * reach}
            strokeOpacity={level * (1 - phase) * 0.9}
          />
        );
      })}
    </g>
  );
}

export function Schematic({ topology, activity, part, t, clock, reducedMotion }: SchematicProps) {
  const { venue, stage, projection } = topology;

  // Idle wiring is static for a given topology; draw it once per layout.
  const wiring = useMemo(() => {
    const paths: Polyline[] = [
      ...Array.from(topology.ports.values(), (port) => port.path),
      ...topology.remoteVideo.values(),
      ...topology.paFeeds,
      topology.hubLink,
      topology.adminLink,
      topology.projectionFeed,
    ];
    return paths.map((path) => toSvgPoints(path));
  }, [topology]);

  const projectionLit = activity.lit.get("projection") ?? 0;
  const partInfo = PARTS.find((entry) => entry.key === part) ?? PARTS[0];

  return (
    <svg
      className={styles.svg}
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Concert schematic, part ${partInfo.key}: ${partInfo.title}`}
    >
      <rect width={VIEW.width} height={VIEW.height} fill="var(--schematic-field)" />

      <rect
        x={venue.x0}
        y={venue.y0}
        width={venue.x1 - venue.x0}
        height={venue.y1 - venue.y0}
        className={styles.boundary}
      />
      <rect
        x={stage.x0}
        y={stage.y0}
        width={stage.x1 - stage.x0}
        height={stage.y1 - stage.y0}
        className={styles.stage}
      />
      <g className={styles.wires}>
        {wiring.map((points, index) => (
          <polyline key={index} points={points} />
        ))}
      </g>
      <g className={styles.junctions}>
        {topology.junctions.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={4} />
        ))}
      </g>

      <g>
        <rect
          x={projection.x0}
          y={projection.y - 7}
          width={projection.x1 - projection.x0}
          height={14}
          className={styles.stroke}
          fill={projectionLit > 0.02 ? "var(--schematic-signal)" : "var(--schematic-field)"}
          fillOpacity={projectionLit > 0.02 ? 0.2 + 0.8 * projectionLit : 1}
        />
        <text x={(projection.x0 + projection.x1) / 2} y={projection.y - 20} className={styles.label} textAnchor="middle">
          Projection
        </text>
      </g>

      {activity.flows.map((flow, index) => (
        <FlowLine key={index} flow={flow} t={t} clock={clock} reducedMotion={reducedMotion} />
      ))}
      {activity.packets.map((packet, index) => (
        <PacketTrail key={index} {...packet} />
      ))}

      {topology.nodes.map((node) => {
        const sounding = activity.sounding.get(node.id) ?? 0;
        const isPhone = node.kind === "phone";
        const isPa = node.kind === "pa";
        return (
          <g key={node.id}>
            {sounding > 0.02 ? (
              <Rings
                x={node.x}
                y={isPa ? node.y + 4 : node.y}
                level={sounding}
                base={isPhone ? node.height * 0.6 : isPa ? 22 : 24}
                reach={isPhone ? node.height * 0.9 : isPa ? 140 : 46}
                count={isPhone ? 2 : isPa ? 4 : 3}
                clock={clock}
                reducedMotion={reducedMotion}
              />
            ) : null}
            <Glyph node={node} state={{ sounding, lit: activity.lit.get(node.id) ?? 0 }} />
          </g>
        );
      })}

    </svg>
  );
}
