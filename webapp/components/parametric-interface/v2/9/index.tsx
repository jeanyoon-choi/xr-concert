"use client";

import type { CSSProperties } from "react";
import type { ParametricSong, TimedLyricLine } from "../model/song";
import { SongPlayback } from "../playback";
import { LYRIC_LEAD_MS, useLyricCue } from "../timeline/use-lyric-cue";
import {
  EDITION,
  frontPageStories,
  headlineCase,
  type FrontPageStory,
} from "./model/front-page";
import styles from "./front-page.module.css";

// A broadsheet front page. The line being sung is set as the banner headline,
// word by word at each onset; every earlier line steps down one headline slot
// (banner → second story → the right-hand column). A slot keeps its own
// ordinary headline until a line reaches it. Bodies, bylines and jumps never
// change, so only the headline slots carry the lyric. Everything derives from
// the audio clock, so a seek rebuilds the same page.

const SLOT_COUNT = frontPageStories.length;

type Headline =
  | { kind: "story"; text: string }
  | { kind: "lyric"; line: TimedLyricLine; sungUntilMs: number };

function headlinesAt(
  lines: readonly TimedLyricLine[],
  cueIndex: number,
  clockMs: number,
  hasBegun: boolean,
): Headline[] {
  return frontPageStories.map((story, slot) => {
    const lineIndex = cueIndex - slot;
    if (!hasBegun || lineIndex < 0) return { kind: "story", text: story.headline };

    return {
      kind: "lyric",
      line: lines[lineIndex]!,
      // Older lines are complete; only the banner is still being set.
      sungUntilMs: slot === 0 ? clockMs : Number.POSITIVE_INFINITY,
    };
  });
}

function HeadlineText({ headline }: { headline: Headline }) {
  if (headline.kind === "story") return headline.text;

  // Every word is laid out from the start so the banner never reflows; unsung
  // words hold their place invisibly.
  return headline.line.words.map((word, index) => (
    <span
      className={styles.word}
      data-unsung={word.startMs > headline.sungUntilMs || undefined}
      key={`${headline.line.id}-${index}`}
    >
      {headlineCase(word.text, index === 0)}
      {index < headline.line.words.length - 1 ? " " : ""}
    </span>
  ));
}

function headlineLength(headline: Headline) {
  return headline.kind === "story" ? headline.text.length : headline.line.text.length;
}

function StoryBody({ story }: { story: FrontPageStory }) {
  return (
    <>
      <p className={styles.byline}>{story.byline}</p>
      <div className={styles.body}>
        {story.paragraphs.map((paragraph, index) => (
          <p key={index}>
            {index === 0 && story.dateline ? (
              <span className={styles.dateline}>{story.dateline} </span>
            ) : null}
            {paragraph}
          </p>
        ))}
      </div>
      <p className={styles.jump}>{story.jump}</p>
    </>
  );
}

export default function ParametricInterfaceNine({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <FrontPage />
    </SongPlayback>
  );
}

function FrontPage() {
  const { cueIndex, currentTimeMs, hasStarted, song } = useLyricCue();
  const clockMs = currentTimeMs + LYRIC_LEAD_MS;
  const firstOnsetMs = song.lyrics[0]?.startMs ?? 0;
  const headlines = headlinesAt(song.lyrics, cueIndex, clockMs, hasStarted && clockMs >= firstOnsetMs);
  const banner = headlines[0]!;
  const bannerStyle = { "--chars": headlineLength(banner) } as CSSProperties;

  return (
    <main className={styles.page}>
      <header className={styles.masthead}>
        <p className={styles.earLeft}>“All the News<br />That’s Fit to Print”</p>
        <h1 className={styles.name}>The New York Times</h1>
        <div className={styles.earRight}>
          <p className={styles.edition}>Late Edition</p>
          {EDITION.weather.map((sentence) => <p key={sentence}>{sentence}</p>)}
        </div>
      </header>

      <div className={styles.folio}>
        <span>{EDITION.volume}</span>
        <span>{EDITION.copyright}</span>
        <span>{EDITION.date}</span>
        <span>{EDITION.price}</span>
      </div>

      <div className={styles.front}>
        <h2 className={styles.banner} style={bannerStyle}>
          <HeadlineText headline={banner} />
        </h2>

        <article className={`${styles.story} ${styles.lead}`}>
          <StoryBody story={frontPageStories[0]!} />
        </article>

        <article className={`${styles.story} ${styles.second}`}>
          <h3 className={styles.secondHeadline}><HeadlineText headline={headlines[1]!} /></h3>
          <StoryBody story={frontPageStories[1]!} />
        </article>

        <div className={styles.column}>
          <article className={`${styles.story} ${styles.third}`}>
            <h3 className={styles.thirdHeadline}><HeadlineText headline={headlines[2]!} /></h3>
            <StoryBody story={frontPageStories[2]!} />
          </article>
          {headlines.slice(3, SLOT_COUNT).map((headline, offset) => (
            <article className={`${styles.story} ${styles.brief}`} key={offset}>
              <h3 className={styles.briefHeadline}><HeadlineText headline={headline} /></h3>
              <StoryBody story={frontPageStories[3 + offset]!} />
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
