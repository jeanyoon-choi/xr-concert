"use client";

import { useLayoutEffect, useState } from "react";
import type { ParametricSong, TimedLyricLine } from "../model/song";
import { SongPlayback } from "../playback";
import { LYRIC_LEAD_MS, useLyricCue } from "../timeline/use-lyric-cue";
import {
  EDITIONS,
  headlineCase,
  homepageStories,
  SECTIONS,
  TODAY,
  type HomepageStory,
} from "./model/front-page";
import { CHEVRON_POINTS, MASTHEAD_PATH, MASTHEAD_VIEWBOX, SEARCH_PATH } from "./model/masthead";
import styles from "./front-page.module.css";

// The nytimes.com desktop homepage, measured from the live page at 1322 px
// wide (2026-11-03) and scaled as one fixed-format page to the viewport.
// Every headline on the page is the line being sung, set word by word at
// each onset, all at once; every summary is the line before it. Before the
// first sung word each slot keeps its own copy. Read times and photos never
// change. Everything derives from the audio clock, so a seek rebuilds the
// same page.

const DESIGN_WIDTH = 1322;

type Headline =
  | { kind: "story"; text: string }
  | { kind: "lyric"; line: TimedLyricLine; sungUntilMs: number; titleCase: boolean };

type TextField = "headline" | "summary";

function textAt(
  storyIndex: number,
  field: TextField,
  lines: readonly TimedLyricLine[],
  cueIndex: number,
  clockMs: number,
  hasBegun: boolean,
): Headline {
  const story = homepageStories[storyIndex]!;
  const own = { kind: "story", text: field === "headline" ? story.headline : story.summary ?? "" } as const;
  if (!hasBegun) return own;

  if (field === "headline") {
    return { kind: "lyric", line: lines[cueIndex]!, sungUntilMs: clockMs, titleCase: true };
  }

  const previous = lines[cueIndex - 1];
  return previous
    ? { kind: "lyric", line: previous, sungUntilMs: Number.POSITIVE_INFINITY, titleCase: false }
    : own;
}

function HeadlineText({ headline }: { headline: Headline }) {
  if (headline.kind === "story") return headline.text;

  // The lead holds only the words sung so far; the story below moves down as
  // the headline grows, as a live homepage update does.
  const sung = headline.line.words.filter((word) => word.startMs <= headline.sungUntilMs);
  return sung
    .map((word, index) => (headline.titleCase ? headlineCase(word.text, index === 0) : word.text))
    .join(" ")
    // The homepage sets typographic quotes and apostrophes.
    .replace(/(^|\s)"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/'/g, "’");
}

function Story({
  story,
  headline,
  summary,
  headlineClass,
}: {
  story: HomepageStory;
  headline: Headline;
  summary: Headline;
  headlineClass: string;
}) {
  return (
    <>
      <p className={headlineClass}><HeadlineText headline={headline} /></p>
      {story.summary ? <p className={styles.summary}><HeadlineText headline={summary} /></p> : null}
      <p className={styles.readTime}>{story.readMinutes} min read</p>
    </>
  );
}

function Photo({ story, className }: { story: HomepageStory; className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.image} ${className}`}
      style={story.image ? { backgroundImage: `url(${story.image})` } : undefined}
    />
  );
}

function usePageZoom() {
  const [frame, setFrame] = useState({ zoom: 1, height: 0 });

  useLayoutEffect(() => {
    const update = () => {
      const zoom = window.innerWidth / DESIGN_WIDTH;
      setFrame({ zoom, height: window.innerHeight / zoom });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return frame;
}

export default function ParametricInterfaceNine({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <Homepage />
    </SongPlayback>
  );
}

function Homepage() {
  const { cueIndex, currentTimeMs, hasStarted, song } = useLyricCue();
  const { zoom, height } = usePageZoom();
  const clockMs = currentTimeMs + LYRIC_LEAD_MS;
  const firstOnsetMs = song.lyrics[0]?.startMs ?? 0;
  const hasBegun = hasStarted && clockMs >= firstOnsetMs;
  const [lead, picture, second, third, feature, tileLeft, tileRight, rowLeft, rowRight] = homepageStories;
  const text = (storyIndex: number) => ({
    headline: textAt(storyIndex, "headline", song.lyrics, cueIndex, clockMs, hasBegun),
    summary: textAt(storyIndex, "summary", song.lyrics, cueIndex, clockMs, hasBegun),
  });

  return (
    <main className={styles.page} style={{ zoom, height: height || undefined }}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div aria-hidden="true" className={styles.topBar}>
            <svg aria-hidden="true" className={styles.search} viewBox="0 0 16 16">
              <path d={SEARCH_PATH} fill="#333" />
            </svg>
            <ul className={styles.editions}>
              {EDITIONS.map((edition, index) => (
                <li data-active={index === 0 || undefined} key={edition}>{edition}</li>
              ))}
            </ul>
            <span className={styles.login}>Log in</span>
          </div>

          <div className={styles.mastheadRow}>
            <div className={styles.dateBlock}>
              <span>{TODAY}</span>
              <span>Today’s Paper</span>
            </div>
            <svg aria-label="The New York Times" className={styles.masthead} role="img" viewBox={MASTHEAD_VIEWBOX}>
              <path d={MASTHEAD_PATH} fill="#000" />
            </svg>
            <span />
          </div>

          <nav aria-label="Sections" className={styles.sections}>
            {SECTIONS.map((section) => (
              <span className={styles.section} key={section}>
                {section}
                <svg aria-hidden="true" className={styles.chevron} viewBox="0 0 13 8">
                  <polygon points={CHEVRON_POINTS} />
                </svg>
              </span>
            ))}
          </nav>
          <div aria-hidden="true" className={styles.doubleRule} />

        </header>

        <div className={styles.front}>
          <section className={styles.topStories}>
            <div className={styles.leftColumn}>
              <article className={styles.story}>
                <Story {...text(0)} headlineClass={styles.leadHeadline} story={lead!} />
              </article>
              <article className={styles.story}>
                <Story {...text(2)} headlineClass={styles.headline} story={second!} />
              </article>
              <article className={styles.story}>
                <Story {...text(3)} headlineClass={styles.headline} story={third!} />
              </article>
            </div>

            <article className={styles.pictureColumn}>
              <Photo className={styles.pictureImage} story={picture!} />
              <Story {...text(1)} headlineClass={styles.headline} story={picture!} />
            </article>

            <div className={styles.row}>
              <article className={styles.rowStory}>
                <Photo className={styles.rowImage} story={rowLeft!} />
                <div>
                  <Story {...text(7)} headlineClass={styles.smallHeadline} story={rowLeft!} />
                </div>
              </article>
              <article className={styles.rowStory}>
                <Photo className={styles.rowImage} story={rowRight!} />
                <div>
                  <Story {...text(8)} headlineClass={styles.smallHeadline} story={rowRight!} />
                </div>
              </article>
            </div>
          </section>

          <aside className={styles.rightColumn}>
            <article className={styles.story}>
              <Photo className={styles.featureImage} story={feature!} />
              <Story {...text(4)} headlineClass={styles.featureHeadline} story={feature!} />
            </article>
            <div className={styles.tiles}>
              <article>
                <Photo className={styles.tileImage} story={tileLeft!} />
                <Story {...text(5)} headlineClass={styles.smallHeadline} story={tileLeft!} />
              </article>
              <article>
                <Photo className={styles.tileImage} story={tileRight!} />
                <Story {...text(6)} headlineClass={styles.smallHeadline} story={tileRight!} />
              </article>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
