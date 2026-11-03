import { BLOCK, GRID_LINES, gridPoint, isLand, mulberry32, type Point } from "./city";

export type MapCamera = {
  readonly x: number;
  readonly y: number;
  /** Map heading in degrees; 0 is north-up. */
  readonly rotation: number;
};

export type PlaceCategory = "cafe" | "restaurant" | "shopping" | "park" | "transit" | "landmark";

export type CuePlace = {
  readonly id: string;
  readonly name: string;
  readonly category: PlaceCategory;
  readonly point: Point;
};

export type CueRoute = {
  /** Street intersections the tracked person reaches, one per lyric word. */
  readonly waypoints: readonly Point[];
  readonly places: readonly CuePlace[];
  readonly camera: MapCamera;
};

const categories: readonly PlaceCategory[] = [
  "cafe",
  "restaurant",
  "shopping",
  "park",
  "transit",
  "landmark",
];

const directions = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

type Direction = (typeof directions)[number];

const WANDER = 3;
const PLACE_OFFSET = BLOCK * 0.24;

/** Lyric word as a map place name: outer punctuation removed, first letter capitalised. */
export function toPlaceName(word: string) {
  const trimmed = word.replace(/^[^\p{L}\p{N}]+/u, "").replace(/[^\p{L}\p{N}']+$/u, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function hashWord(word: string) {
  let hash = 2_166_136_261;
  for (const character of word.toLowerCase()) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619);
  }
  return hash >>> 0;
}

const routeCache = new Map<string, CueRoute>();

export function routeForCue(cueIndex: number, words: readonly string[]): CueRoute {
  const cacheKey = `${cueIndex}:${words.length}`;
  const cached = routeCache.get(cacheKey);
  if (cached) return cached;

  const random = mulberry32(cueIndex * 9_973 + 41);
  const landIntersections: [number, number][] = [];
  for (let row = 2; row <= GRID_LINES - 4; row += 1) {
    for (let column = 3; column <= GRID_LINES - 4; column += 1) {
      if (isLand(gridPoint(column, row), BLOCK * 0.6)) landIntersections.push([column, row]);
    }
  }

  const start = landIntersections[Math.floor(random() * landIntersections.length)]!;
  const cells: [number, number][] = [start];
  const visited = new Set([start.join(",")]);
  let heading: Direction | null = null;

  while (cells.length < words.length) {
    const [column, row] = cells.at(-1)!;
    const candidates = directions.filter(([dx, dy]) => {
      const nextColumn = column + dx;
      const nextRow = row + dy;
      return (
        Math.abs(nextColumn - start[0]) <= WANDER &&
        Math.abs(nextRow - start[1]) <= WANDER &&
        nextColumn >= 1 &&
        nextRow >= 1 &&
        nextColumn <= GRID_LINES - 2 &&
        nextRow <= GRID_LINES - 2 &&
        isLand(gridPoint(nextColumn, nextRow), BLOCK * 0.6)
      );
    });
    const unvisited = candidates.filter(
      ([dx, dy]) => !visited.has(`${column + dx},${row + dy}`),
    );
    const pool = unvisited.length > 0 ? unvisited : candidates;
    // Prefer continuing straight, like someone walking somewhere.
    const current: Direction | null = heading;
    const straight: Direction | undefined = current
      ? pool.find(([dx, dy]) => dx === current[0] && dy === current[1])
      : undefined;
    const step: Direction =
      straight && random() < 0.45 ? straight : pool[Math.floor(random() * pool.length)]!;

    heading = step;
    const next: [number, number] = [column + step[0], row + step[1]];
    visited.add(next.join(","));
    cells.push(next);
  }

  const waypoints = cells.map(([column, row]) => gridPoint(column, row));
  const places = waypoints.map((waypoint, index) => {
    const word = words[index]!;
    const hash = hashWord(`${word}:${cueIndex}:${index}`);
    let signX = hash & 1 ? 1 : -1;
    const signY = hash & 2 ? 1 : -1;
    if (!isLand({ x: waypoint.x + signX * PLACE_OFFSET, y: waypoint.y }, 18)) signX = 1;

    return {
      id: `place-${cueIndex}-${index}`,
      name: toPlaceName(word),
      category: categories[hashWord(word) % categories.length]!,
      point: {
        x: waypoint.x + signX * PLACE_OFFSET,
        y: waypoint.y + signY * PLACE_OFFSET,
      },
    };
  });

  const centroid = waypoints.reduce(
    (sum, point) => ({ x: sum.x + point.x / waypoints.length, y: sum.y + point.y / waypoints.length }),
    { x: 0, y: 0 },
  );
  const route = {
    waypoints,
    places,
    camera: { x: centroid.x, y: centroid.y + BLOCK * 0.35, rotation: (random() * 2 - 1) * 15 },
  };

  routeCache.set(cacheKey, route);
  return route;
}

export function lerpPoint(from: Point, to: Point, amount: number): Point {
  return { x: from.x + (to.x - from.x) * amount, y: from.y + (to.y - from.y) * amount };
}

export function lerpCamera(from: MapCamera, to: MapCamera, amount: number): MapCamera {
  return {
    ...lerpPoint(from, to, amount),
    rotation: from.rotation + (to.rotation - from.rotation) * amount,
  };
}
