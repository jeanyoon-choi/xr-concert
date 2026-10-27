import type { NavigationArea } from "./areas";

export type NavigationExperiment = {
  /** Stable id: the canonical route path without its leading slash. */
  key: string;
  area: NavigationArea;
  /** Group path inside the area, e.g. `parametric-interface/v2`. */
  family: string;
  /** ISO date the experiment was created. */
  date: string;
  /**
   * ISO date of its latest major revision. The date view lists the experiment
   * under this date instead of `date`.
   */
  updated?: string;
  phrase: string;
};

export type NavigationItem = Omit<NavigationExperiment, "updated"> & {
  /** Creation date when the list date is a later revision. */
  created?: string;
};

const parametricV1 = "parametric-interface/v1";
const parametricV2 = "parametric-interface/v2";

// Dates and phrases for every routed experiment. Each version directory owns
// its code; this index only names it.
export const navigationExperiments: readonly NavigationExperiment[] = [
  { key: parametricV1, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "U2 — You're the Best Thing About Me, one lyric moving through interfaces 1–6" },
  { key: `${parametricV1}/1`, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "Binary response field" },
  { key: `${parametricV1}/2`, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "Lyric words held in individual spreadsheet centre-row cells" },
  { key: `${parametricV1}/3`, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "macOS menu-bar field with a central lyric" },
  { key: `${parametricV1}/4`, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "Fixed high-density departure FIDS with lyric destinations" },
  { key: `${parametricV1}/5`, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "Gmail inbox where starred mail accumulates and lyric messages arrive in the stream" },
  { key: `${parametricV1}/6`, area: "parametric-interface", family: parametricV1, date: "2026-09-01", phrase: "zsh terminal line with lyric developed inside a printf argument" },
  { key: parametricV2, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "ROSÉ — toxic till the end, one lyric moving through interfaces 1–6" },
  { key: `${parametricV2}/1`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Binary response field" },
  { key: `${parametricV2}/2`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Lyric words held in individual spreadsheet centre-row cells" },
  { key: `${parametricV2}/3`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "macOS menu-bar field with a central lyric" },
  { key: `${parametricV2}/4`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Fixed high-density departure FIDS with lyric destinations" },
  { key: `${parametricV2}/5`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Gmail inbox where starred mail accumulates and lyric messages arrive in the stream" },
  { key: `${parametricV2}/6`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "zsh terminal line with lyric developed inside a printf argument" },
  { key: "face-voronoi/1", area: "face-voronoi", family: "face-voronoi", date: "2026-09-01", phrase: "Living portrait photographs clipped to changing Voronoi territories" },
  { key: "face-voronoi/2", area: "face-voronoi", family: "face-voronoi", date: "2026-09-01", phrase: "Living Voronoi population pulse with monochrome, face, and politician renderers" },
  { key: "face-voronoi/3", area: "face-voronoi", family: "face-voronoi", date: "2026-09-01", phrase: "Moving Voronoi material field with colour and portrait-gradient modes" },
];

function toNavigationItem({ updated, ...experiment }: NavigationExperiment): NavigationItem {
  return updated ? { ...experiment, date: updated, created: experiment.date } : experiment;
}

export function getNavigationItems(area?: NavigationArea) {
  return navigationExperiments
    .filter((experiment) => !area || experiment.area === area)
    .map(toNavigationItem);
}
