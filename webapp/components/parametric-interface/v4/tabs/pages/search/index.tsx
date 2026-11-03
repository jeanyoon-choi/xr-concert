"use client";

import { memo, useState } from "react";
import { plain, slug } from "../../../model/lines";
import type { TabPageProps } from "../types";
import styles from "./search.module.css";

// A search engine results page. The line being sung is typed into the query
// box word by word; the lines before it come back as the results, newest
// first, each under a site of its own with the line before it as the
// snippet. Before the song it is the engine's empty home. The box is real:
// what the participant types replaces the sung query until they clear it.

const SITES = ["nightline.press", "the-ex.blog", "afterhours.fm", "chessclub.net", "late-replies.com", "screenshots.archive"] as const;
const TABS = ["All", "Images", "News", "Videos", "Shopping", "More"] as const;

function Wordmark({ large }: { large?: boolean }) {
  return (
    <span className={styles.wordmark} data-large={large || undefined}>
      look<b>up</b>
    </span>
  );
}

function Lens() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18">
      <circle cx="8.5" cy="8.5" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m13 13 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchPage({ seat, lines }: TabPageProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const current = lines.at(-1);
  const sung = current ? plain(current.text) : "";
  const query = draft ?? sung;
  const results = lines.slice(0, -1).reverse();

  const box = (
    <label className={styles.box}>
      <span className={styles.lens}>
        <Lens />
      </span>
      <span className={styles.visuallyHidden}>Search</span>
      <input value={query} onChange={(event) => setDraft(event.target.value || null)} autoComplete="off" spellCheck={false} />
      {draft !== null ? (
        <button type="button" className={styles.clear} onClick={() => setDraft(null)} aria-label="Clear">
          ×
        </button>
      ) : null}
    </label>
  );

  if (!current) {
    return (
      <div className={styles.page}>
        <div className={styles.home}>
          <Wordmark large />
          {box}
          <div className={styles.homeButtons} aria-hidden="true">
            <span>Lookup Search</span>
            <span>I’m Feeling Lucky</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.top}>
        <Wordmark />
        {box}
      </header>
      <nav className={styles.tabs} aria-hidden="true">
        {TABS.map((tab, index) => (
          <span key={tab} data-active={index === 0 || undefined}>
            {tab}
          </span>
        ))}
      </nav>
      <p className={styles.stats}>
        About {(((current.cueIndex + 3) * 7_919 + seat * 131) % 900 + 100).toLocaleString("en-US")},000 results (0.{(current.cueIndex % 6) + 2}1 seconds)
      </p>
      <ol className={styles.results}>
        {results.length ? (
          results.map((line, index) => {
            const site = SITES[(line.cueIndex + seat) % SITES.length]!;
            const before = lines[lines.indexOf(line) - 1];
            return (
              <li key={line.cueIndex} className={styles.result} data-fresh={index === 0 || undefined}>
                <span className={styles.site}>
                  <span className={styles.favicon} aria-hidden="true">
                    {site[0]!.toUpperCase()}
                  </span>
                  <span>
                    <span className={styles.siteName}>{site}</span>
                    <span className={styles.url}>
                      https://{site} › {slug(line.full).split("-").slice(0, 3).join("-")}
                    </span>
                  </span>
                </span>
                <h3 className={styles.title}>{plain(line.full)}</h3>
                <p className={styles.snippet}>
                  <span>Nov 3, 2026 — </span>
                  {before ? `… ${plain(before.full)} …` : "Tonight, 21:30. The song begins."}
                </p>
              </li>
            );
          })
        ) : (
          <li className={styles.result}>
            <p className={styles.snippet}>Searching…</p>
          </li>
        )}
      </ol>
    </div>
  );
}

export default memo(SearchPage);
