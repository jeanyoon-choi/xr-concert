import { pathLength, type Polyline } from "../1/model/path";
import { normalizeConfig, type TopologyConfig } from "../1/model/topology";

// Study 2: one dedicated trace per (sender → receiver), wired directly like a
// printed schematic. Every trace is visible at rest.
//
// Who affects whom, from the sources only:
// phone → projection           (Sheet Part 3: faces → projection)
// local ↔ remote               (Sheet Part 2: remote–local conversation)
// local / remote → speakers    (NRF_June p.8: PA speakers)

export const VIEW = { width: 1600, height: 900 } as const;

export type Rect = { x0: number; x1: number; y0: number; y1: number };
export const VENUE: Rect = { x0: 250, x1: 1350, y0: 30, y1: 870 };
export const PROJECTION: Rect = { x0: 392, x1: 1208, y0: 50, y1: 62 };
export const NODE_R = 22;

const SPEAKER = { y0: 80, y1: 100 };
/** Left corridor between the venue wall and the stage; the right one is mirrored. */
const CORRIDOR = { outer: 262, inner: 384 };
/** Horizontal lanes below the performers, stacked from the top. */
const BAND = { top: 240, bottom: 400 };
/** Horizontal lanes above the audience, stacked from the bottom, and the
 * projection columns they turn into. */
const PHONE_BAND = { top: 414, bottom: 482 };
const PROJECTION_COLUMNS = { outer: 400, inner: 474 };
const PHONES = { x0: 480, x1: 1120, y0: 500, y1: 860 };
const PITCH = 8;

export type CircuitNode =
  | { id: string; kind: "local" | "remote"; label: string; x: number; y: number }
  | { id: string; kind: "phone"; label: string; x: number; y: number; width: number; height: number }
  | { id: string; kind: "speaker" | "projection"; label: null; x: number; y: number; rect: Rect };

export type Edge = { from: string; to: string; path: Polyline; length: number };

export type Circuit = {
  config: TopologyConfig;
  nodes: CircuitNode[];
  edges: Edge[];
  edgesFrom: ReadonlyMap<string, Edge[]>;
};

type Side = -1 | 1;
type Local = { id: string; x: number; y: number };
type Remote = { id: string; x: number; y: number; side: Side };

type Trace = {
  from: string;
  to: string;
  kind: "local-remote" | "remote-local" | "local-speaker" | "remote-speaker" | "remote-speaker-across";
  local?: Local;
  remote?: Remote;
  speakerSide?: Side;
  lane?: number;
  column?: number;
  targetColumn?: number;
  pinX?: number;
  pinY?: number;
  localX?: number;
  localY?: number;
};

const mirror = (x: number, side: Side) => (side < 0 ? x : VIEW.width - x);
const speakerId = (side: Side) => (side < 0 ? "speaker-left" : "speaker-right");
/** Fixed pitch, tightened only when a bundle would overflow its span. */
const pitchFor = (count: number, span: number, pitch = PITCH) => (count <= 1 ? 0 : Math.min(pitch, span / (count - 1)));

export function buildCircuit(input: Partial<TopologyConfig>): Circuit {
  const config = normalizeConfig(input);

  const locals: (Local & { label: string })[] = Array.from({ length: config.local }, (_, index) => ({
    id: `local-${index + 1}`,
    label: `Performer ${index + 1}`,
    x: 520 + ((index + 0.5) * 560) / config.local,
    y: 190,
  }));
  const remotes: (Remote & { label: string })[] = Array.from({ length: config.remote }, (_, index) => {
    const side: Side = index % 2 === 0 ? -1 : 1;
    return {
      id: `remote-${index + 1}`,
      label: `Remote performer ${index + 1}`,
      x: mirror(112, side),
      y: 170 + Math.floor(index / 2) * 124,
      side,
    };
  });
  /** Locals nearest a side first. */
  const nearest = (side: Side) => [...locals].sort((a, b) => side * (b.x - a.x));

  // Band rows, top to bottom: the speaker bundle, then one bundle per remote.
  // Inside a bundle the nearest performer takes the highest lane, so drops
  // from the stage never cross their own bundle.
  const rows: Trace[] = [];
  for (const side of [-1, 1] as const) {
    for (const local of nearest(side)) {
      rows.push({ from: local.id, to: speakerId(side), kind: "local-speaker", local, speakerSide: side });
    }
  }
  for (const remote of remotes) {
    const other: Side = remote.side < 0 ? 1 : -1;
    rows.push({ from: remote.id, to: speakerId(other), kind: "remote-speaker-across", remote, speakerSide: other });
  }
  for (const remote of remotes) {
    for (const local of nearest(remote.side)) {
      rows.push({ from: local.id, to: remote.id, kind: "local-remote", local, remote });
      rows.push({ from: remote.id, to: local.id, kind: "remote-local", local, remote });
    }
  }
  const bandPitch = pitchFor(rows.length, BAND.bottom - BAND.top);
  const bandStart = (BAND.top + BAND.bottom) / 2 - ((rows.length - 1) * bandPitch) / 2;
  rows.forEach((trace, index) => {
    trace.lane = bandStart + index * bandPitch;
  });
  const traces: Trace[] = [
    ...rows,
    ...remotes.map((remote): Trace => ({
      from: remote.id,
      to: speakerId(remote.side),
      kind: "remote-speaker",
      remote,
      speakerSide: remote.side,
    })),
  ];

  // Corridor columns per side, outermost first; a lower lane takes an outer
  // column so the L-shapes nest.
  for (const side of [-1, 1] as const) {
    const byLaneDown = (a: Trace, b: Trace) => (b.lane ?? 0) - (a.lane ?? 0);
    const bySlotDown = (a: Trace, b: Trace) => (b.remote?.y ?? 0) - (a.remote?.y ?? 0);
    const onSide = (t: Trace) => t.remote?.side === side;
    const columns: { trace: Trace; target: boolean }[] = [
      ...traces
        .filter((t) => (t.kind === "local-remote" || t.kind === "remote-local") && onSide(t))
        .sort((a, b) => bySlotDown(a, b) || byLaneDown(a, b))
        .map((trace) => ({ trace, target: false })),
      ...traces.filter((t) => t.kind === "remote-speaker-across" && onSide(t)).sort(byLaneDown).map((trace) => ({ trace, target: false })),
      ...traces
        .filter((t) => t.kind === "remote-speaker-across" && t.speakerSide === side)
        .sort(byLaneDown)
        .map((trace) => ({ trace, target: true })),
      ...traces.filter((t) => t.kind === "local-speaker" && t.speakerSide === side).sort(byLaneDown).map((trace) => ({ trace, target: false })),
      ...traces.filter((t) => t.kind === "remote-speaker" && onSide(t)).sort(bySlotDown).map((trace) => ({ trace, target: false })),
    ];
    const pitch = pitchFor(columns.length, CORRIDOR.inner - CORRIDOR.outer);
    columns.forEach(({ trace, target }, rank) => {
      const x = mirror(CORRIDOR.inner - (columns.length - 1 - rank) * pitch, side);
      if (target) trace.targetColumn = x;
      else trace.column = x;
    });
  }

  // Remote pins: the outermost column leaves lowest, at a fixed pitch.
  for (const remote of remotes) {
    const own = traces
      .filter((t) => t.remote === remote && t.column !== undefined)
      .sort((a, b) => side(remote) * ((a.column ?? 0) - (b.column ?? 0)));
    const pitch = pitchFor(own.length, 2 * (NODE_R - 6), 7);
    own.forEach((trace, index) => {
      const offset = ((own.length - 1) / 2 - index) * pitch;
      trace.pinY = remote.y + offset;
      trace.pinX = remote.x - remote.side * Math.sqrt(NODE_R ** 2 - offset ** 2);
    });
  }

  // Local pins at a fixed pitch: left-going on the left with deeper lanes
  // toward the centre, right-going mirrored.
  for (const local of locals) {
    const own = traces.filter((t) => t.local === local);
    const sideOf = (t: Trace) => (t.remote ? t.remote.side : (t.speakerSide ?? -1));
    const ordered = [
      ...own.filter((t) => sideOf(t) < 0).sort((a, b) => (a.lane ?? 0) - (b.lane ?? 0)),
      ...own.filter((t) => sideOf(t) > 0).sort((a, b) => (b.lane ?? 0) - (a.lane ?? 0)),
    ];
    const pitch = pitchFor(ordered.length, 2 * (NODE_R - 4), 6);
    ordered.forEach((trace, index) => {
      const offset = (index - (ordered.length - 1) / 2) * pitch;
      trace.localX = local.x + offset;
      trace.localY = local.y + Math.sqrt(NODE_R ** 2 - offset ** 2);
    });
  }

  const edges: Edge[] = [];
  const speakerLanes = new Map<string, number[]>();
  const addSpeakerLane = (side: Side, x: number) =>
    speakerLanes.set(speakerId(side), [...(speakerLanes.get(speakerId(side)) ?? []), x]);
  const add = (from: string, to: string, path: Polyline) => edges.push({ from, to, path, length: pathLength(path) });

  for (const t of traces) {
    const { localX = 0, localY = 0, lane = 0, column = 0, pinX = 0, pinY = 0 } = t;
    switch (t.kind) {
      case "local-remote":
      case "remote-local": {
        const path: Polyline = [
          [localX, localY],
          [localX, lane],
          [column, lane],
          [column, pinY],
          [pinX, pinY],
        ];
        add(t.from, t.to, t.kind === "local-remote" ? path : [...path].reverse());
        break;
      }
      case "local-speaker":
        addSpeakerLane(t.speakerSide ?? -1, column);
        add(t.from, t.to, [
          [localX, localY],
          [localX, lane],
          [column, lane],
          [column, SPEAKER.y1],
        ]);
        break;
      case "remote-speaker":
        addSpeakerLane(t.speakerSide ?? -1, column);
        add(t.from, t.to, [
          [pinX, pinY],
          [column, pinY],
          [column, SPEAKER.y1],
        ]);
        break;
      case "remote-speaker-across": {
        const target = t.targetColumn ?? 0;
        addSpeakerLane(t.speakerSide ?? -1, target);
        add(t.from, t.to, [
          [pinX, pinY],
          [column, pinY],
          [column, lane],
          [target, lane],
          [target, SPEAKER.y1],
        ]);
        break;
      }
    }
  }

  // Phones: each owns a lane in the gap to its right (top row nearest), rises
  // to its own band lane and turns outward to its own projection column.
  const columns = Math.max(1, Math.ceil(Math.sqrt((config.phones * (PHONES.x1 - PHONES.x0)) / (PHONES.y1 - PHONES.y0))));
  const rows2 = Math.ceil(config.phones / columns);
  
  const dx = (PHONES.x1 - PHONES.x0) / columns;
  const dy = (PHONES.y1 - PHONES.y0) / rows2;
  const phoneHeight = Math.min(28, dy * 0.45, dx * 0.28 * 1.7);
  const phoneWidth = phoneHeight / 1.7;
  const lanePitch = pitchFor(rows2 + 1, dx - phoneWidth - 10, 6);
  // Centre each phone and its lanes inside its cell.
  const block = phoneWidth + 6 + (rows2 - 1) * lanePitch;
  const phones = Array.from({ length: config.phones }, (_, index) => {
    const row = Math.floor(index / columns);
    const x = PHONES.x0 + (index % columns) * dx + (dx - block) / 2 + phoneWidth / 2;
    const top = PHONES.y0 + row * dy;
    return {
      id: `phone-${index + 1}`,
      label: `Phone ${index + 1}`,
      x,
      y: top + dy * 0.6,
      channelY: top + dy * 0.2,
      laneX: x + phoneWidth / 2 + 6 + row * lanePitch,
    };
  });
  for (const side of [-1, 1] as const) {
    const group = phones
      .filter((phone) => (side < 0 ? phone.laneX < VIEW.width / 2 : phone.laneX >= VIEW.width / 2))
      .sort((a, b) => side * (b.laneX - a.laneX));
    const bandPitch2 = pitchFor(group.length, PHONE_BAND.bottom - PHONE_BAND.top, 6);
    const columnPitch = pitchFor(group.length, PROJECTION_COLUMNS.inner - PROJECTION_COLUMNS.outer, 6);
    group.forEach((phone, index) => {
      const bandY = PHONE_BAND.bottom - index * bandPitch2;
      const columnX = mirror(PROJECTION_COLUMNS.outer + index * columnPitch, side);
      add(phone.id, "projection", [
        [phone.x, phone.y - phoneHeight / 2],
        [phone.x, phone.channelY],
        [phone.laneX, phone.channelY],
        [phone.laneX, bandY],
        [columnX, bandY],
        [columnX, PROJECTION.y1],
      ]);
    });
  }

  const edgesFrom = new Map<string, Edge[]>();
  for (const edge of edges) edgesFrom.set(edge.from, [...(edgesFrom.get(edge.from) ?? []), edge]);

  const speakerNodes: CircuitNode[] = ([-1, 1] as const).map((side) => {
    const lanes = speakerLanes.get(speakerId(side)) ?? [mirror(CORRIDOR.inner, side)];
    const rect = { x0: Math.min(...lanes) - 10, x1: Math.max(...lanes) + 10, y0: SPEAKER.y0, y1: SPEAKER.y1 };
    return { id: speakerId(side), kind: "speaker", label: null, x: (rect.x0 + rect.x1) / 2, y: rect.y0, rect };
  });

  const nodes: CircuitNode[] = [
    { id: "projection", kind: "projection", label: null, x: VIEW.width / 2, y: PROJECTION.y0, rect: PROJECTION },
    ...speakerNodes,
    ...locals.map((local) => ({ id: local.id, kind: "local" as const, label: local.label, x: local.x, y: local.y })),
    ...remotes.map((remote) => ({ id: remote.id, kind: "remote" as const, label: remote.label, x: remote.x, y: remote.y })),
    ...phones.map((phone) => ({
      id: phone.id,
      kind: "phone" as const,
      label: phone.label,
      x: phone.x,
      y: phone.y,
      width: phoneWidth,
      height: phoneHeight,
    })),
  ];

  return { config, nodes, edges, edgesFrom };
}

function side(remote: Remote) {
  return remote.side;
}
