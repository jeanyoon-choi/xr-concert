import type { Map as MapLibreMap } from "maplibre-gl";

// The street network as MapLibre has drawn it, in screen px. MapLibre returns
// each road once per tile, clipped at the tile's edge, so the pieces of one
// street do not share a vertex where they meet at a seam. Vertices are
// therefore welded within a small radius and dangling ends joined to the
// nearest vertex, which turns the pieces back into one walkable network.
// Routes are shortest paths on its largest connected component, restricted
// to the clear map area, so they always follow real streets on screen.

export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };
export type StreetGraph = {
  readonly nodes: readonly Point[];
  readonly edges: readonly (readonly [number, number][])[];
  /** Nodes of the largest connected component. */
  readonly main: ReadonlySet<number>;
  readonly componentsBeforeWeld: number;
  readonly componentsAfterWeld: number;
};

const ROAD_LAYERS = ["road", "highway"];
const WELD_PX = 2.5;
const JOIN_PX = 9;

function components(count: number, edges: readonly (readonly [number, number][])[]) {
  const label = new Int32Array(count).fill(-1);
  const sizes: number[] = [];
  for (let start = 0; start < count; start += 1) {
    if (label[start] !== -1 || !edges[start]!.length) continue;
    const id = sizes.length;
    let size = 0;
    const stack = [start];
    label[start] = id;
    while (stack.length) {
      const node = stack.pop()!;
      size += 1;
      for (const [next] of edges[node]!) {
        if (label[next] === -1) {
          label[next] = id;
          stack.push(next);
        }
      }
    }
    sizes.push(size);
  }
  return { label, sizes };
}

export function readStreetGraph(map: MapLibreMap, clear: Rect): StreetGraph {
  // 1. Raw pieces, clipped per tile; keep only what lies in the clear area.
  const inside = (x: number, y: number) => x >= clear.left && x <= clear.right && y >= clear.top && y <= clear.bottom;
  const segments: [Point, Point][] = [];
  for (const feature of map.queryRenderedFeatures({ layers: ROAD_LAYERS })) {
    const geometry = feature.geometry;
    const lines: number[][][] =
      geometry.type === "LineString" ? [geometry.coordinates] : geometry.type === "MultiLineString" ? geometry.coordinates : [];
    for (const line of lines) {
      const points = line.map((coordinate) => map.project([coordinate[0]!, coordinate[1]!]));
      for (let index = 1; index < points.length; index += 1) {
        const a = points[index - 1]!;
        const b = points[index]!;
        if (inside(a.x, a.y) && inside(b.x, b.y)) segments.push([{ x: a.x, y: a.y }, { x: b.x, y: b.y }]);
      }
    }
  }

  // 2. Weld vertices within WELD_PX (spatial hash), and count components
  //    with exact matching only, to report what the seams did.
  const nodes: Point[] = [];
  const exact = new Map<string, number>();
  const grid = new Map<string, number[]>();
  const cell = (value: number) => Math.floor(value / WELD_PX);
  const exactIds: [number, number][] = [];
  const exactNodes: Point[] = [];

  const exactId = (point: Point) => {
    const key = `${Math.round(point.x * 2)}:${Math.round(point.y * 2)}`;
    let id = exact.get(key);
    if (id === undefined) {
      id = exactNodes.length;
      exact.set(key, id);
      exactNodes.push(point);
    }
    return id;
  };

  const weldedId = (point: Point) => {
    const cx = cell(point.x);
    const cy = cell(point.y);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const id of grid.get(`${cx + dx}:${cy + dy}`) ?? []) {
          const node = nodes[id]!;
          if (Math.hypot(node.x - point.x, node.y - point.y) <= WELD_PX) return id;
        }
      }
    }
    const id = nodes.length;
    nodes.push(point);
    const key = `${cx}:${cy}`;
    grid.set(key, [...(grid.get(key) ?? []), id]);
    return id;
  };

  const edges: [number, number][][] = [];
  const link = (list: [number, number][][], a: number, b: number, length: number) => {
    while (list.length <= Math.max(a, b)) list.push([]);
    list[a]!.push([b, length]);
    list[b]!.push([a, length]);
  };
  const exactEdges: [number, number][][] = [];

  for (const [a, b] of segments) {
    const length = Math.hypot(a.x - b.x, a.y - b.y);
    const ea = exactId(a);
    const eb = exactId(b);
    if (ea !== eb) {
      exactIds.push([ea, eb]);
      link(exactEdges, ea, eb, length);
    }
    const wa = weldedId(a);
    const wb = weldedId(b);
    if (wa !== wb) link(edges, wa, wb, length);
  }
  while (edges.length < nodes.length) edges.push([]);
  while (exactEdges.length < exactNodes.length) exactEdges.push([]);

  // 3. Join dangling ends (degree 1) to the nearest other vertex nearby.
  nodes.forEach((node, id) => {
    if (edges[id]!.length !== 1) return;
    let best = -1;
    let bestDistance = JOIN_PX;
    const neighbour = edges[id]![0]![0];
    nodes.forEach((other, otherId) => {
      if (otherId === id || otherId === neighbour) return;
      const distance = Math.hypot(other.x - node.x, other.y - node.y);
      if (distance < bestDistance) {
        best = otherId;
        bestDistance = distance;
      }
    });
    if (best >= 0) link(edges, id, best, bestDistance);
  });

  const before = components(exactNodes.length, exactEdges);
  const after = components(nodes.length, edges);
  const largest = after.sizes.indexOf(Math.max(...after.sizes));
  const main = new Set<number>();
  after.label.forEach((label, id) => {
    if (label === largest) main.add(id);
  });

  return {
    nodes,
    edges,
    main,
    componentsBeforeWeld: before.sizes.length,
    componentsAfterWeld: after.sizes.length,
  };
}

/** Nearest node of the main component, or -1 if none within reach. */
export function nearestNode(graph: StreetGraph, point: Point, reach = 30) {
  let best = -1;
  let bestDistance = reach;
  for (const id of graph.main) {
    const node = graph.nodes[id]!;
    const distance = Math.hypot(node.x - point.x, node.y - point.y);
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

/** Dijkstra on the street graph; an empty path when no connection exists. */
export function shortestPath(graph: StreetGraph, from: number, to: number): Point[] {
  if (from < 0 || to < 0) return [];
  if (from === to) return [graph.nodes[from]!];
  const distance = new Float64Array(graph.nodes.length).fill(Infinity);
  const previous = new Int32Array(graph.nodes.length).fill(-1);
  const heap: [number, number][] = [[0, from]];
  distance[from] = 0;

  const push = (entry: [number, number]) => {
    heap.push(entry);
    let child = heap.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (heap[parent]![0] <= heap[child]![0]) break;
      [heap[parent], heap[child]] = [heap[child]!, heap[parent]!];
      child = parent;
    }
  };
  const pop = () => {
    const top = heap[0]!;
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < heap.length && heap[left]![0] < heap[smallest]![0]) smallest = left;
        if (right < heap.length && heap[right]![0] < heap[smallest]![0]) smallest = right;
        if (smallest === parent) break;
        [heap[parent], heap[smallest]] = [heap[smallest]!, heap[parent]!];
        parent = smallest;
      }
    }
    return top;
  };

  while (heap.length) {
    const [cost, node] = pop();
    if (node === to) break;
    if (cost > distance[node]!) continue;
    for (const [next, length] of graph.edges[node]!) {
      const candidate = cost + length;
      if (candidate < distance[next]!) {
        distance[next] = candidate;
        previous[next] = node;
        push([candidate, next]);
      }
    }
  }

  if (previous[to] === -1) return [];
  const path: Point[] = [];
  for (let node = to; node !== -1; node = previous[node]!) path.push(graph.nodes[node]!);
  return path.reverse();
}
