import { pathLength, reversePath, type Polyline } from "./path";
import { route, type Topology } from "./topology";

// A scripted stand-in for the concert's state. It returns *what is active*
// (which wires carry sound or signal, which nodes are sounding or lit); it
// never decides colour or shape. A future live adapter can replace this file
// by producing the same Activity from real presence and peer state.

export type Tone = "sound" | "signal";

export type Flow = {
  path: Polyline;
  tone: Tone;
  /** Time (s) the wavefront left the path start. */
  since: number;
  /** Align dot phase to the path end so converging flows share a rhythm. */
  anchor: "start" | "end";
};

export type Packet = { path: Polyline; tone: Tone; progress: number };

export type Activity = {
  flows: Flow[];
  packets: Packet[];
  /** Node id → 0..1: the node is emitting sound into the room. */
  sounding: Map<string, number>;
  /** Node id → 0..1: the node is showing an image or carrying a face. */
  lit: Map<string, number>;
  turn: { from: string | null; to: string; latencyMs: number | null } | null;
};

export type PartKey = "0" | "1" | "2" | "3";

export const PARTS: readonly { key: PartKey; title: string }[] = [
  { key: "0", title: "Topology" },
  { key: "1", title: "Intro" },
  { key: "2", title: "Build-up" },
  { key: "3", title: "Climax" },
];

export const FLOW_SPEED = 240;
const INTRO_RAMP = 14;
const TURN = 3.6;
const HANDOFF = 1.25;
const CLIMAX_RAMP = 8;

function ease(value: number) {
  const clamped = Math.min(1, Math.max(0, value));
  return clamped * clamped * (3 - 2 * clamped);
}

function emptyActivity(): Activity {
  return { flows: [], packets: [], sounding: new Map(), lit: new Map(), turn: null };
}

/** A performer's sound reaching the room: its port into MIX, MIX out to both PAs. */
function addPerformerSound(topology: Topology, activity: Activity, id: string, since: number, level: number) {
  const port = topology.ports.get(id);
  if (!port) return;
  activity.flows.push({ path: port.path, tone: "sound", since, anchor: "end" });
  activity.sounding.set(id, Math.max(activity.sounding.get(id) ?? 0, level));
}

function addPublicAddress(topology: Topology, activity: Activity, since: number, level: number) {
  for (const feed of topology.paFeeds) {
    activity.flows.push({ path: feed, tone: "sound", since, anchor: "start" });
  }
  activity.sounding.set("pa-left", level);
  activity.sounding.set("pa-right", level);
}

function addEmbodiment(topology: Topology, activity: Activity, since: number) {
  for (const remote of topology.remotes) {
    const video = topology.remoteVideo.get(remote.id);
    if (video) activity.flows.push({ path: video, tone: "signal", since, anchor: "start" });
    activity.lit.set(remote.frameId, 1);
  }
}

function intro(topology: Topology, t: number): Activity {
  const activity = emptyActivity();
  activity.sounding.set("admin", ease(t / 1.2));
  activity.flows.push({ path: topology.adminLink, tone: "sound", since: 0, anchor: "start" });
  const count = topology.phones.length;
  topology.phones.forEach((phone, index) => {
    const leaves = 1 + (index * INTRO_RAMP) / Math.max(1, count);
    if (t < leaves) return;
    const port = topology.ports.get(phone.id);
    if (!port) return;
    const path = reversePath(port.path);
    activity.flows.push({ path, tone: "sound", since: leaves, anchor: "start" });
    const arrives = leaves + pathLength(path) / FLOW_SPEED;
    if (t >= arrives) activity.sounding.set(phone.id, ease((t - arrives) / 0.8));
  });
  return activity;
}

/** Phone opens, then remote and local performers answer in turn, never together. */
function conversationOrder(topology: Topology, cycle: number): string[] {
  const phone = topology.phones[(cycle * 7 + 3) % topology.phones.length];
  const order = [phone.id];
  const length = Math.max(topology.remotes.length, topology.locals.length);
  for (let index = 0; index < length; index += 1) {
    if (topology.remotes[index]) order.push(topology.remotes[index].id);
    if (topology.locals[index]) order.push(topology.locals[index].id);
  }
  return order;
}

function speakerAt(topology: Topology, turnIndex: number) {
  if (turnIndex < 0) return null;
  const turnsPerCycle = 1 + topology.remotes.length + topology.locals.length;
  const cycle = Math.floor(turnIndex / turnsPerCycle);
  return conversationOrder(topology, cycle)[turnIndex % turnsPerCycle];
}

function conversation(topology: Topology, t: number): Activity {
  const activity = emptyActivity();
  addEmbodiment(topology, activity, 0);

  const turnIndex = Math.floor(t / TURN);
  const phase = t - turnIndex * TURN;
  const turnStart = turnIndex * TURN;
  const current = speakerAt(topology, turnIndex)!;
  const previous = speakerAt(topology, turnIndex - 1);
  const remote = topology.remotes.find((node) => node.id === current);

  activity.turn = { from: previous, to: current, latencyMs: remote?.latencyMs ?? null };

  if (previous) {
    const fromPhone = previous.startsWith("M");
    activity.packets.push({
      path: route(topology, previous, current),
      tone: fromPhone ? "signal" : "sound",
      progress: ease(phase / HANDOFF),
    });
  }

  const speaks = previous ? phase >= HANDOFF : true;
  if (!speaks) return activity;
  const since = turnStart + (previous ? HANDOFF : 0);
  const level = ease((t - since) / 0.5) * (1 - ease((phase - (TURN - 0.4)) / 0.4));

  if (current.startsWith("M")) {
    activity.sounding.set(current, level);
    activity.lit.set(current, level);
    return activity;
  }
  addPerformerSound(topology, activity, current, since, level);
  addPublicAddress(topology, activity, since + 0.35, level);
  return activity;
}

function climax(topology: Topology, t: number): Activity {
  const activity = emptyActivity();
  addEmbodiment(topology, activity, 0);
  for (const node of [...topology.locals, ...topology.remotes]) {
    addPerformerSound(topology, activity, node.id, 0, ease(t / 1.5));
  }
  addPublicAddress(topology, activity, 0.4, ease(t / 1.5));

  const count = topology.phones.length;
  let joined = 0;
  topology.phones.forEach((phone, index) => {
    const leaves = 0.5 + ((count - 1 - index) * CLIMAX_RAMP) / Math.max(1, count);
    if (t < leaves) return;
    const port = topology.ports.get(phone.id);
    if (!port) return;
    activity.flows.push({ path: port.path, tone: "signal", since: leaves, anchor: "end" });
    activity.lit.set(phone.id, ease((t - leaves) / 0.6));
    joined += 1;
  });
  if (joined > 0) {
    activity.flows.push({ path: topology.projectionFeed, tone: "signal", since: 1.2, anchor: "start" });
  }
  activity.lit.set("projection", ease(t / 2) * (0.25 + (0.75 * joined) / Math.max(1, count)));
  return activity;
}

export function activityAt(topology: Topology, part: PartKey, t: number): Activity {
  if (part === "1") return intro(topology, t);
  if (part === "2") return conversation(topology, t);
  if (part === "3") return climax(topology, t);
  return emptyActivity();
}
