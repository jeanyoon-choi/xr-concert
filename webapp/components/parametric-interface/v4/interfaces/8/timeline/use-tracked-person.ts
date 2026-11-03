"use client";

import { LYRIC_LEAD_MS, useLyricCue } from "../../timeline/use-lyric-cue";
import type { Point } from "../model/city";
import { lerpCamera, lerpPoint, routeForCue, toPlaceName, type MapCamera } from "../model/route";

const CAMERA_PAN_MS = 900;
// Share of the way the camera leans from the route's centre toward the person,
// so the tracked pin never walks out of frame on a long route.
const CAMERA_FOLLOW = 0.4;

function easeInOut(amount: number) {
  return amount < 0.5 ? 2 * amount * amount : 1 - (-2 * amount + 2) ** 2 / 2;
}

function clamp01(amount: number) {
  return Math.min(1, Math.max(0, amount));
}

function framing(route: ReturnType<typeof routeForCue>, person: Point): MapCamera {
  return { ...route.camera, ...lerpPoint(route.camera, person, CAMERA_FOLLOW) };
}

/**
 * The tracked person walks the current cue's route: they reach word k's
 * waypoint at that word's onset and walk to word k + 1 until its onset.
 * Everything is a pure function of the audio clock.
 */
export function useTrackedPerson() {
  const {
    activeWordPosition,
    cueIndex,
    currentTimeMs,
    currentWord,
    lyric,
    lyricCues,
    reducedMotion,
    wordIndex,
    wordTimings,
  } = useLyricCue();

  const route = routeForCue(cueIndex, lyric);

  const timing = wordTimings[wordIndex]!;
  const nextTiming = wordTimings[wordIndex + 1];
  const clockMs = currentTimeMs + LYRIC_LEAD_MS;
  const walkAmount =
    !reducedMotion && nextTiming?.cueIndex === cueIndex
      ? clamp01((clockMs - timing.startMs) / timing.durationMs)
      : 0;
  const from = route.waypoints[activeWordPosition]!;
  const to = route.waypoints[activeWordPosition + 1] ?? from;
  const person = lerpPoint(from, to, walkAmount);

  // During a cue's last word the camera pans ahead to the next route, arriving
  // as that cue's first word lands, so new places never appear off-frame.
  const nextRoute =
    nextTiming && nextTiming.cueIndex !== cueIndex
      ? routeForCue(cueIndex + 1, lyricCues[cueIndex + 1]!)
      : null;
  const panAmount =
    nextTiming && nextRoute && !reducedMotion
      ? easeInOut(clamp01((clockMs - (nextTiming.startMs - CAMERA_PAN_MS)) / CAMERA_PAN_MS))
      : 0;
  const camera = nextRoute
    ? lerpCamera(framing(route, person), framing(nextRoute, nextRoute.waypoints[0]!), panAmount)
    : framing(route, person);

  return {
    camera,
    cueIndex,
    person,
    // Trail of where the person has been in this cue, ending at the live position.
    trail: [...route.waypoints.slice(0, activeWordPosition + 1), person],
    places: route.places,
    activeWordPosition,
    nearPlace: toPlaceName(currentWord),
  };
}
