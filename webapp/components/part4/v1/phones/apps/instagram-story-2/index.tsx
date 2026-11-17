"use client";

import { memo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type { PhoneStateProps } from "../types";
import { LyricWords } from "../lyric-words";
import { Glyph } from "./glyphs";
import styles from "./story.module.css";

// Instagram iOS, the story viewer, full screen. A 저격 story — a pointed line
// for one person that everyone can read. Each new sung line is the next
// story. Stories come in runs of five per account (RUN): inside a run the
// advance is the viewer's own instant cut, the finished segment full and the
// next one filling in step with the words sung; at the end of a run the
// viewer turns to the next account with the cube rotation (320 ms, transform
// only, off under reduced motion), and the header and segments turn with it.
// The outgoing story stays mounted only until its animation ends. Before the
// song there is no line: an ordinary story, a photograph without text. Every
// avatar wears the green close-friends ring. The heart toggles; the Send
// message field is real and what is sent goes through `act`.
// The whole line is laid out from its first word (../lyric-words): the words
// not yet sung are in the layout, unseen, so the wrap never changes and no
// word moves; each word eases in. On the two text-background types the box
// for the whole line is there from the first word and the words fill it.
//
// Story types, rotated by (seat, line) — see KINDS. Text is lowercase, with
// no shadow, gradient, sticker or emoji:
//   classic-low     photograph · Classic, plain white, low on the frame
//   type-left       photograph · Typewriter, small, left-aligned above the middle
//   black-classic   plain black story · one line in small Classic, centred
//   literature      photograph · Literature (serif), plain white, centred
//   strong-box      photograph · Strong on the solid white text background, low
//   modern-box      photograph · Modern on the translucent text background, centred
//   squeeze-left    photograph · Squeeze, plain white, left-aligned low
//   black-type      plain black story · one line in small Typewriter, centred
//
// Research (2026-11-17)
// - Story text styles. kapwing.com/resources/about-the-new-instagram-fonts
//   (30 Dec 2025) lists Modern, Classic, Typewriter, Strong, Meme, Elegant,
//   Directional, Literature, and the newer Signature, Editor, Bubble, Deco,
//   Poster, Squeeze, Journal; alignment toggles left / centre / right; a
//   slider sizes the text. blitzcutai.com/blog/what-font-does-instagram-use
//   (21 Aug 2026): Classic is Instagram Sans, "the default and the one that
//   reads as native"; Typewriter is a "monospaced slab"; the list varies by
//   app version and region.
// - Font mapping here. Instagram's own story faces are proprietary, so each
//   style is set in the open (SIL OFL) face kapwing names as its stand-in,
//   as latin woff2 files beside the photographs, declared in story.module.css:
//     Classic    → Instrument Sans 500   close: a neutral grotesque like Instagram Sans
//     Modern     → Gabarito 500          close in feel: rounder geometric sans
//     Typewriter → Courier Prime 400     close: a typewriter slab
//     Literature → Cormorant 500         approximate: a literary serif
//     Strong     → Racing Sans One       approximate: a heavy slanted sans
//     Squeeze    → Fjalla One            approximate: a condensed bold sans
//   None was compared glyph-for-glyph against the app. Neon was not confirmed
//   as still present and is not used.
// - Text background: the editor's "A" control cycling plain → solid →
//   translucent is drawn from the app as known, not from a source found
//   today; here it is one rounded box per line (the app merges the lines
//   into a single stepped shape).
// - Close friends: Korean guides describe the green mark on close-friends
//   stories (extrememanual.net/55157 on audience-limited stories); the green
//   ring is used here, the green star badge is not.
// - 저격 conventions (small lowercase text, an unrelated dark photograph, a
//   black screen with one line): NOT found documented in any source searched
//   today; they follow the task brief.
//
// Sources
// - Glyphs: Instagram IGDS icon modules (heart, share plane, more), see
//   glyphs.tsx. The close ✕ is drawn here (two round-capped strokes).
// - Layout: the iOS story viewer — 9:16 story under the status bar with 8 pt
//   corners, 2 pt progress segments, 32 pt avatar row, 44 pt "Send message"
//   pill with like and share on black below. Set by eye, not measured
//   against a reference frame.
// - Photographs: Unsplash License, public/part4/v1/instagram-story-2/
//   (attribution.json).

const DIR = "/part4/v1/instagram-story-2";
const PHOTOS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11"].map((name) => `${DIR}/${name}.jpg`);
const HANDLES = ["_jisu.k", "haeun__02", "yeonwoo.zip", "s0yeon_", "minseo.o", "dahyun.jpg", "ch_aewon", "yerin.mov", "__sua", "nayoung.kim_", "jiwoo.2am", "eunseo_o"] as const;
const RUN = 5;
const KINDS = ["classic-low", "type-left", "black-classic", "literature", "strong-box", "modern-box", "squeeze-left", "black-type"] as const;
const REPLY_LIMIT = 80;
/** The story before the song. */
const REST = -1;

const mod = (value: number, size: number) => ((value % size) + size) % size;
/** Which account's run a story belongs to, and its place in the run. */
const place = (seat: number, cue: number) => {
  const at = cue + seat * 2;
  return { account: Math.floor(at / RUN), segment: mod(at, RUN) };
};
const photoOf = (seat: number, cue: number) => mod((cue === REST ? 7 : cue) + seat * 3, PHOTOS.length);

/** About how wide a letter of each type's face is, in em (the two text-background types carry their box's padding too). */
const LETTER: Record<(typeof KINDS)[number], number> = {
  "classic-low": 0.56,
  "type-left": 0.62,
  "black-classic": 0.56,
  literature: 0.48,
  "strong-box": 0.62,
  "modern-box": 0.64,
  "squeeze-left": 0.46,
  "black-type": 0.62,
};

/**
 * The largest size (px, after the page's text scale) at which the line's
 * longest word still fits the story's 334 pt column, so no word is broken.
 * It only bites at the page's larger text sizes.
 */
function sizeCap(text: string, kind: (typeof KINDS)[number]) {
  const longest = Math.max(1, ...text.split(" ").map((word) => word.length));
  return Math.floor(334 / (LETTER[kind] * longest));
}

type Shown = { readonly cue: number; readonly text: string };

/** One story with its own header and segments: a face of the cube. */
function Story({ seat, cue, text, full, progress, role, onGone }: { seat: number; cue: number; text: ReactNode; full: string; progress: number; role?: "in" | "out"; onGone?: () => void }) {
  const { account, segment } = place(seat, cue);
  const kind = cue === REST ? undefined : KINDS[mod(cue + seat * 5, KINDS.length)]!;
  const who = mod(account * 7 + seat, HANDLES.length);
  return (
    <div className={styles.story} data-role={role} onAnimationEnd={onGone}>
      {/* eslint-disable @next/next/no-img-element -- local photographs at the story's fixed size */}
      {kind === "black-classic" || kind === "black-type" ? null : <img className={styles.photo} src={PHOTOS[photoOf(seat, cue)]} alt="" data-worded={cue !== REST || undefined} />}

      <div className={styles.stage} data-kind={kind}>
        {cue === REST ? null : (
          <p data-lyric className={styles.line} style={kind ? ({ "--cap": `${sizeCap(full, kind)}px` } as CSSProperties) : undefined}>
            <span>{text}</span>
          </p>
        )}
      </div>

      <div className={styles.bars} aria-hidden="true">
        {Array.from({ length: RUN }, (_, at) => (
          <span key={at}>
            <i style={{ width: `${at < segment ? 100 : at === segment ? progress * 100 : 0}%` }} />
          </span>
        ))}
      </div>

      <div className={styles.head}>
        <span className={styles.ring}>
          <img src={PHOTOS[mod(who * 5 + 2, PHOTOS.length)]} alt="" width={32} height={32} />
        </span>
        {/* eslint-enable @next/next/no-img-element */}
        <span className={styles.name}>{HANDLES[who]}</span>
        <span className={styles.age}>{cue === REST ? "2h" : `${1 + mod(account * 7 + seat, 9)}m`}</span>
        <span className={styles.headIcons} aria-hidden="true">
          <span><Glyph name="more" /></span>
          <span><Glyph name="close" /></span>
        </span>
      </div>
    </div>
  );
}

function InstagramStoryState({ seat, lines, shown, reducedMotion, act }: PhoneStateProps) {
  const line = lines.at(-1);
  const cue = line ? line.cueIndex : REST;
  const [liked, setLiked] = useState(false);
  const [draft, setDraft] = useState("");
  // The story on screen, and the one turning away while the viewer moves to the next account.
  const [current, setCurrent] = useState<Shown>({ cue, text: line?.full ?? "" });
  const [leaving, setLeaving] = useState<Shown | null>(null);
  if (current.cue !== cue) {
    const turns = shown && !reducedMotion && place(seat, current.cue).account !== place(seat, cue).account;
    setLeaving(turns ? current : null);
    setCurrent({ cue, text: line?.full ?? "" });
  }
  const forward = !leaving || leaving.cue < cue;

  const send = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim().slice(0, REPLY_LIMIT);
    if (!text) return;
    act({ kind: "reply", text });
    setDraft("");
  };

  return (
    <section className={styles.app} aria-label="Instagram story" inert={!shown}>
      <div className={styles.viewer} data-back={!forward || undefined}>
        {/* The next photograph, fetched ahead so the cut is clean. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- preload only */}
        <img className={styles.ahead} src={PHOTOS[photoOf(seat, cue + 1)]} alt="" />
        {leaving ? <Story key={`out${leaving.cue}`} seat={seat} cue={leaving.cue} text={leaving.text} full={leaving.text} progress={1} role="out" onGone={() => setLeaving(null)} /> : null}
        <Story key={cue} seat={seat} cue={cue} text={line ? <LyricWords line={line} /> : null} full={line?.full ?? ""} progress={line ? line.sung / line.words.length : 0.4} role={leaving ? "in" : undefined} />
      </div>

      <form className={styles.reply} onSubmit={send}>
        <input
          className={styles.field}
          value={draft}
          maxLength={REPLY_LIMIT}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Send message"
          aria-label="Send message"
          enterKeyHint="send"
          autoComplete="off"
        />
        <button type="button" className={liked ? styles.liked : undefined} aria-pressed={liked} aria-label={liked ? "Unlike" : "Like"} onClick={() => setLiked((value) => !value)}>
          <Glyph name="heart" filled={liked} />
        </button>
        <button type="button" aria-label="Share" tabIndex={-1}>
          <Glyph name="share" />
        </button>
      </form>
    </section>
  );
}

export default memo(InstagramStoryState);
