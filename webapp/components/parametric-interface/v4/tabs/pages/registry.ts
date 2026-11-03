// The tab pages the score can assign. Add a page by giving it a folder under
// pages/, a TabState name in model/score.ts, and an entry here.

import type { ComponentType } from "react";
import type { TabState } from "../../model/score";
import BillboardPage from "./billboard";
import NewsPage from "./news";
import SearchPage from "./search";
import type { TabPageProps } from "./types";

export type TabPageDefinition = {
  readonly id: TabState;
  readonly label: string;
  readonly Page: ComponentType<TabPageProps>;
  /** The address the window shows, from the line in its slot. */
  readonly address: (slugged: string) => string;
};

export const TAB_PAGES: Readonly<Record<TabState, TabPageDefinition>> = {
  search: { id: "search", label: "Search", Page: SearchPage, address: (q) => `lookup.search/?q=${q || ""}` },
  news: { id: "news", label: "News", Page: NewsPage, address: (q) => `eveningline.news/live/${q || "tonight"}` },
  billboard: { id: "billboard", label: "Billboard", Page: BillboardPage, address: () => "tilltheend.city" },
};
