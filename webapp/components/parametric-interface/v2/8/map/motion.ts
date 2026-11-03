import type { TimedLyricLine } from "../../model/song";
import type { Journey } from "./journey";
import type { Point } from "./streets";

// How a line's trip looks at one instant of the song, computed only from the
// audio clock so a seek lands on exactly the frame playback would show.
// When word k is sung its place appears with that word; the leg from place
// k-1 is drawn along the streets at a steady speed, easing out at the end,
// within ~800 ms or before the next word, whichever is sooner. On arrival the
// red pin drops onto place k and place k-1 becomes a waypoint circle.

const LEG_MAX_MS = 800;
const LEG_MIN_MS = 140;
const PLACE_IN_MS = 160;
const PIN_DROP_MS = 340;
export const LINE_FADE_MS = 250;

export type TripFrame = {
  /** Visible part of each leg, in order. */
  readonly legs: readonly (readonly Point[])[];
  /** Places on the map: id, word index and fade-in opacity. */
  readonly places: readonly { id: string; word: number; opacity: number }[];
  /** Places shown as Google's stop circles (origin first). */
  readonly waypoints: readonly string[];
  /** The red pin: place id, its word index and the pin's vertical offset (px). */
  readonly destination: { id: string; word: number; dropY: number } | null;
};

const EMPTY: TripFrame = { legs: [], places: [], waypoints: [], destination: null };

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

// Steady speed along the street, easing only over the last stretch.
function drawEase(t: number) {
  if (t < 0.8) return t * (0.92 / 0.8);
  const tail = (t - 0.8) / 0.2;
  return 0.92 + 0.08 * (1 - (1 - tail) ** 2);
}

// Google's pin drop: a short fall, then a small settle.
function pinDropY(t: number) {
  if (t >= 1) return 0;
  if (t < 0.65) return -18 * (1 - t / 0.65) ** 2;
  return -2.5 * Math.sin(((t - 0.65) / 0.35) * Math.PI);
}

function lengthsOf(points: readonly Point[]) {
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    lengths.push(lengths[index - 1]! + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return lengths;
}

/** The first `amount` (0–1) of a polyline, cut by length. */
export function slicePolyline(points: readonly Point[], amount: number): Point[] {
  if (amount >= 1 || points.length < 2) return [...points];
  const lengths = lengthsOf(points);
  const target = lengths[lengths.length - 1]! * Math.max(0, amount);
  const out: Point[] = [points[0]!];
  for (let index = 1; index < points.length; index += 1) {
    if (lengths[index]! <= target) {
      out.push(points[index]!);
      continue;
    }
    const a = points[index - 1]!;
    const b = points[index]!;
    const span = lengths[index]! - lengths[index - 1]!;
    const share = span > 0 ? (target - lengths[index - 1]!) / span : 0;
    out.push({ x: a.x + (b.x - a.x) * share, y: a.y + (b.y - a.y) * share });
    break;
  }
  return out;
}

export function tripFrame(
  journey: Journey,
  line: TimedLyricLine | undefined,
  nextLineStartMs: number,
  clockMs: number,
  sungCount: number,
  reducedMotion: boolean,
): TripFrame {
  if (!line || sungCount <= 0 || !journey.stops.length) return EMPTY;
  const count = Math.min(sungCount, journey.stops.length);
  const onset = (index: number) => line.words[index]!.startMs;
  const nextOnset = (index: number) => line.words[index + 1]?.startMs ?? Math.max(line.endMs, nextLineStartMs);
  const legDuration = (index: number) =>
    Math.max(LEG_MIN_MS, Math.min(LEG_MAX_MS, nextOnset(index) - onset(index)));
  // Place k is reached when its leg finishes; the first place at its onset.
  const arrival = (index: number) => (index === 0 ? onset(0) : onset(index) + legDuration(index));

  const legs: Point[][] = [];
  for (let index = 1; index < count; index += 1) {
    const path = journey.legs[index - 1];
    if (!path?.length) continue;
    const progress = reducedMotion ? 1 : drawEase(clamp01((clockMs - onset(index)) / legDuration(index)));
    legs.push(progress >= 1 ? [...path] : slicePolyline(path, progress));
  }

  let reached = 0;
  for (let index = 0; index < count; index += 1) {
    if (reducedMotion || clockMs >= arrival(index)) reached = index;
  }

  const places = journey.stops.slice(0, count).map((id, index) => ({
    id,
    word: index,
    opacity: reducedMotion ? 1 : clamp01((clockMs - onset(index)) / PLACE_IN_MS),
  }));

  const dropT = reducedMotion ? 1 : clamp01((clockMs - arrival(reached)) / PIN_DROP_MS);
  return {
    legs,
    places,
    waypoints: journey.stops.slice(0, reached),
    destination: { id: journey.stops[reached]!, word: reached, dropY: pinDropY(dropT) },
  };
}
