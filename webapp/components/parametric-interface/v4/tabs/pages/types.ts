// The contract every tab page in v4/tabs meets (pages/<state>/index.tsx).
//
// A page is one ordinary website filling a browser window. Like a v2
// interface, it takes the sung lines — oldest first, the last one growing
// word by word — into its own semantic slots: a search query and its
// results, a headline and its standfirst, a poster. It lays itself out in
// CSS px against its container (container-type: size), never the viewport,
// so the same page renders in a real window and, zoomed, in the controller's
// preview and the composition. It may be interactive; it never plays audio.
// The host, not the page, writes the tab title.

import type { SungLine } from "../../model/lines";

export type TabPageProps = {
  readonly seat: number;
  readonly lines: readonly SungLine[];
  /** Status time for the song moment, “21:31”. */
  readonly clock: string;
};

/** Lines a page may need: the longest history any page keeps. */
export const PAGE_HISTORY = 6;
