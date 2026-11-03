import { joinPaths, reversePath, type Point, type Polyline } from "./path";

// Pure layout of the concert as a schematic. Counts are configuration, not
// structure: any number of local performers, remote performers, and audience
// phones produces the same circuit. Nothing here knows about sockets, WebRTC,
// or timing; a later live adapter only has to produce the same node ids.

export const VIEW = { width: 1600, height: 900 } as const;

export const LIMITS = {
  local: { min: 1, max: 5 },
  remote: { min: 0, max: 4 },
  phones: { min: 1, max: 120 },
} as const;

export type TopologyConfig = {
  local: number;
  remote: number;
  phones: number;
  /** One-way network delay per remote performer, cycled when shorter. */
  latenciesMs: readonly number[];
};

export const DEFAULT_CONFIG: TopologyConfig = {
  local: 2,
  remote: 2,
  phones: 24,
  latenciesMs: [20, 30, 10, 40],
};

export type Hub = "mix" | "relay";

type BaseNode = { id: string; label: string; x: number; y: number };

export type PerformerNode = BaseNode & { kind: "local" };
export type RemoteNode = BaseNode & {
  kind: "remote";
  side: -1 | 1;
  latencyMs: number;
  frameId: string;
  /** Inductor-style delay line drawn across the venue wall. */
  coil: { x0: number; x1: number; turns: number };
};
export type PhoneNode = BaseNode & { kind: "phone"; width: number; height: number };
export type FixtureNode = BaseNode & {
  kind: "mix" | "relay" | "admin" | "pa" | "projection" | "frame";
};

export type SchematicNode = PerformerNode | RemoteNode | PhoneNode | FixtureNode;

export type Topology = {
  config: TopologyConfig;
  venue: { x0: number; x1: number; y0: number; y1: number };
  stage: { x0: number; x1: number; y0: number; y1: number };
  projection: { x0: number; x1: number; y: number };
  nodes: SchematicNode[];
  byId: ReadonlyMap<string, SchematicNode>;
  locals: PerformerNode[];
  remotes: RemoteNode[];
  phones: PhoneNode[];
  /** Path from each source/sink to its hub. */
  ports: ReadonlyMap<string, { hub: Hub; path: Polyline }>;
  hubLink: Polyline;
  paFeeds: Polyline[];
  adminLink: Polyline;
  projectionFeed: Polyline;
  /** Remote performer → its embodiment frame on stage. */
  remoteVideo: ReadonlyMap<string, Polyline>;
  junctions: Point[];
};

const VENUE = { x0: 250, x1: 1350, y0: 30, y1: 870 };
const STAGE = { x0: 390, x1: 1210, y0: 118, y1: 278 };
const PROJECTION = { x0: 470, x1: 1130, y: 64 };
const BUS_Y = 320;
const MIX: Point = [800, BUS_Y];
const RELAY: Point = [800, 410];
const ADMIN: Point = [610, 410];
const PA_Y = 92;
const PA_X = { left: 330, right: 1270 };
const PERFORMER_Y = 198;
const FRAME_X = { left: 425, right: 1175 };
const REMOTE_X = { left: 112, right: 1488 };
const JUNCTION_X = { left: 360, right: 1240 };
const FEED_X = 1310;
const AUDIENCE = { y0: 474, y1: 852, sideWidth: 470, aisle: 800, gap: 40 };

function clampCount(value: number, limits: { min: number; max: number }) {
  if (!Number.isFinite(value)) return limits.min;
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

export function normalizeConfig(config: Partial<TopologyConfig>): TopologyConfig {
  return {
    local: clampCount(config.local ?? DEFAULT_CONFIG.local, LIMITS.local),
    remote: clampCount(config.remote ?? DEFAULT_CONFIG.remote, LIMITS.remote),
    phones: clampCount(config.phones ?? DEFAULT_CONFIG.phones, LIMITS.phones),
    latenciesMs:
      config.latenciesMs && config.latenciesMs.length > 0
        ? config.latenciesMs
        : DEFAULT_CONFIG.latenciesMs,
  };
}

function layoutLocals(count: number): PerformerNode[] {
  const x0 = 520;
  const span = 560;
  return Array.from({ length: count }, (_, index) => ({
    id: `L${index + 1}`,
    kind: "local" as const,
    label: `Performer ${index + 1}`,
    x: x0 + ((index + 0.5) * span) / count,
    y: PERFORMER_Y,
  }));
}

function layoutRemotes(config: TopologyConfig): RemoteNode[] {
  const perSide = { left: 0, right: 0 };
  return Array.from({ length: config.remote }, (_, index) => {
    const side: -1 | 1 = index % 2 === 0 ? -1 : 1;
    const key = side < 0 ? "left" : "right";
    const slot = perSide[key];
    perSide[key] += 1;
    const y = 162 + slot * 62;
    const latencyMs = config.latenciesMs[index % config.latenciesMs.length];
    const turns = Math.min(12, Math.max(2, Math.round(latencyMs / 5)));
    const coil =
      side < 0
        ? { x0: REMOTE_X.left + 34, x1: VENUE.x0 - 6, turns }
        : { x0: VENUE.x1 + 6, x1: REMOTE_X.right - 34, turns };
    return {
      id: `R${index + 1}`,
      kind: "remote" as const,
      label: `Remote performer ${index + 1}`,
      x: side < 0 ? REMOTE_X.left : REMOTE_X.right,
      y,
      side,
      latencyMs,
      frameId: `frame-R${index + 1}`,
      coil,
    };
  });
}

type PhoneSlot = PhoneNode & { railY: number };

function layoutPhones(count: number): PhoneSlot[] {
  const height = AUDIENCE.y1 - AUDIENCE.y0;
  const columns = Math.max(
    1,
    Math.ceil(Math.sqrt((count / 2) * (AUDIENCE.sideWidth / height))),
  );
  const rows = Math.max(1, Math.ceil(count / (columns * 2)));
  const dx = AUDIENCE.sideWidth / columns;
  const dy = height / rows;
  const width = Math.min(20, Math.max(8, dx * 0.34), dy * 0.36);
  const phoneHeight = width * 1.7;
  const slots: PhoneSlot[] = [];

  // Fill from the front rows outward from the aisle, alternating sides, so a
  // small audience sits where a small audience would sit.
  for (let row = 0; row < rows && slots.length < count; row += 1) {
    const railY = AUDIENCE.y0 + row * dy;
    const y = railY + Math.min(dy * 0.48, phoneHeight * 0.5 + 12);
    for (let column = 0; column < columns && slots.length < count; column += 1) {
      for (const side of [-1, 1] as const) {
        if (slots.length >= count) break;
        const offset = AUDIENCE.gap + (column + 0.5) * dx;
        const index = slots.length;
        slots.push({
          id: `M${index + 1}`,
          kind: "phone",
          label: `M${index + 1}`,
          x: AUDIENCE.aisle + side * offset,
          y,
          width,
          height: phoneHeight,
          railY,
        });
      }
    }
  }
  return slots;
}

export function buildTopology(input: Partial<TopologyConfig> = {}): Topology {
  const config = normalizeConfig(input);
  const locals = layoutLocals(config.local);
  const remotes = layoutRemotes(config);
  const phoneSlots = layoutPhones(config.phones);

  const fixtures: FixtureNode[] = [
    { id: "mix", kind: "mix", label: "Mixer", x: MIX[0], y: MIX[1] },
    { id: "relay", kind: "relay", label: "Server", x: RELAY[0], y: RELAY[1] },
    { id: "admin", kind: "admin", label: "Laptop", x: ADMIN[0], y: ADMIN[1] },
    { id: "pa-left", kind: "pa", label: "Speaker", x: PA_X.left, y: PA_Y },
    { id: "pa-right", kind: "pa", label: "Speaker", x: PA_X.right, y: PA_Y },
    {
      id: "projection",
      kind: "projection",
      label: "Projection",
      x: (PROJECTION.x0 + PROJECTION.x1) / 2,
      y: PROJECTION.y,
    },
    ...remotes.map((remote) => ({
      id: remote.frameId,
      kind: "frame" as const,
      label: remote.label,
      x: remote.side < 0 ? FRAME_X.left : FRAME_X.right,
      y: remote.y,
    })),
  ];

  const ports = new Map<string, { hub: Hub; path: Polyline }>();
  const remoteVideo = new Map<string, Polyline>();
  const junctions: Point[] = [];

  for (const local of locals) {
    ports.set(local.id, {
      hub: "mix",
      path: joinPaths([[local.x, local.y], [local.x, BUS_Y], MIX]),
    });
    if (Math.abs(local.x - MIX[0]) > 1) junctions.push([local.x, BUS_Y]);
  }

  for (const remote of remotes) {
    const junctionX = remote.side < 0 ? JUNCTION_X.left : JUNCTION_X.right;
    const frameX = remote.side < 0 ? FRAME_X.left : FRAME_X.right;
    ports.set(remote.id, {
      hub: "mix",
      path: joinPaths([[remote.x, remote.y], [junctionX, remote.y], [junctionX, BUS_Y], MIX]),
    });
    remoteVideo.set(remote.id, [[remote.x, remote.y], [frameX, remote.y]]);
    junctions.push([junctionX, remote.y]);
  }
  for (const side of [-1, 1] as const) {
    if (remotes.some((remote) => remote.side === side)) {
      junctions.push([side < 0 ? JUNCTION_X.left : JUNCTION_X.right, BUS_Y]);
    }
  }

  const railTaps = new Set<number>();
  for (const phone of phoneSlots) {
    ports.set(phone.id, {
      hub: "relay",
      path: joinPaths([[phone.x, phone.y], [phone.x, phone.railY], [AUDIENCE.aisle, phone.railY], RELAY]),
    });
    railTaps.add(phone.railY);
  }
  for (const railY of railTaps) junctions.push([AUDIENCE.aisle, railY]);

  const paFeeds: Polyline[] = [
    [MIX, [PA_X.left, BUS_Y], [PA_X.left, PA_Y + 14]],
    [MIX, [PA_X.right, BUS_Y], [PA_X.right, PA_Y + 14]],
  ];
  junctions.push([PA_X.left, BUS_Y], [PA_X.right, BUS_Y]);

  const phones: PhoneNode[] = phoneSlots.map((slot) => ({
    id: slot.id,
    kind: slot.kind,
    label: slot.label,
    x: slot.x,
    y: slot.y,
    width: slot.width,
    height: slot.height,
  }));
  const nodes: SchematicNode[] = [...fixtures, ...locals, ...remotes, ...phones];

  return {
    config,
    venue: VENUE,
    stage: STAGE,
    projection: PROJECTION,
    nodes,
    byId: new Map(nodes.map((node) => [node.id, node])),
    locals,
    remotes,
    phones,
    ports,
    hubLink: [MIX, RELAY],
    paFeeds,
    adminLink: [ADMIN, RELAY],
    projectionFeed: [RELAY, [FEED_X, RELAY[1]], [FEED_X, PROJECTION.y], [PROJECTION.x1, PROJECTION.y]],
    remoteVideo,
    junctions,
  };
}

/** Wire route between any two ported nodes, through their hubs. */
export function route(topology: Topology, fromId: string, toId: string): Polyline {
  const from = topology.ports.get(fromId);
  const to = topology.ports.get(toId);
  if (!from || !to) return [];
  const bridge =
    from.hub === to.hub
      ? []
      : from.hub === "mix"
        ? topology.hubLink
        : reversePath(topology.hubLink);
  return joinPaths(from.path, bridge, reversePath(to.path));
}
