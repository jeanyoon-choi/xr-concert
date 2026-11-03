// Polyline helpers. Every wire in the schematic is an orthogonal polyline in
// the 1600 × 900 viewBox; packets and flow dots are placed by arc length.

export type Point = readonly [number, number];
export type Polyline = readonly Point[];

export function reversePath(path: Polyline): Polyline {
  return [...path].reverse();
}

/** Joins polylines, dropping the duplicated point where two segments meet. */
export function joinPaths(...paths: Polyline[]): Polyline {
  const joined: Point[] = [];
  for (const path of paths) {
    for (const point of path) {
      const last = joined[joined.length - 1];
      if (last && last[0] === point[0] && last[1] === point[1]) continue;
      joined.push(point);
    }
  }
  return joined;
}

export function pathLength(path: Polyline): number {
  let length = 0;
  for (let index = 1; index < path.length; index += 1) {
    length += Math.hypot(path[index][0] - path[index - 1][0], path[index][1] - path[index - 1][1]);
  }
  return length;
}

/** Point at arc length `distance` (clamped) along the path. */
export function pointAt(path: Polyline, distance: number): Point {
  if (path.length === 0) return [0, 0];
  let remaining = Math.max(0, distance);
  for (let index = 1; index < path.length; index += 1) {
    const [x0, y0] = path[index - 1];
    const [x1, y1] = path[index];
    const segment = Math.hypot(x1 - x0, y1 - y0);
    if (remaining <= segment && segment > 0) {
      const ratio = remaining / segment;
      return [x0 + (x1 - x0) * ratio, y0 + (y1 - y0) * ratio];
    }
    remaining -= segment;
  }
  return path[path.length - 1];
}

/** The leading part of a path up to arc length `distance`. */
export function slicePath(path: Polyline, distance: number): Polyline {
  if (path.length === 0) return path;
  const sliced: Point[] = [path[0]];
  let remaining = Math.max(0, distance);
  for (let index = 1; index < path.length; index += 1) {
    const [x0, y0] = path[index - 1];
    const [x1, y1] = path[index];
    const segment = Math.hypot(x1 - x0, y1 - y0);
    if (remaining >= segment) {
      sliced.push(path[index]);
      remaining -= segment;
      continue;
    }
    const ratio = segment > 0 ? remaining / segment : 0;
    sliced.push([x0 + (x1 - x0) * ratio, y0 + (y1 - y0) * ratio]);
    break;
  }
  return sliced;
}

export function toSvgPoints(path: Polyline): string {
  return path.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}
