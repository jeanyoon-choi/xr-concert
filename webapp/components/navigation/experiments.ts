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

const parametricV0 = "parametric-interface/v0";
// v1 is a frozen copy of v2 (2026-11-03); routed but deliberately not listed.
const parametricV2 = "parametric-interface/v2";
const parametricV4 = "parametric-interface/v4";
const parametricV3 = "parametric-interface/v3";

// Dates and phrases for every routed experiment. Each version directory owns
// its code; this index only names it.
export const navigationExperiments: readonly NavigationExperiment[] = [
  { key: parametricV0, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "U2 — You're the Best Thing About Me, one lyric moving through interfaces 1–6" },
  { key: `${parametricV0}/1`, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "Binary response field" },
  { key: `${parametricV0}/2`, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "Lyric words held in individual spreadsheet centre-row cells" },
  { key: `${parametricV0}/3`, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "macOS menu-bar field with a central lyric" },
  { key: `${parametricV0}/4`, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "Fixed high-density departure FIDS with lyric destinations" },
  { key: `${parametricV0}/5`, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "Gmail inbox where starred mail accumulates and lyric messages arrive in the stream" },
  { key: `${parametricV0}/6`, area: "parametric-interface", family: parametricV0, date: "2026-09-01", phrase: "zsh terminal line with lyric developed inside a printf argument" },
  { key: parametricV2, area: "parametric-interface", family: parametricV2, date: "2026-10-27", updated: "2026-11-03", phrase: "ROSÉ — toxic till the end, one lyric moving through interfaces 1–10, led by the newspaper homepage and the plan chart" },
  { key: `${parametricV2}/1`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Binary response field" },
  { key: `${parametricV2}/2`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Lyric words held in individual spreadsheet centre-row cells" },
  { key: `${parametricV2}/3`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "macOS menu-bar field with a central lyric" },
  { key: `${parametricV2}/4`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Fixed high-density departure FIDS with lyric destinations" },
  { key: `${parametricV2}/5`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "Gmail inbox where starred mail accumulates and lyric messages arrive in the stream" },
  { key: `${parametricV2}/6`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", phrase: "zsh terminal line with lyric developed inside a printf argument" },
  { key: `${parametricV2}/7`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", updated: "2026-11-03", phrase: "Messages where every conversation row is a word of the sung line, the sung word selected, and each word arrives as its own bubble" },
  { key: `${parametricV2}/8`, area: "parametric-interface", family: parametricV2, date: "2026-10-27", updated: "2026-11-03", phrase: "Find My where every person is a word of the sung line, the sung word selected and located, and lyric words are the places on the 3D map" },
  { key: `${parametricV2}/9`, area: "parametric-interface", family: parametricV2, date: "2026-11-03", phrase: "nytimes.com homepage where the sung line is the lead headline and earlier lines step down the headline slots" },
  { key: `${parametricV2}/10`, area: "parametric-interface", family: parametricV2, date: "2026-11-03", phrase: "Dense one-sheet plan chart in the 1989 Integrated Space Plan grammar; every element is a line of the song, and the sung line's elements become the critical path" },
  { key: parametricV3, area: "parametric-interface", family: parametricV3, date: "2026-11-03", phrase: "ROSÉ — toxic till the end, parametric interfaces placed inside 3D scenes" },
  { key: `${parametricV3}/1`, area: "parametric-interface", family: parametricV3, date: "2026-11-03", phrase: "The v2/4 departures display on a freestanding TV in a departures hall, seen at eye level" },
  { key: `${parametricV3}/2`, area: "parametric-interface", family: parametricV3, date: "2026-11-03", phrase: "Euljiro back alley at dusk where every projecting sign shows the sung word at once" },
  { key: `${parametricV3}/3`, area: "parametric-interface", family: parametricV3, date: "2026-11-03", phrase: "Daechi-dong academy street at 10 p.m. whose academy signs read the sung line one word per sign along each row" },
  { key: parametricV4, area: "parametric-interface", family: parametricV4, date: "2026-11-03", phrase: "ROSÉ — toxic till the end across many phones and many browser windows" },
  { key: `${parametricV4}/1`, area: "parametric-interface", family: parametricV4, date: "2026-11-03", phrase: "A grid of phones: seventeen hyper-real chat and social apps, each taking the sung line in its own slot" },
  { key: `${parametricV4}/3`, area: "parametric-interface", family: parametricV4, date: "2026-11-03", phrase: "Twenty-nine hyper-real text interfaces — voicemail, mail, search, 지식iN, 에브리타임, 당근, a camera roll — moving together by lyric passage" },
  { key: `${parametricV4}/tabs`, area: "parametric-interface", family: parametricV4, date: "2026-11-03", phrase: "Controller that opens real browser windows, each running one of v2's interfaces on the controller's clock" },
  { key: "face-voronoi/1", area: "face-voronoi", family: "face-voronoi", date: "2026-09-01", phrase: "Living portrait photographs clipped to changing Voronoi territories" },
  { key: "face-voronoi/2", area: "face-voronoi", family: "face-voronoi", date: "2026-09-01", phrase: "Living Voronoi population pulse with monochrome, face, and politician renderers" },
  { key: "face-voronoi/3", area: "face-voronoi", family: "face-voronoi", date: "2026-09-01", phrase: "Moving Voronoi material field with colour and portrait-gradient modes" },
  { key: "schematic/1", area: "schematic", family: "schematic", date: "2026-11-03", phrase: "The concert as one circuit: where sound leaves devices and how signal travels between stage, remote performers, and phones" },
  { key: "schematic/2", area: "schematic", family: "schematic", date: "2026-11-03", phrase: "One direct trace per sender and receiver, routed like a printed schematic; select senders to send along their own traces" },
  { key: "schematic/3", area: "schematic", family: "schematic", date: "2026-11-03", phrase: "The whole concert system on one drawing sheet: mixer, laptop, server, screen, remote sites, and every phone, wired by layer" },
];

function toNavigationItem({ updated, ...experiment }: NavigationExperiment): NavigationItem {
  return updated ? { ...experiment, date: updated, created: experiment.date } : experiment;
}

export function getNavigationItems(area?: NavigationArea) {
  return navigationExperiments
    .filter((experiment) => !area || experiment.area === area)
    .map(toNavigationItem);
}
