"use client";

import { memo } from "react";
import { slug, type SungLine } from "../../model/lines";
import type { TabState } from "../../model/score";
import { TAB_PAGES } from "../pages/registry";
import styles from "./frame.module.css";

// One browser window drawn in CSS px: the chrome a real window would have —
// traffic lights, its tab carrying the title, the address — around the page
// the score assigned. The controller's preview and the composition draw
// windows this way, at real size inside a zoomed desk, so they show exactly
// what the opened windows show.

export const FRAME_CHROME_HEIGHT = 78;

/** The tab title for a seat: the line being sung, as the real window sets it. */
export function tabTitle(lines: readonly SungLine[], state: TabState) {
  return lines.at(-1)?.text || TAB_PAGES[state].label;
}

function BrowserFrameView({
  seat,
  state,
  lines,
  clock,
  focused = false,
  strip,
}: {
  seat: number;
  state: TabState;
  lines: readonly SungLine[];
  clock: string;
  focused?: boolean;
  /** Other tabs of this window, after its own (the "tabs" layout). */
  strip?: readonly { readonly title: string; readonly state: TabState }[];
}) {
  const { Page, address } = TAB_PAGES[state];
  const current = lines.at(-1);

  return (
    <div className={styles.window} data-focused={focused || undefined} data-state={state}>
      <div className={styles.titlebar}>
        <span className={styles.lights} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.tab} data-active>
          <span className={styles.favicon} aria-hidden="true" data-state={state} />
          <span className={styles.tabTitle}>{tabTitle(lines, state)}</span>
        </span>
        {strip?.map((tab, index) => (
          <span key={index} className={styles.tab}>
            <span className={styles.favicon} aria-hidden="true" data-state={tab.state} />
            <span className={styles.tabTitle}>{tab.title}</span>
          </span>
        ))}
      </div>
      <div className={styles.toolbar}>
        <span className={styles.arrows} aria-hidden="true">
          ‹ ›
        </span>
        <span className={styles.address}>{address(current ? slug(current.text) : "")}</span>
      </div>
      <div className={styles.viewport} inert>
        <Page seat={seat} lines={lines} clock={clock} />
      </div>
    </div>
  );
}

export const BrowserFrame = memo(BrowserFrameView);
