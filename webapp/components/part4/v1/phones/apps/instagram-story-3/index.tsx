"use client";

import { memo, useEffect, useRef, useState, type FormEvent } from "react";
import type { SungLine } from "../../../song/lines";
import { LyricWords } from "../lyric-words";
import type { PhoneStateProps } from "../types";
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
// song there is no line: an ordinary story, a picture without text. The
// pictures here (variant 3) are of her crying: stills, which drift slowly as
// a hand-held phone does, and three short muted clips, which loop while the
// phone is shown. They are grouped by the woman in them (WOMEN) and an
// account keeps one woman, so the cube turns from one person to the next.
// The whole line is laid out from its first word and the words ease in
// (../lyric-words), so it never reflows; a text background stands for the
// whole line from the first word. Every
// avatar wears the green close-friends ring. The heart toggles; the Send
// message field is real and what is sent goes through `act`.
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
// - Pictures: Pexels License and Unsplash License, shared with TikTok 5 and
//   kept in public/part4/v1/tiktok-5/ (attribution.json there; a pointer in
//   public/part4/v1/instagram-story-3/, which holds the fonts).

const DIR = "/part4/v1/tiktok-5";

/** A picture; `dim` is how far it is taken down under white text (flat brightness, 1 = as shot). */
type Picture = { readonly file: string; readonly clip?: boolean; readonly dim: number };

/** The pictures by the woman in them: an account is one of them. */
const WOMEN: readonly { readonly face: string; readonly pictures: readonly Picture[] }[] = [
  {
    face: "a-face",
    pictures: [
      { file: "a-cheek", dim: 0.5 },
      { file: "clip-hands", clip: true, dim: 0.5 },
      { file: "a-wipe", dim: 0.5 },
      { file: "a-blanket", dim: 0.45 },
      { file: "clip-ceiling", clip: true, dim: 0.48 },
      { file: "a-hands", dim: 0.45 },
      { file: "a-wine", dim: 0.45 },
      { file: "a-face", dim: 0.48 },
      { file: "clip-wipe", clip: true, dim: 0.52 },
    ],
  },
  {
    face: "b-scream",
    pictures: [
      { file: "b-scream", dim: 0.9 },
      { file: "b-sob", dim: 1.5 },
      { file: "car-night", dim: 1.3 },
      { file: "b-mouth", dim: 1.5 },
      { file: "blur-scream", dim: 0.55 },
      { file: "b-eyes", dim: 1.5 },
    ],
  },
  {
    face: "c-tears",
    pictures: [
      { file: "c-knees", dim: 0.48 },
      { file: "face-in-hands", dim: 0.7 },
      { file: "c-tears", dim: 0.52 },
      { file: "red-nails", dim: 0.48 },
    ],
  },
];
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
/** The woman an account is, and the picture of hers a story shows: fixed by (seat, line). */
const womanOf = (seat: number, cue: number) => WOMEN[mod(place(seat, cue).account + seat, WOMEN.length)]!;
const pictureOf = (seat: number, cue: number) => {
  const { pictures } = womanOf(seat, cue);
  // Seats start 7 apart (coprime with every set's size), so phones side by side differ.
  return pictures[mod((cue === REST ? 3 : cue) + seat * 7, pictures.length)]!;
};
const source = (picture: Picture) => `${DIR}/${picture.file}.${picture.clip ? "mp4" : "jpg"}`;

/** The story's picture: a still, or a muted clip that loops while the phone is shown. */
function Media({ picture, worded, playing }: { picture: Picture; worded: boolean; playing: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (playing) void element.play().catch(() => {});
    else element.pause();
  }, [playing]);
  // Under her text the picture is taken down (or, shot in the dark, brought up), flat.
  const style = worded || picture.dim > 1 ? { filter: `brightness(${picture.dim})` } : undefined;
  if (picture.clip) return <video ref={video} className={styles.photo} src={source(picture)} muted loop playsInline autoPlay={playing} preload="auto" style={style} />;
  // eslint-disable-next-line @next/next/no-img-element -- local photograph at the story's fixed size
  return <img className={styles.photo} src={source(picture)} alt="" style={style} />;
}

/** One story with its own header and segments: a face of the cube. */
function Story({ seat, cue, line, progress, playing, role, onGone }: { seat: number; cue: number; line?: SungLine; progress: number; playing: boolean; role?: "in" | "out"; onGone?: () => void }) {
  const { account, segment } = place(seat, cue);
  const kind = cue === REST ? undefined : KINDS[mod(cue + seat * 5, KINDS.length)]!;
  const who = mod(account * 7 + seat, HANDLES.length);
  return (
    <div className={styles.story} data-role={role} data-running={playing || undefined} onAnimationEnd={(event) => (event.target === event.currentTarget ? onGone?.() : undefined)}>
      {kind === "black-classic" || kind === "black-type" ? null : <Media picture={pictureOf(seat, cue)} worded={cue !== REST} playing={playing} />}

      <div className={styles.stage} data-kind={kind}>
        {cue === REST || !line || line.sung < 1 ? null : (
          <p data-lyric className={styles.line}>
            <span>
              <LyricWords line={line} rest="hold" />
            </span>
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
          {/* eslint-disable-next-line @next/next/no-img-element -- her own picture, cropped to the circle */}
          <img src={`${DIR}/${womanOf(seat, cue).face}.jpg`} alt="" width={32} height={32} />
        </span>
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
  const [current, setCurrent] = useState(cue);
  const [leaving, setLeaving] = useState<number | null>(null);
  if (current !== cue) {
    const turns = shown && !reducedMotion && place(seat, current).account !== place(seat, cue).account;
    setLeaving(turns ? current : null);
    setCurrent(cue);
  }
  const forward = leaving === null || leaving < cue;
  // The story turning away keeps its whole line.
  const leavingLine = leaving === null ? undefined : lines.find((entry) => entry.cueIndex === leaving);
  const playing = shown && !reducedMotion;
  const ahead = pictureOf(seat, cue + 1);

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
        {/* The next still, fetched ahead so the cut is clean. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- preload only */}
        {ahead.clip ? null : <img className={styles.ahead} src={source(ahead)} alt="" />}
        {leaving !== null ? <Story key={`out${leaving}`} seat={seat} cue={leaving} line={leavingLine} progress={1} playing={false} role="out" onGone={() => setLeaving(null)} /> : null}
        <Story key={cue} seat={seat} cue={cue} line={line} progress={line ? line.sung / line.words.length : 0.4} playing={playing} role={leaving !== null ? "in" : undefined} />
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
