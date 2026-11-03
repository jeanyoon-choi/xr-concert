"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import type { ParametricSong } from "../model/song";
import { SongPlayback } from "../playback";
import { LYRIC_LEAD_MS, useLyricCue } from "../timeline/use-lyric-cue";
import { ARTICLE, SECTION, SECTION_LINKS } from "./model/article";
import {
  ELECTION_DIGIT_PATHS,
  ELECTION_SQUARES,
  GIFT_PATH,
  LISTEN_RING,
  LISTEN_TRIANGLE,
  MENU_BARS,
  SAVE_PATH,
  SHARE_PATH,
  T_MARK_PATH,
} from "./model/icons";
import { headlineOf, linkOf, sentenceOf } from "./model/lyric-text";
import { CHEVRON_POINTS, MASTHEAD_PATH, MASTHEAD_VIEWBOX, SEARCH_PATH } from "./model/masthead";
import styles from "./article.module.css";

// A single nytimes.com article page (desktop), rebuilt from values measured
// on a live article at a 1322 px viewport on 2026-11-03 and zoomed to the
// viewport as one fixed-format page: masthead bar, section bar, headline,
// summary, listen and share bar, lead photo with caption, byline, body.
// The copy and photo are the study's own.
//
// The song takes the page's title-like slots, as the radio field (/1), the
// departures board (/4) and the inbox (/5) take theirs: the headline is the
// line being sung, set word by word at each onset in headline case; the
// summary is the line before it and the photo caption the line before that.
// The section links carry the sung line's words, six at a time, and the link
// of the sung word takes the page's own link-hover underline; the LIVE label
// reads the sung word. The tab title follows the headline. Before the first
// sung word every slot keeps the article's own copy; the body never changes.
// Everything derives from the audio clock, so a seek rebuilds the same page.

const DESIGN_WIDTH = 1322;
const LINK_SLOTS = SECTION_LINKS.length;

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

function Chevron() {
  return (
    <svg aria-hidden="true" className={styles.chevron} viewBox="0 0 13 8">
      <polygon points={CHEVRON_POINTS} />
    </svg>
  );
}

export default function ParametricInterfaceNine({ song }: { song?: ParametricSong }) {
  return (
    <SongPlayback song={song}>
      <ArticlePage />
    </SongPlayback>
  );
}

function useArticleLyric() {
  const { activeWordPosition, cueIndex, currentTimeMs, hasStarted, lyric, lyricCues, song } = useLyricCue();
  const firstOnsetMs = song.lyrics[0]?.startMs ?? 0;
  const hasBegun = hasStarted && currentTimeMs + LYRIC_LEAD_MS >= firstOnsetMs;
  if (!hasBegun) return null;

  const previous = lyricCues[cueIndex - 1];
  const beforePrevious = lyricCues[cueIndex - 2];
  const windowStart = Math.floor(activeWordPosition / LINK_SLOTS) * LINK_SLOTS;

  return {
    headline: headlineOf(lyric.slice(0, activeWordPosition + 1)),
    fullHeadline: headlineOf(lyric),
    summary: previous ? sentenceOf(previous) : null,
    caption: beforePrevious ? sentenceOf(beforePrevious) : null,
    liveLabel: linkOf(lyric[activeWordPosition] ?? ""),
    links: Array.from({ length: LINK_SLOTS }, (_, slot) => {
      const position = windowStart + slot;
      const word = lyric[position];
      return word ? { text: linkOf(word), sung: position === activeWordPosition } : null;
    }),
  };
}

function ArticlePage() {
  const { zoom, height } = usePageZoom();
  const sung = useArticleLyric();
  const tabHeadline = sung?.fullHeadline ?? ARTICLE.headline;

  // The tab title follows the headline as nytimes.com sets it, after the
  // study's version path.
  useEffect(() => {
    document.title = `v2/9 · ${tabHeadline} - The New York Times`;
  }, [tabHeadline]);

  return (
    <main className={styles.page} style={{ zoom, height: height || undefined }}>
      <header className={styles.masthead}>
        <span aria-hidden="true" className={styles.iconButton} data-at="menu">
          <svg viewBox="0 0 16 16">
            {MENU_BARS.map((y) => <rect fill="#333" height={2} key={y} width={14} x={1} y={y} />)}
          </svg>
        </span>
        <span aria-hidden="true" className={styles.iconButton} data-at="search">
          <svg viewBox="0 0 16 16"><path d={SEARCH_PATH} fill="#333" /></svg>
        </span>
        <span className={styles.sectionLabel}>{SECTION}</span>
        <svg aria-label="The New York Times" className={styles.wordmark} role="img" viewBox={MASTHEAD_VIEWBOX}>
          <path d={MASTHEAD_PATH} fill="#000" />
        </svg>
        <span className={styles.login}>Log in</span>
      </header>

      <nav aria-label="Section" className={styles.sectionBar}>
        <svg aria-hidden="true" className={styles.tMark} viewBox="0 0 44 57">
          <path d={T_MARK_PATH} fill="#000" />
        </svg>
        <span className={styles.electionMark}>
          <svg aria-label="2026 Elections" role="img" viewBox="0 0 100 25">
            {ELECTION_SQUARES.map((square) => (
              <rect fill={square.fill} height={25} key={square.x} width={25} x={square.x} />
            ))}
            {ELECTION_DIGIT_PATHS.map((path) => <path d={path} fill="#fff" key={path} />)}
          </svg>
        </span>
        <span className={styles.liveLink}>
          <span className={styles.live}>Live</span>
          <span className={styles.updates}>{sung?.liveLabel ?? "Updates"}</span>
          <span className={styles.ago}>2h ago</span>
        </span>
        {SECTION_LINKS.map((link, slot) => {
          const lyricLink = sung ? sung.links[slot] : undefined;
          if (lyricLink === null) return null;
          return (
            <span className={styles.sectionLink} data-hover={lyricLink?.sung || undefined} key={link.label}>
              <span className={styles.linkText}>{lyricLink?.text ?? link.label}</span>
              {"dropdown" in link ? <Chevron /> : null}
            </span>
          );
        })}
      </nav>

      <article className={styles.article}>
        <h1 className={styles.headline}>{sung?.headline ?? ARTICLE.headline}</h1>
        <p className={styles.summary}>{sung?.summary ?? ARTICLE.summary}</p>

        <div className={styles.actionBar}>
          <span className={styles.listen}>
            <svg aria-hidden="true" viewBox="0 0 55 55">
              <path d={LISTEN_TRIANGLE} fill="#121212" />
              <path d={LISTEN_RING} fill="none" stroke="#DFDFDF" strokeWidth={1.5} />
            </svg>
            <span>{ARTICLE.listen}</span>
          </span>
          <span className={styles.actions}>
            <span className={styles.giftButton}>
              <svg aria-hidden="true" viewBox="0 0 19 19"><path d={GIFT_PATH} fill="#121212" /></svg>
              Share full article
            </span>
            <span aria-label="More sharing options" className={styles.roundButton}>
              <svg aria-hidden="true" className={styles.shareGlyph} viewBox="0 0 23 18"><path d={SHARE_PATH} fill="#000" /></svg>
            </span>
            <span aria-label="Save article for reading later" className={styles.roundButton}>
              <svg aria-hidden="true" className={styles.saveGlyph} viewBox="0 0 12 18"><path d={SAVE_PATH} fill="#000" /></svg>
            </span>
          </span>
        </div>

        <figure className={styles.figure}>
          <div
            aria-label={ARTICLE.imageAlt}
            className={styles.photo}
            role="img"
            style={{ backgroundImage: `url(${ARTICLE.image})` }}
          />
          <figcaption className={styles.caption}>
            {sung?.caption ?? ARTICLE.caption}
            <span className={styles.credit}>{ARTICLE.credit}</span>
          </figcaption>
        </figure>

        <div className={styles.byline}>
          <p>
            By <u>{ARTICLE.byline[0]}</u> and <u>{ARTICLE.byline[1]}</u>
          </p>
          <p className={styles.reporting}>{ARTICLE.dateline}</p>
          <time className={styles.date}>{ARTICLE.date}</time>
        </div>

        <section className={styles.body}>
          {ARTICLE.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      </article>
    </main>
  );
}
