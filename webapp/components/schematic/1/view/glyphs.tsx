import type { PhoneNode, RemoteNode, SchematicNode } from "../model/topology";
import styles from "../schematic.module.css";

// Schematic symbols. Each glyph is drawn around its node's (x, y) and only
// reads two states from the score: sounding (copper) and lit (water).

type GlyphState = { sounding: number; lit: number };

function fillFor({ sounding, lit }: GlyphState) {
  if (sounding > 0.02) return { fill: "var(--schematic-sound)", fillOpacity: 0.25 + 0.75 * sounding };
  if (lit > 0.02) return { fill: "var(--schematic-signal)", fillOpacity: 0.2 + 0.8 * lit };
  return { fill: "var(--schematic-field)", fillOpacity: 1 };
}

const WAVE = "m -10 0 c 3.5 -9 6.5 -9 10 0 s 6.5 9 10 0";

function Source({ node, dashed, state }: { node: SchematicNode; dashed: boolean; state: GlyphState }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <circle r={19} className={dashed ? styles.strokeDashed : styles.stroke} {...fillFor(state)} />
      <path d={WAVE} className={styles.strokeThin} fill="none" />
      <text y={44} className={styles.label} textAnchor="middle">
        {node.label}
      </text>
    </g>
  );
}

function DelayLine({ remote }: { remote: RemoteNode }) {
  const { x0, x1, turns } = remote.coil;
  const width = (x1 - x0) / turns;
  const loops = Array.from({ length: turns }, () => `a ${width / 2} ${width / 2} 0 0 1 ${width} 0`).join(" ");
  const textX = (x0 + x1) / 2;
  return (
    <g>
      <rect x={x0 + 1} y={remote.y - 3} width={x1 - x0 - 2} height={6} fill="var(--schematic-field)" />
      <path d={`M ${x0} ${remote.y} ${loops}`} className={styles.wire} fill="none" />
      <text x={textX} y={remote.y + 30} className={styles.label} textAnchor="middle">
        {remote.latencyMs} ms
      </text>
    </g>
  );
}

function Speaker({ node, state }: { node: SchematicNode; state: GlyphState }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect x={-7} y={-16} width={14} height={11} className={styles.stroke} {...fillFor(state)} />
      <path d="M -7 -5 L -15 12 L 15 12 L 7 -5 Z" className={styles.stroke} {...fillFor(state)} />
    </g>
  );
}

function Mix({ node, state }: { node: SchematicNode; state: GlyphState }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <circle r={17} className={styles.stroke} {...fillFor(state)} />
      <path d="M -12 -12 L 12 12 M 12 -12 L -12 12" className={styles.strokeThin} />
      <text x={28} y={-14} className={styles.label}>
        {node.label}
      </text>
    </g>
  );
}

function Relay({ node, state }: { node: SchematicNode; state: GlyphState }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect x={-16} y={-16} width={32} height={32} className={styles.stroke} {...fillFor(state)} />
      <path d="M -16 -16 L 16 16 M 16 -16 L -16 16" className={styles.strokeThin} />
      <text x={28} y={-14} className={styles.label}>
        {node.label}
      </text>
    </g>
  );
}

function Admin({ node, state }: { node: SchematicNode; state: GlyphState }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect x={-22} y={-17} width={44} height={28} className={styles.stroke} {...fillFor(state)} />
      <path d="M -28 15 L 28 15" className={styles.stroke} />
      <text y={44} className={styles.label} textAnchor="middle">
        {node.label}
      </text>
    </g>
  );
}

function Frame({ node, state }: { node: SchematicNode; state: GlyphState }) {
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect x={-6} y={-24} width={12} height={48} className={styles.strokeDashed} {...fillFor(state)} />
    </g>
  );
}

function Phone({ node, state }: { node: PhoneNode; state: GlyphState }) {
  const { width, height } = node;
  return (
    <g transform={`translate(${node.x} ${node.y})`}>
      <rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx={Math.min(3, width * 0.2)}
        className={styles.strokeThin}
        {...fillFor(state)}
      />
    </g>
  );
}

export function Glyph({ node, state }: { node: SchematicNode; state: GlyphState }) {
  switch (node.kind) {
    case "local":
      return <Source node={node} dashed={false} state={state} />;
    case "remote":
      return (
        <>
          <DelayLine remote={node} />
          <Source node={node} dashed state={state} />
        </>
      );
    case "pa":
      return <Speaker node={node} state={state} />;
    case "mix":
      return <Mix node={node} state={state} />;
    case "relay":
      return <Relay node={node} state={state} />;
    case "admin":
      return <Admin node={node} state={state} />;
    case "frame":
      return <Frame node={node} state={state} />;
    case "phone":
      return <Phone node={node} state={state} />;
    case "projection":
      return null;
  }
}
