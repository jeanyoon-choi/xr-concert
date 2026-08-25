import type { ComponentType } from "react";
import { ConcertOneMobile } from "./1/mobile";
import { ConcertOneScreen } from "./1/screen";
import CameraCollageMobile from "./2/mobile";
import CameraCollageScreen from "./2/screen";

export const concertExperiments = [
  { slug: "1", label: "Wave / Particle", Mobile: ConcertOneMobile, Screen: ConcertOneScreen },
  { slug: "2", label: "Camera Collage", Mobile: CameraCollageMobile, Screen: CameraCollageScreen },
] as const;

export type ConcertExperimentSlug = (typeof concertExperiments)[number]["slug"];

type ConcertExperiment = {
  label: string;
  Mobile: ComponentType;
  Screen: ComponentType;
};

const experimentBySlug: Record<ConcertExperimentSlug, ConcertExperiment> = {
  "1": concertExperiments[0],
  "2": concertExperiments[1],
};

export function isConcertExperimentSlug(value: string): value is ConcertExperimentSlug {
  return value === "1" || value === "2";
}

export function getConcertExperiment(slug: ConcertExperimentSlug) {
  return experimentBySlug[slug];
}
