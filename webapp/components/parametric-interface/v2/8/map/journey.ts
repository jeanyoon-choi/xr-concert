import type { PoiLabel } from "./labels";
import { nearestNode, shortestPath, type Point, type Rect, type StreetGraph } from "./streets";

// One sung line is one trip through Midtown. Each word of the line takes over
// one place on the map, in sung order. A place qualifies only if it is on
// Manhattan island, inside the clear map area (with room for its label) and
// reachable on the street network; each next place is the nearest qualifying
// place beyond a short hop whose leg actually routes. Everything is a pure
// function of the cue and the drawn map, so a seek rebuilds the same trip.

const MIN_HOP_PX = 60;
const LABEL_ROOM_PX = 120;

// Manhattan island's shoreline (lng, lat), simplified; excludes New Jersey,
// Queens, Brooklyn, Roosevelt Island and the piers beyond the bulkhead line.
const MANHATTAN: readonly (readonly [number, number])[] = [
  [-74.0170, 40.7005], [-74.0190, 40.7090], [-74.0140, 40.7200], [-74.0105, 40.7340],
  [-74.0085, 40.7480], [-74.0030, 40.7580], [-73.9945, 40.7680], [-73.9880, 40.7800],
  [-73.9780, 40.7950], [-73.9665, 40.8100], [-73.9550, 40.8280], [-73.9470, 40.8500],
  [-73.9290, 40.8710], [-73.9230, 40.8790], [-73.9100, 40.8730], [-73.9210, 40.8600],
  [-73.9340, 40.8350], [-73.9330, 40.8150], [-73.9290, 40.8010], [-73.9380, 40.7900],
  [-73.9420, 40.7800], [-73.9480, 40.7700], [-73.9580, 40.7600], [-73.9680, 40.7500],
  [-73.9730, 40.7400], [-73.9720, 40.7300], [-73.9740, 40.7200], [-73.9770, 40.7120],
  [-73.9990, 40.7080], [-74.0110, 40.7030],
];

export function inManhattan(lng: number, lat: number) {
  let inside = false;
  for (let i = 0, j = MANHATTAN.length - 1; i < MANHATTAN.length; j = i, i += 1) {
    const [xi, yi] = MANHATTAN[i]!;
    const [xj, yj] = MANHATTAN[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export type Journey = {
  /** POI ids in sung order, one per word of the line. */
  readonly stops: readonly string[];
  /** Street path from stop k to stop k + 1; every leg is routed. */
  readonly legs: readonly (readonly Point[])[];
};

export function journeyFor(
  pois: readonly PoiLabel[],
  graph: StreetGraph | null,
  clear: Rect | null,
  cueIndex: number,
  wordCount: number,
): Journey {
  if (!graph || !clear || wordCount === 0) return { stops: [], legs: [] };

  const places = pois
    .filter((poi) => poi.category !== "transit" && inManhattan(poi.lng, poi.lat))
    .filter((poi) => poi.x >= clear.left && poi.x <= clear.right - LABEL_ROOM_PX && poi.y >= clear.top + 12 && poi.y <= clear.bottom - 12)
    .map((poi) => ({ poi, node: nearestNode(graph, poi) }))
    .filter((place) => place.node >= 0);
  if (!places.length) return { stops: [], legs: [] };

  const leg = (from: (typeof places)[number], to: (typeof places)[number]) => {
    const path = shortestPath(graph, from.node, to.node);
    return path.length ? [{ x: from.poi.x, y: from.poi.y }, ...path, { x: to.poi.x, y: to.poi.y }] : [];
  };

  const order = [places[(cueIndex * 7) % places.length]!];
  const legs: Point[][] = [];

  while (order.length < wordCount) {
    const last = order[order.length - 1]!;
    const unused = places.filter((place) => !order.includes(place));
    const pool = unused.length ? unused : places.filter((place) => place !== last);
    const distance = (place: (typeof places)[number]) => Math.hypot(place.poi.x - last.poi.x, place.poi.y - last.poi.y);
    const ranked = [...pool].sort((a, b) => {
      const farA = distance(a) >= MIN_HOP_PX ? 0 : 1;
      const farB = distance(b) >= MIN_HOP_PX ? 0 : 1;
      return farA - farB || distance(a) - distance(b);
    });

    // Take the nearest place whose leg routes; never draw an empty leg.
    let chosen: (typeof places)[number] | null = null;
    let path: Point[] = [];
    for (const candidate of ranked) {
      path = leg(last, candidate);
      if (path.length) {
        chosen = candidate;
        break;
      }
    }
    if (!chosen) break;
    order.push(chosen);
    legs.push(path);
  }

  return { stops: order.map((place) => place.poi.id), legs };
}

/** A lyric word as a place name: outer punctuation dropped, first letter capital. */
export function placeName(word: string) {
  const bare = word.replace(/^["“‘(]+|[,.;:!?"”’)]+$/g, "");
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}
