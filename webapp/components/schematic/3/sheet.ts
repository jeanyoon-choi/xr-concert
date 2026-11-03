import { joinPaths, pathLength, reversePath, type Point, type Polyline } from "../1/model/path";

// Study 3: the whole concert system on one drawing sheet. Every block is the
// real equipment or process the concert runs on, every pin and value is taken
// from the repository's architecture documents, and every wire is drawn at
// rest. Selecting a sender lights only the routes its signal actually takes.
//
// Sound
//   local performer: mic → mixer channel → master L/R → PA
//   remote performer: mic → network → laptop WebRTC → audio interface →
//     mixer channel → PA; the mixer returns a mix-minus to each remote's
//     headphones (everything except that remote's own channel)
//   laptop (/admin): getUserMedia → one RTCPeerConnection per phone → <audio>
// Picture
//   remote camera → network → laptop → embodiment frame at the stage side
//   phone gesture (25 Hz) → server validate → latest sample → aggregate
//     (30 Hz) → /screen → projection
// Signaling: laptop ↔ server ↔ phone (offer, answer, ice)

export const VIEW = { width: 1600, height: 900 } as const;

export const LIMITS = {
  local: { min: 1, max: 5 },
  remote: { min: 0, max: 4 },
  phones: { min: 10, max: 20 },
} as const;

export type SheetConfig = { local: number; remote: number; phones: number };
export const DEFAULT_CONFIG: SheetConfig = { local: 2, remote: 2, phones: 16 };

function clampCount(value: number | undefined, fallback: number, limits: { min: number; max: number }) {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

export function normalizeConfig(input: Partial<SheetConfig>): SheetConfig {
  return {
    local: clampCount(input.local, DEFAULT_CONFIG.local, LIMITS.local),
    remote: clampCount(input.remote, DEFAULT_CONFIG.remote, LIMITS.remote),
    phones: clampCount(input.phones, DEFAULT_CONFIG.phones, LIMITS.phones),
  };
}

export type Layer = "frame" | "plan" | "device" | "audio" | "video" | "network" | "control" | "signal";

export type Mark =
  | { kind: "wire"; layer: Layer; points: Polyline; bus?: boolean; dashed?: boolean }
  | { kind: "rect"; layer: Layer; x: number; y: number; w: number; h: number; dashed?: boolean }
  | { kind: "circle"; layer: Layer; x: number; y: number; r: number; dashed?: boolean }
  | { kind: "shape"; layer: Layer; points: Polyline }
  | { kind: "dot"; layer: Layer; x: number; y: number }
  | {
      kind: "text";
      layer: Layer;
      x: number;
      y: number;
      text: string;
      size: number;
      anchor?: "start" | "middle" | "end";
      vertical?: boolean;
      strong?: boolean;
    };

export type Ring = { x: number; y: number; base: number; reach: number };

export type NodeShape =
  | { type: "circle"; x: number; y: number; r: number; dashed?: boolean }
  | { type: "rect"; x: number; y: number; w: number; h: number };

export type SheetNode = {
  id: string;
  kind: "local" | "remote" | "phone" | "laptop" | "speaker" | "frame" | "projection";
  label: string;
  /** Senders can be selected; receivers only show what reaches them. */
  sender: boolean;
  shape: NodeShape;
  hit: NodeShape;
  ring: Ring | null;
};

export type Route = { from: string; to: string; path: Polyline; length: number };

export type Sheet = {
  config: SheetConfig;
  marks: Mark[];
  nodes: SheetNode[];
  routes: Route[];
  routesFrom: ReadonlyMap<string, Route[]>;
};

// ── Sheet geometry ──────────────────────────────────────────────────────────
const BORDER = { x0: 24, y0: 24, x1: 1576, y1: 876 };
export const VENUE = { x0: 250, x1: 1350, y0: 64, y1: 864 };
const BAR = { x0: 446, x1: 1154, y0: 70, y1: 80 };
const PA = { left: 420, right: 1180, y: 102 };
const FRAME_X = { left: [296, 376], right: [1224, 1304] } as const;
const LOCAL_Y = 206;
const MIXER = { x0: 600, x1: 1000, y0: 326, y1: 440, bus: 430 };
const LAPTOP = { x0: 300, x1: 540, y0: 450, y1: 576 };
const SERVER = { x0: 1060, x1: 1300, y0: 450, y1: 576 };
const SCREEN = { x0: 1060, x1: 1164, y0: 160, y1: 250 };
const SITE = { left: [36, 226], right: [1374, 1564], y0: 72, pitch: 220, height: 200 } as const;
const PHONES = { x0: 300, x1: 1300, row0: 734, row1: 806, w: 24, h: 42 };
const BANDS = { audioNear: 643, sampleNear: 707, pitch: 3, bus: 718 };
const NODE_R = 22;

const FIELDS = ["centroid", "energy", "coherence", "contributors", "impulses"] as const;

type Side = -1 | 1;

/** Fan a bundle from sources to targets through horizontal lanes without any
 * wire of the bundle crossing another. Targets are matched to sources in x
 * order. Lane 0 is the one nearest the sources; `toward` is the direction
 * from sources to targets (−1 up, +1 down). */
function fan(
  sources: readonly { x: number; y: number }[],
  targets: readonly { x: number; y: number }[],
  laneNear: number,
  toward: -1 | 1,
  pitch: number,
): Polyline[] {
  const order = sources.map((_, index) => index).sort((a, b) => sources[a].x - sources[b].x);
  const targetXs = [...targets].sort((a, b) => a.x - b.x);
  const matched = new Map<number, { x: number; y: number }>();
  order.forEach((sourceIndex, rank) => matched.set(sourceIndex, targetXs[rank]));

  const right = order.filter((index) => matched.get(index)!.x > sources[index].x + 0.5).reverse();
  const left = order.filter((index) => matched.get(index)!.x < sources[index].x - 0.5);
  const lane = new Map<number, number>();
  right.forEach((index, rank) => lane.set(index, laneNear + toward * rank * pitch));
  left.forEach((index, rank) => lane.set(index, laneNear + toward * rank * pitch));

  return sources.map((source, index) => {
    const target = matched.get(index)!;
    const y = lane.get(index);
    if (y === undefined) return [[source.x, source.y], [source.x, target.y]] as Polyline;
    return [
      [source.x, source.y],
      [source.x, y],
      [target.x, y],
      [target.x, target.y],
    ] as Polyline;
  });
}

const spread = (count: number, x0: number, x1: number, maxPitch: number) => {
  if (count <= 1) return [(x0 + x1) / 2];
  const pitch = Math.min(maxPitch, (x1 - x0) / (count - 1));
  const start = (x0 + x1) / 2 - (pitch * (count - 1)) / 2;
  return Array.from({ length: count }, (_, index) => start + index * pitch);
};

const pad = (value: number) => String(value).padStart(2, "0");

export function buildSheet(input: Partial<SheetConfig>): Sheet {
  const config = normalizeConfig(input);
  const marks: Mark[] = [];
  const nodes: SheetNode[] = [];
  const routes: Route[] = [];

  const wire = (layer: Layer, points: Polyline, extra: { bus?: boolean; dashed?: boolean } = {}) =>
    marks.push({ kind: "wire", layer, points, ...extra });
  const rect = (layer: Layer, x: number, y: number, w: number, h: number, dashed = false) =>
    marks.push({ kind: "rect", layer, x, y, w, h, dashed });
  const text = (
    x: number,
    y: number,
    value: string,
    size: number,
    extra: { anchor?: "start" | "middle" | "end"; vertical?: boolean; strong?: boolean; layer?: Layer } = {},
  ) => marks.push({ kind: "text", layer: extra.layer ?? "device", x, y, text: value, size, ...extra });
  const dot = (layer: Layer, x: number, y: number) => marks.push({ kind: "dot", layer, x, y });
  const route = (from: string, to: string, ...parts: Polyline[]) => {
    const path = joinPaths(...parts);
    routes.push({ from, to, path, length: pathLength(path) });
  };
  /** Orthogonal path through the inside of a block, drawn only while live. */
  const through = (a: Point, b: Point, x: number): Polyline => [a, [x, a[1]], [x, b[1]], b];

  // ── Sheet frame: border, zone grid, title block ──────────────────────────
  rect("frame", 8, 8, 1584, 884);
  rect("frame", BORDER.x0, BORDER.y0, BORDER.x1 - BORDER.x0, BORDER.y1 - BORDER.y0);
  const columns = 8;
  const rows = 4;
  for (let index = 0; index < columns; index += 1) {
    const x = BORDER.x0 + ((index + 0.5) * (BORDER.x1 - BORDER.x0)) / columns;
    text(x, 19, String(columns - index), 12, { anchor: "middle", layer: "frame" });
    text(x, 888, String(columns - index), 12, { anchor: "middle", layer: "frame" });
    if (index > 0) {
      const xb = BORDER.x0 + (index * (BORDER.x1 - BORDER.x0)) / columns;
      wire("frame", [[xb, 8], [xb, BORDER.y0]]);
      wire("frame", [[xb, BORDER.y1], [xb, 892]]);
    }
  }
  for (let index = 0; index < rows; index += 1) {
    const y = BORDER.y0 + ((index + 0.5) * (BORDER.y1 - BORDER.y0)) / rows;
    const letter = "DCBA"[index];
    text(16, y + 3, letter, 12, { anchor: "middle", layer: "frame" });
    text(1584, y + 3, letter, 12, { anchor: "middle", layer: "frame" });
    if (index > 0) {
      const yb = BORDER.y0 + (index * (BORDER.y1 - BORDER.y0)) / rows;
      wire("frame", [[8, yb], [BORDER.x0, yb]]);
      wire("frame", [[BORDER.x1, yb], [1592, yb]]);
    }
  }
  const title = { x0: 1374, x1: 1564, y0: 772, y1: 862 };
  rect("frame", title.x0, title.y0, title.x1 - title.x0, title.y1 - title.y0);
  for (const y of [790, 808, 826, 844]) wire("frame", [[title.x0, y], [title.x1, y]]);
  wire("frame", [[1440, 790], [1440, title.y1]]);
  text(title.x0 + 6, 786, "NRF XR", 13, { strong: true, layer: "frame" });
  const rowsText: [string, string][] = [
    ["title", "schematic/3"],
    ["local", String(config.local)],
    ["remote", String(config.remote)],
    ["phones", String(config.phones)],
  ];
  rowsText.forEach(([key, value], index) => {
    text(title.x0 + 6, 804 + index * 18, key, 12, { layer: "frame" });
    text(1446, 804 + index * 18, value, 12, { layer: "frame" });
  });

  // ── Floor plan underlay (NRF_June p.8) ───────────────────────────────────
  rect("plan", VENUE.x0, VENUE.y0, VENUE.x1 - VENUE.x0, VENUE.y1 - VENUE.y0);
  rect("plan", 440, 120, 720, 170, true);
  rect("plan", 290, 590, 1020, 266, true);
  wire("plan", [[800, 590], [800, 856]], { dashed: true });

  // ── Projection ───────────────────────────────────────────────────────────
  nodes.push({
    id: "projection",
    kind: "projection",
    label: "",
    sender: false,
    shape: { type: "rect", x: BAR.x0, y: BAR.y0, w: BAR.x1 - BAR.x0, h: BAR.y1 - BAR.y0 },
    hit: { type: "rect", x: BAR.x0, y: BAR.y0, w: BAR.x1 - BAR.x0, h: BAR.y1 - BAR.y0 },
    ring: null,
  });

  // ── PA speakers ──────────────────────────────────────────────────────────
  for (const side of [-1, 1] as const) {
    const x = side < 0 ? PA.left : PA.right;
    const id = side < 0 ? "speaker-left" : "speaker-right";
    marks.push({
      kind: "shape",
      layer: "device",
      points: [
        [x - side * 6, PA.y - 6],
        [x - side * 16, PA.y - 14],
        [x - side * 16, PA.y + 14],
        [x - side * 6, PA.y + 6],
      ],
    });
    nodes.push({
      id,
      kind: "speaker",
      label: "",
      sender: false,
      shape: { type: "rect", x: x - 6, y: PA.y - 8, w: 12, h: 16 },
      hit: { type: "rect", x: x - 6, y: PA.y - 8, w: 12, h: 16 },
      ring: { x, y: PA.y, base: 14, reach: 60 },
    });
  }

  // ── Mixer ────────────────────────────────────────────────────────────────
  const channels = config.remote + config.local;
  const stripX = (channel: number) => MIXER.x0 + 20 + ((channel + 0.5) * (MIXER.x1 - MIXER.x0 - 90)) / channels;
  rect("device", MIXER.x0, MIXER.y0, MIXER.x1 - MIXER.x0, MIXER.y1 - MIXER.y0);
  text(MIXER.x1 - 8, MIXER.y0 + 15, "Mixer", 15, { anchor: "end", strong: true });
  wire("audio", [[MIXER.x0 + 8, MIXER.bus], [MIXER.x1 - 8, MIXER.bus]]);
  for (let channel = 0; channel < channels; channel += 1) {
    const x = stripX(channel);
    wire("audio", [[x, MIXER.y0 + 6], [x, MIXER.bus]]);
    dot("audio", x, MIXER.bus);
    for (const y of [348, 360, 372]) marks.push({ kind: "circle", layer: "device", x, y, r: 3.2 });
    rect("device", x - 1.5, 380, 3, 18);
    rect("device", x - 5, 382 + ((channel * 7) % 12), 10, 4);
  }
  // One aux bus per remote: every channel except that remote's own feeds it.
  const auxY = (k: number) => 406 + k * 6;
  for (let k = 0; k < config.remote; k += 1) {
    wire("audio", [[stripX(0) - 6, auxY(k)], [stripX(channels - 1) + 6, auxY(k)]]);
    for (let channel = 0; channel < channels; channel += 1) if (channel !== k) dot("audio", stripX(channel), auxY(k));
  }
  // Master outputs to the PA.
  const masterLeft: Polyline = [[MIXER.x0, MIXER.bus], [PA.left, MIXER.bus], [PA.left, PA.y + 8]];
  const masterRight: Polyline = [[MIXER.x1, MIXER.bus], [PA.right, MIXER.bus], [PA.right, PA.y + 8]];
  wire("audio", masterLeft);
  wire("audio", masterRight);
  text(PA.left + 5, MIXER.bus - 5, "L", 12);
  text(PA.right - 5, MIXER.bus - 5, "R", 12, { anchor: "end" });
  const toPa = (from: number): { left: Polyline; right: Polyline } => ({
    left: joinPaths([[from, MIXER.bus], [MIXER.x0, MIXER.bus]], masterLeft),
    right: joinPaths([[from, MIXER.bus], [MIXER.x1, MIXER.bus]], masterRight),
  });

  // ── Laptop (/admin) ──────────────────────────────────────────────────────
  rect("device", LAPTOP.x0, LAPTOP.y0, LAPTOP.x1 - LAPTOP.x0, LAPTOP.y1 - LAPTOP.y0);
  text(LAPTOP.x1 - 8, LAPTOP.y0 + 15, "Laptop", 15, { anchor: "end", strong: true });
  text(LAPTOP.x1 - 8, LAPTOP.y0 + 30, "/admin", 12, { anchor: "end" });
  // Operator microphone.
  const operatorMic: Point = [450, 441];
  marks.push({ kind: "circle", layer: "device", x: operatorMic[0], y: operatorMic[1], r: 5 });
  wire("audio", [[operatorMic[0], operatorMic[1] + 5], [operatorMic[0], LAPTOP.y0]]);
  wire("audio", [[operatorMic[0], 476], [operatorMic[0], 544]]);

  // ── Server (realtime relay) ──────────────────────────────────────────────
  rect("device", SERVER.x0, SERVER.y0, SERVER.x1 - SERVER.x0, SERVER.y1 - SERVER.y0);
  text(SERVER.x1 - 8, SERVER.y0 + 15, "Server", 15, { anchor: "end", strong: true });
  text(SERVER.x1 - 8, SERVER.y0 + 30, "wss :10001", 12, { anchor: "end" });

  // ── Screen (/screen) → projection ────────────────────────────────────────
  rect("device", SCREEN.x0, SCREEN.y0, SCREEN.x1 - SCREEN.x0, SCREEN.y1 - SCREEN.y0);
  text(SCREEN.x0 + 6, SCREEN.y0 + 15, "Screen", 15, { strong: true });
  text(SCREEN.x0 + 6, SCREEN.y0 + 30, "/screen", 12);
  const fieldX = FIELDS.map((_, index) => 1076 + index * 18);
  for (const x of fieldX) wire("control", [[x, 474], [x, SCREEN.y1]]);
  const screenOut: Polyline = [[1112, SCREEN.y0], [1112, BAR.y1]];
  wire("control", screenOut);
  text(1118, 150, "30 Hz", 12, { layer: "control" });
  const toProjection = joinPaths([[1112, 474], [1112, SCREEN.y1]], [[1112, SCREEN.y1], [1112, SCREEN.y0]], screenOut);

  // ── Remote performers ───────────────────────────────────────────────────
  type RemoteLine = { kind: "camera" | "mic" | "headphones"; path: Polyline; pin: number; exitY: number };
  const remotes = Array.from({ length: config.remote }, (_, index) => {
    const side: Side = index % 2 === 0 ? -1 : 1;
    const slot = Math.floor(index / 2);
    return { index, id: `remote-${index + 1}`, side, slot, y0: SITE.y0 + slot * SITE.pitch };
  });
  const mirrorX = (x: number, side: Side) => (side < 0 ? x : VIEW.width - x);

  // Equipment at each site; exits nearest the venue take the lane nearest the
  // equipment, so a site's three lines never cross.
  type Exit = { remote: (typeof remotes)[number]; kind: RemoteLine["kind"]; y: number; site: Polyline };
  const exits: Exit[] = [];
  const equipment: Record<RemoteLine["kind"], number> = { camera: 81, mic: 131, headphones: 181 };
  for (const remote of remotes) {
    const { side, y0 } = remote;
    const [sx0, sx1] = side < 0 ? SITE.left : SITE.right;
    rect("plan", sx0, y0, sx1 - sx0, SITE.height, true);
    const nodeX = mirrorX(131, side);
    const nodeY = y0 + 60;
    nodes.push({
      id: remote.id,
      kind: "remote",
      label: `Remote performer ${remote.index + 1}`,
      sender: true,
      shape: { type: "circle", x: nodeX, y: nodeY, r: NODE_R, dashed: true },
      hit: { type: "circle", x: nodeX, y: nodeY, r: NODE_R + 6 },
      ring: { x: nodeX, y: nodeY, base: NODE_R + 4, reach: 40 },
    });
    text(nodeX, nodeY + NODE_R + 18, `Remote performer ${remote.index + 1}`, 14, { anchor: "middle" });
    const exitEdge = side < 0 ? sx1 : sx0;
    const kinds: RemoteLine["kind"][] = ["headphones", "mic", "camera"];
    kinds.forEach((kind, rank) => {
      const x = mirrorX(equipment[kind], side);
      const ey = y0 + 130;
      // Symbols.
      if (kind === "mic") {
        marks.push({ kind: "circle", layer: "device", x, y: ey, r: 5 });
      } else if (kind === "camera") {
        rect("device", x - 9, ey - 6, 13, 12);
        marks.push({
          kind: "shape",
          layer: "device",
          points: [[x + 4, ey - 3], [x + 10, ey - 7], [x + 10, ey + 7], [x + 4, ey + 3]],
        });
      } else {
        wire("device", [[x - 7, ey + 5], [x - 7, ey - 2], [x - 4, ey - 7], [x + 4, ey - 7], [x + 7, ey - 2], [x + 7, ey + 5]]);
        rect("device", x - 9, ey, 4, 7);
        rect("device", x + 5, ey, 4, 7);
      }
      const laneY = y0 + 160 + rank * 7;
      const layer: Layer = kind === "camera" ? "video" : "audio";
      const site: Polyline = [[x, ey + 8], [x, laneY], [exitEdge, laneY]];
      wire(layer, site);
      // Performer to equipment.
      const link: Polyline =
        kind === "mic"
          ? [[nodeX, nodeY + NODE_R], [x, ey - 5]]
          : [[nodeX + (x > nodeX ? NODE_R : -NODE_R), nodeY], [x, nodeY], [x, ey - 8]];
      wire(layer, link, { dashed: kind === "headphones" });
      exits.push({ remote, kind, y: laneY, site: joinPaths(link, site) });
    });
    // Network label at the site boundary.
  }

  // Laptop left-edge pins: left-site lines first in entry order, then right.
  const leftExits = exits.filter((exit) => exit.remote.side < 0).sort((a, b) => a.y - b.y);
  const rightExits = exits.filter((exit) => exit.remote.side > 0).sort((a, b) => b.y - a.y);
  const pinY = (rank: number) => 464 + rank * 6;
  const remoteLine = new Map<string, Polyline>(); // `${remote}:${kind}` → site → laptop pin
  leftExits.forEach((exit, rank) => {
    const column = 296 - rank * 4;
    const y = pinY(rank);
    const network: Polyline = [[SITE.left[1], exit.y], [VENUE.x0, exit.y]];
    const venue: Polyline = [[VENUE.x0, exit.y], [column, exit.y], [column, y], [LAPTOP.x0, y]];
    const layer: Layer = exit.kind === "camera" ? "video" : "audio";
    wire("network", network, { dashed: true });
    wire(layer, venue);
    remoteLine.set(`${exit.remote.id}:${exit.kind}`, joinPaths(exit.site, network, venue));
  });
  rightExits.forEach((exit, rank) => {
    const gap = 1352 + rank * 3.5;
    const trunk = 58 - rank * 4;
    const down = 247 - rank * 3.5;
    const y = pinY(leftExits.length + rank);
    const network: Polyline = [
      [SITE.right[0], exit.y],
      [gap, exit.y],
      [gap, trunk],
      [down, trunk],
      [down, y],
      [VENUE.x0, y],
    ];
    const layer: Layer = exit.kind === "camera" ? "video" : "audio";
    wire("network", network, { dashed: true });
    wire(layer, [[VENUE.x0, y], [LAPTOP.x0, y]]);
    remoteLine.set(`${exit.remote.id}:${exit.kind}`, joinPaths(exit.site, network, [[VENUE.x0, y], [LAPTOP.x0, y]]));
  });

  // Embodiment frames at the stage sides; their video leaves the laptop top.
  const frameMid = (slot: number) => 140 + slot * 76 + 27;
  for (const remote of remotes) {
    const [fx0, fx1] = remote.side < 0 ? FRAME_X.left : FRAME_X.right;
    const y = 140 + remote.slot * 76;
    rect("device", fx0 + 5, y + 5, fx1 - fx0 - 10, 44);
    nodes.push({
      id: `frame-${remote.index + 1}`,
      kind: "frame",
      label: "",
      sender: false,
      shape: { type: "rect", x: fx0, y, w: fx1 - fx0, h: 54 },
      hit: { type: "rect", x: fx0, y, w: fx1 - fx0, h: 54 },
      ring: { x: (fx0 + fx1) / 2, y: y + 27, base: 30, reach: 40 },
    });
  }
  const videoOut = new Map<string, Polyline>();
  for (const remote of remotes) {
    const mid = frameMid(remote.slot);
    let path: Polyline;
    if (remote.side < 0) {
      const x = remote.slot === 0 ? 388 : 384;
      path = [[x, LAPTOP.y0], [x, mid], [FRAME_X.left[1], mid]];
    } else {
      const x = remote.slot === 0 ? 400 : 404;
      const trunk = remote.slot === 0 ? 86 : 90;
      const column = remote.slot === 0 ? 1216 : 1212;
      path = [[x, LAPTOP.y0], [x, trunk], [column, trunk], [column, mid], [FRAME_X.right[0], mid]];
    }
    wire("video", path);
    videoOut.set(remote.id, path);
  }

  // Laptop ↔ mixer: remote channels in, mix-minus returns out.
  const remoteIn = new Map<string, Polyline>();
  const mixMinus = new Map<string, Polyline>();
  const lastRemoteStrip = config.remote > 0 ? stripX(config.remote - 1) : MIXER.x0;
  remotes.forEach((remote, k) => {
    const x = stripX(k);
    const y = 464 + k * 6;
    const path: Polyline = [[LAPTOP.x1, y], [x, y], [x, MIXER.y1]];
    wire("audio", path);
    wire("audio", [[x, MIXER.y1], [x, MIXER.bus]]);
    remoteIn.set(remote.id, path);
    const mx = lastRemoteStrip + 12 + k * 7;
    const my = 500 + k * 6;
    const back: Polyline = [[mx, auxY(k)], [mx, MIXER.y1], [mx, my], [LAPTOP.x1, my]];
    wire("audio", back);
    dot("audio", mx, auxY(k));
    mixMinus.set(remote.id, back);
  });

  // Laptop internals for a remote: left pin ↔ right/top pins.
  const leftPin = (remoteId: string, kind: RemoteLine["kind"]) => {
    const path = remoteLine.get(`${remoteId}:${kind}`)!;
    return path[path.length - 1];
  };

  // ── Locals ───────────────────────────────────────────────────────────────
  const locals = Array.from({ length: config.local }, (_, index) => ({
    id: `local-${index + 1}`,
    index,
    x: 470 + ((index + 0.5) * 560) / config.local,
  }));
  const localFan = fan(
    locals.map((local) => ({ x: local.x, y: 270 })),
    locals.map((_, index) => ({ x: stripX(config.remote + index), y: MIXER.y0 })),
    282,
    1,
    4,
  );
  locals.forEach((local, index) => {
    nodes.push({
      id: local.id,
      kind: "local",
      label: `Performer ${index + 1}`,
      sender: true,
      shape: { type: "circle", x: local.x, y: LOCAL_Y, r: NODE_R },
      hit: { type: "circle", x: local.x, y: LOCAL_Y, r: NODE_R + 6 },
      ring: { x: local.x, y: LOCAL_Y, base: NODE_R + 4, reach: 40 },
    });
    text(local.x, LOCAL_Y - NODE_R - 12, `Performer ${index + 1}`, 14, { anchor: "middle" });
    marks.push({ kind: "circle", layer: "device", x: local.x, y: 246, r: 5 });
    marks.push({ kind: "shape", layer: "device", points: [[local.x - 8, 256], [local.x + 8, 256], [local.x, 270]] });
    wire("audio", [[local.x, LOCAL_Y + NODE_R], [local.x, 241]]);
    wire("audio", [[local.x, 251], [local.x, 256]]);
    wire("audio", localFan[index]);
  });

  // ── Phones ───────────────────────────────────────────────────────────────
  const perRow = Math.ceil(config.phones / 2);
  const cell = (PHONES.x1 - PHONES.x0) / perRow;
  const phones = Array.from({ length: config.phones }, (_, index) => {
    const row = index < perRow ? 0 : 1;
    const column = row === 0 ? index : index - perRow;
    const x = PHONES.x0 + (column + 0.5) * cell + (row === 1 ? cell / 2 : 0);
    const top = row === 0 ? PHONES.row0 : PHONES.row1;
    return { id: `phone-${index + 1}`, index, x, top };
  });
  for (const phone of phones) {
    const { x, top } = phone;
    rect("device", x - PHONES.w / 2 + 3, top + 4, PHONES.w - 6, PHONES.h - 12);
    marks.push({ kind: "circle", layer: "device", x, y: top + PHONES.h / 2 - 2, r: 3 });
    // Phone speaker: sound out into the room.
    rect("device", x + 16, top + 16, 4, 8);
    marks.push({
      kind: "shape",
      layer: "device",
      points: [[x + 20, top + 16], [x + 25, top + 12], [x + 25, top + 28], [x + 20, top + 24]],
    });
    text(x, top + PHONES.h + 14, `phone ${pad(phone.index + 1)}`, 12, { anchor: "middle" });
    for (const dx of [-10, -4, 0, 4, 10]) wire(dx === -10 ? "audio" : dx === 10 ? "control" : "signal", [[x + dx, top], [x + dx, top - 6]]);
    nodes.push({
      id: phone.id,
      kind: "phone",
      label: `phone ${pad(phone.index + 1)}`,
      sender: true,
      shape: { type: "rect", x: x - PHONES.w / 2, y: top, w: PHONES.w, h: PHONES.h },
      hit: { type: "rect", x: x - PHONES.w / 2 - 6, y: top - 6, w: PHONES.w + 12, h: PHONES.h + 12 },
      ring: { x, y: top + PHONES.h / 2, base: 26, reach: 34 },
    });
  }

  // Audio: laptop peers → phones (one RTCPeerConnection per phone).
  const peerX = spread(config.phones, 316, 528, 11);
  const audioFan = fan(
    phones.map((phone) => ({ x: phone.x - 10, y: phone.top - 6 })),
    peerX.map((x) => ({ x, y: LAPTOP.y1 })),
    BANDS.audioNear,
    -1,
    BANDS.pitch,
  );
  audioFan.forEach((path) => wire("audio", path));
  wire("audio", [[peerX[0], 544], [peerX[peerX.length - 1], 544]]);
  for (const x of peerX) {
    dot("audio", x, 544);
    rect("device", x - 2.5, 552, 5, 9);
    wire("audio", [[x, 544], [x, 552]]);
    wire("audio", [[x, 561], [x, LAPTOP.y1]]);
  }

  // Gesture samples: phones → server (25 Hz, latest sample per phone).
  const sampleX = spread(config.phones, 1072, 1252, 10);
  const sampleFan = fan(
    phones.map((phone) => ({ x: phone.x + 10, y: phone.top - 6 })),
    sampleX.map((x) => ({ x, y: SERVER.y1 })),
    BANDS.sampleNear,
    -1,
    BANDS.pitch,
  );
  sampleFan.forEach((path) => wire("control", path));
  wire("control", [[sampleX[0], 508], [sampleX[sampleX.length - 1], 508]]);
  wire("control", [[fieldX[0], 474], [fieldX[fieldX.length - 1], 474]]);
  wire("control", [[1112, 474], [1112, 508]]);
  dot("control", 1112, 474);
  for (const x of fieldX) if (x !== 1112) dot("control", x, 474);
  for (const x of sampleX) {
    rect("device", x - 3, 524, 6, 12);
    wire("control", [[x, 508], [x, 524]]);
    wire("control", [[x, 536], [x, SERVER.y1]]);
    dot("control", x, 508);
  }
  text(1304, 660, "25 Hz", 12, { layer: "control" });

  // Signaling: laptop ↔ server ↔ phones, through one bus.
  const signalLaptop: Polyline = [[LAPTOP.x1, 560], [SERVER.x0, 560]];
  wire("signal", signalLaptop);
  const busEnd = phones.reduce((max, phone) => Math.max(max, phone.x + 9), 0);
  const signalDown: Polyline = [[1284, 495], [1284, SERVER.y1], [1284, BANDS.bus], [busEnd, BANDS.bus]];
  wire("signal", [[SERVER.x0, 560], [1180, 560], [1180, 495], [1284, 495], [1284, SERVER.y1]]);
  wire("signal", signalDown.slice(1, 3));
  wire("signal", [[Math.min(...phones.map((phone) => phone.x - 4)), BANDS.bus], [1284, BANDS.bus]], { bus: true });
  const phoneSignal = new Map<string, Polyline>();
  for (const phone of phones) {
    for (const dx of [-4, 0, 4]) {
      const entry: Polyline = [[phone.x + dx, phone.top - 6], [phone.x + dx, BANDS.bus + 4], [phone.x + dx + 4, BANDS.bus]];
      wire("signal", entry);
      if (dx === -4) phoneSignal.set(phone.id, entry);
    }
  }

  // ── Session (server-owned; admin commands from the laptop) ─────────────
  rect("device", 820, 462, 220, 58);
  text(828, 479, "session", 12, { strong: true });
  const states = ["idle", "live", "paused"] as const;
  states.forEach((state, index) => {
    const x = 828 + index * 70;
    rect("device", x, 490, 58, 20);
    text(x + 29, 504, state, 12, { anchor: "middle" });
    if (index > 0) wire("control", [[x - 12, 500], [x, 500]]);
  });
  wire("control", [[LAPTOP.x1, 540], [930, 540], [930, 520]]);
  wire("control", [[1040, 500], [SERVER.x0, 500]]);

  // ── Routes ───────────────────────────────────────────────────────────────
  // Locals: to both PA sides and, as part of each mix-minus, to every remote.
  locals.forEach((local, index) => {
    const strip = stripX(config.remote + index);
    const head = joinPaths([[local.x, LOCAL_Y + NODE_R], [local.x, 270]], localFan[index]);
    const pa = toPa(strip);
    route(local.id, "speaker-left", head, [[strip, MIXER.y0]], pa.left);
    route(local.id, "speaker-right", head, [[strip, MIXER.y0]], pa.right);
    remotes.forEach((remote, k) => {
      const back = mixMinus.get(remote.id)!;
      const pin = leftPin(remote.id, "headphones");
      route(
        local.id,
        remote.id,
        head,
        [[strip, MIXER.y0], [strip, auxY(k)], back[0]],
        back,
        through(back[back.length - 1], pin, 432),
        reversePath(remoteLine.get(`${remote.id}:headphones`)!),
      );
    });
  });

  // Remotes: voice to both PA sides and to every other remote's mix-minus;
  // camera to its frame.
  remotes.forEach((remote, k) => {
    const mic = remoteLine.get(`${remote.id}:mic`)!;
    const input = remoteIn.get(remote.id)!;
    const head = joinPaths(mic, through(mic[mic.length - 1], input[0], 404 + k * 5), input);
    const strip = stripX(k);
    const pa = toPa(strip);
    route(remote.id, "speaker-left", head, [[strip, MIXER.bus]], pa.left);
    route(remote.id, "speaker-right", head, [[strip, MIXER.bus]], pa.right);
    remotes.forEach((other, m) => {
      if (other.id === remote.id) return;
      const back = mixMinus.get(other.id)!;
      const pin = leftPin(other.id, "headphones");
      route(
        remote.id,
        other.id,
        head,
        [[strip, auxY(m)], back[0]],
        back,
        through(back[back.length - 1], pin, 432),
        reversePath(remoteLine.get(`${other.id}:headphones`)!),
      );
    });
    const camera = remoteLine.get(`${remote.id}:camera`)!;
    const video = videoOut.get(remote.id)!;
    route(remote.id, `frame-${remote.index + 1}`, camera, through(camera[camera.length - 1], video[0], video[0][0]), video);
  });

  // Phones: gesture → server → screen → projection.
  phones.forEach((phone, index) => {
    const sample = sampleFan[index];
    const x = sample[sample.length - 1][0];
    route(phone.id, "projection", [[phone.x + 10, phone.top], [phone.x + 10, phone.top - 6]], sample, [[x, SERVER.y1], [x, 508], [1112, 508], [1112, 474]], toProjection);
  });

  // Laptop: offer through the server, then audio to every phone.
  nodes.push({
    id: "laptop",
    kind: "laptop",
    label: "Laptop",
    sender: true,
    shape: { type: "circle", x: operatorMic[0], y: operatorMic[1], r: 5 },
    hit: { type: "rect", x: LAPTOP.x0, y: LAPTOP.y0 - 16, w: LAPTOP.x1 - LAPTOP.x0, h: LAPTOP.y1 - LAPTOP.y0 + 16 },
    ring: { x: operatorMic[0], y: operatorMic[1], base: 8, reach: 30 },
  });
  phones.forEach((phone, index) => {
    const audio = audioFan[index];
    const peer = audio[audio.length - 1][0];
    route(
      "laptop",
      phone.id,
      [[operatorMic[0], operatorMic[1] + 5], [operatorMic[0], 544], [peer, 544], [peer, LAPTOP.y1]],
      reversePath(audio),
      [[phone.x - 10, phone.top - 6], [phone.x - 10, phone.top]],
    );
    const entry = phoneSignal.get(phone.id)!;
    route(
      "laptop",
      phone.id,
      [[LAPTOP.x1 - 8, 560], ...signalLaptop.slice(1)],
      [[SERVER.x0, 560], [1180, 560], [1180, 495], [1284, 495], [1284, BANDS.bus], [entry[2][0], BANDS.bus]],
      reversePath(entry),
    );
  });

  const routesFrom = new Map<string, Route[]>();
  for (const item of routes) routesFrom.set(item.from, [...(routesFrom.get(item.from) ?? []), item]);
  return { config, marks, nodes, routes, routesFrom };
}
