"use client";

import { memo } from "react";
import { formatSongClock, SONG_DATE } from "../../../model/clock-face";
import { plain } from "../../../model/lines";
import type { TabPageProps } from "../types";
import styles from "./news.module.css";

// A newspaper's live page. The line being sung is set as the lead headline,
// word by word; the line before it becomes the standfirst, and earlier lines
// run down the “Latest” column with their times. Before the song it waits
// for the evening's lead.

const SECTIONS = ["World", "City", "Culture", "Music", "Opinion", "Style"] as const;
const BYLINES = ["By Hana Lee", "By Marcus Webb", "By Sora Kim", "By Elena Ruiz"] as const;

function NewsPage({ seat, lines, clock }: TabPageProps) {
  const current = lines.at(-1);
  const before = lines.at(-2);
  const latest = lines.slice(0, -1).reverse();

  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <span className={styles.edition}>{SONG_DATE}</span>
        <span className={styles.name}>The Evening Line</span>
        <span className={styles.edition}>Late edition · {clock}</span>
      </header>
      <nav className={styles.sections} aria-hidden="true">
        {SECTIONS.map((section, index) => (
          <span key={section} data-active={index === 3 || undefined}>
            {section}
          </span>
        ))}
      </nav>

      <div className={styles.body}>
        <article className={styles.lead}>
          <p className={styles.kicker}>
            <span className={styles.live}>Live</span>
            {current ? `Updated ${formatSongClock(current.startMs)}` : "Tonight, 21:30"}
          </p>
          <h1 className={styles.headline} key={current?.cueIndex ?? "idle"}>
            {current ? current.text : "The evening’s lead is about to break"}
          </h1>
          <p className={styles.standfirst}>
            {before ? plain(before.full) + "." : "Follow along as it happens."}
          </p>
          <p className={styles.byline}>{BYLINES[seat % BYLINES.length]}</p>
        </article>

        <aside className={styles.latest} aria-label="Latest">
          <h2>Latest</h2>
          <ol>
            {latest.length ? (
              latest.map((line) => (
                <li key={line.cueIndex}>
                  <time>{formatSongClock(line.startMs)}</time>
                  <span>{plain(line.full)}</span>
                </li>
              ))
            ) : (
              <li>
                <time>21:30</time>
                <span>Nothing yet tonight.</span>
              </li>
            )}
          </ol>
        </aside>
      </div>
    </div>
  );
}

export default memo(NewsPage);
