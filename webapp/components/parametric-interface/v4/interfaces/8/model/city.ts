// A fictional, fixed city in ground-plane pixels. Everything is derived from one
// seed so the map is identical on every load.

export type Point = { readonly x: number; readonly y: number };

export type Building = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
};

export type Park = {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type Road = {
  readonly id: string;
  readonly axis: "x" | "y";
  /** Centre line offset across the road. */
  readonly offset: number;
  readonly width: number;
  readonly major: boolean;
  readonly name: string | null;
};

export const PLANE_SIZE = 2800;
export const BLOCK = 172;
export const ORIGIN = 220;
export const GRID_LINES = 15;

const CITY_END = ORIGIN + (GRID_LINES - 1) * BLOCK;
const MAX_BUILDINGS = 118;

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function gridPoint(column: number, row: number): Point {
  return { x: ORIGIN + column * BLOCK, y: ORIGIN + row * BLOCK };
}

/** West of this x the city meets the bay. */
export function shoreX(y: number) {
  return ORIGIN + BLOCK * 1.55 + 118 * Math.sin(y / 410) + 46 * Math.sin(y / 133);
}

export function isLand(point: Point, margin = 0) {
  return point.x - margin > shoreX(point.y);
}

function isMajorLine(index: number) {
  return index % 4 === 2;
}

const avenueNames = ["Harbor Ave", "Linden Ave", "Morrow Ave", "Quay Ave"];
const streetNames = ["Vale St", "Quarry St", "Station St", "Orchard St"];

export const roads: readonly Road[] = Array.from({ length: GRID_LINES }, (_, index) => {
  const major = isMajorLine(index);
  const nameIndex = Math.floor(index / 4);
  return (["x", "y"] as const).map<Road>((axis) => ({
    id: `${axis}-${index}`,
    axis,
    offset: ORIGIN + index * BLOCK,
    width: major ? 26 : 14,
    major,
    name: major ? (axis === "y" ? avenueNames : streetNames)[nameIndex] ?? null : null,
  }));
}).flat();

function roadWidthAt(index: number) {
  return isMajorLine(index) ? 26 : 14;
}

export const cityBounds = { start: ORIGIN, end: CITY_END };

const parkCells: readonly (readonly [number, number])[] = [
  [6, 4],
  [6, 5],
  [10, 9],
  [4, 10],
  [11, 3],
];

export const parks: readonly Park[] = parkCells.map(([column, row]) => {
  const corner = gridPoint(column, row);
  const inset = roadWidthAt(column) / 2 + 4;
  return {
    id: `park-${column}-${row}`,
    x: corner.x + inset,
    y: corner.y + inset,
    width: BLOCK - inset * 2,
    height: BLOCK - inset * 2,
  };
});

function isParkCell(column: number, row: number) {
  return parkCells.some(([parkColumn, parkRow]) => parkColumn === column && parkRow === row);
}

function buildBuildings() {
  const random = mulberry32(20_241_206);
  const centre = (GRID_LINES - 1) / 2;
  const cells: [number, number][] = [];

  for (let row = 0; row < GRID_LINES - 1; row += 1) {
    for (let column = 0; column < GRID_LINES - 1; column += 1) {
      const corner = gridPoint(column, row);
      if (!isLand({ x: corner.x, y: corner.y + BLOCK / 2 }, 12)) continue;
      if (isParkCell(column, row)) continue;
      cells.push([column, row]);
    }
  }

  // Shuffle so the cap thins the whole city evenly rather than one edge.
  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [cells[index], cells[swap]] = [cells[swap]!, cells[index]!];
  }

  const buildings: Building[] = [];
  for (const [column, row] of cells) {
    if (buildings.length >= MAX_BUILDINGS) break;
    if (random() < 0.18) continue;

    const corner = gridPoint(column, row);
    const westInset = roadWidthAt(column) / 2 + 12;
    const eastInset = roadWidthAt(column + 1) / 2 + 12;
    const northInset = roadWidthAt(row) / 2 + 12;
    const southInset = roadWidthAt(row + 1) / 2 + 12;
    const interiorWidth = BLOCK - westInset - eastInset;
    const interiorDepth = BLOCK - northInset - southInset;
    const width = Math.round(interiorWidth * (0.48 + random() * 0.42));
    const depth = Math.round(interiorDepth * (0.48 + random() * 0.42));
    const distance = Math.hypot(column + 0.5 - centre, row + 0.5 - centre);
    const downtown = Math.exp(-(distance * distance) / (2 * 2.6 * 2.6));

    buildings.push({
      id: `building-${column}-${row}`,
      x: Math.round(corner.x + westInset + random() * (interiorWidth - width)),
      y: Math.round(corner.y + northInset + random() * (interiorDepth - depth)),
      width,
      depth,
      height: Math.round(16 + random() * 34 + downtown * (70 + random() * 90)),
    });
  }

  // Paint far (north) rows first; the browser still depth-sorts the 3D faces.
  return buildings.sort((first, second) => first.y - second.y);
}

export const buildings: readonly Building[] = buildBuildings();

export function shorelinePath() {
  const steps = 56;
  const points = Array.from({ length: steps + 1 }, (_, index) => {
    const y = (PLANE_SIZE / steps) * index;
    return `${shoreX(y).toFixed(1)} ${y.toFixed(1)}`;
  });
  return `M0 0 L${points.join(" L")} L0 ${PLANE_SIZE} Z`;
}
