"use client";

import { memo, useState, type AnimationEvent, type CSSProperties, type FormEvent } from "react";
import type { PhoneStateProps } from "../types";
import { Glyph } from "./icons";
import { FACES } from "./metrics";
import styles from "./story.module.css";

// Instagram iOS, the story viewer, watching a small circle of personal
// accounts. One word at a time: the story of the line being sung (a phone
// photograph or a plain black background, with one of Instagram's text
// styles) stays for the whole line, and the only text in it is the word being
// sung, set in that style at one-word scale on the dead centre of the story.
// The next word replaces it at its onset with a hard cut: no fade, no slide,
// never two words at once, and no text before the first line. On a
// text-background style the box hugs the single word and cuts with it.
//
// Size and place are CSS only (story.module.css .text): the word's advance
// width and its ink's height above and below the baseline come from the
// constant tables of the seven faces in ./metrics.ts (no measuring at run
// time) and are handed over as --w, --a and --d; the type size is the largest
// at which the word (and its box) is 350 pt wide, up to the style's ceiling,
// and the ink box, not the line box, is what sits on the centre.
//
// Advance. Each new line is the next story. Inside one account it is the
// tap-to-next cut: the segment that was filling (words sung / words in the
// line) is complete, the next one starts. Every fifth line (phase by seat) the
// account's stories are over and the viewer turns to the next account with the
// cube rotation (340 ms, transform only; off under reduced motion). The
// outgoing face is kept mounted only until the turn ends, and carries no word.
//
// Real: the heart toggles; "Send message" sends through `act` and confirms
// with "Sent" (a story reply goes to DMs, so nothing appears in the viewer).
//
// Research (2026-11) and what is relied on
// - Text styles that exist: Kapwing, "How to Get 'New' Instagram Fonts"
//   (2025-12-30, kapwing.com/resources/about-the-new-instagram-fonts) lists
//   Modern (the default, clean sans), Classic, Typewriter, Strong, Elegant,
//   Literature, Directional, Meme and the newer Signature, Editor, Bubble,
//   Deco, Poster, Squeeze, Journal; the text tool has left/centre/right
//   alignment, a size slider, an outline/background toggle and a colour
//   sampler. "Neon" is now an effect, not a font, in that list. Path Social
//   and a TypeDrawers thread name the original faces: Modern = Aveny-T,
//   Neon = Cosmopolitan, Typewriter = Courier Bold (unofficial sources).
// - How people set text: B. RzM, "Updating my millennial IG stories"
//   (Substack, 2025-04-18): Gen Z leans to Elegant, Literature or Typewriter;
//   text stays "small, straight, and carefully placed"; colours "white,
//   black, maybe a soft neutral"; big, tilted, randomly placed text, the
//   built-in filters and GIFs read as dated; photos are full-screen vertical.
// - Backgrounds: several how-to guides (Kapwing, Sked, Adobe Express) agree a
//   colour is sampled from the photo with the dropper and filled as a solid
//   background; the plain stories here are pure black only.
// - This variant departs from "small, carefully placed" on purpose: one word
//   at a time, as large as the story takes, always on the centre.
// - Not found: Korean-language sources on how twenty-somethings in Korea set
//   story text, and reliable descriptions of the time and music stickers'
//   current look. So no sticker is drawn, and the Korea-specific claim is not
//   made; the looks follow the sources above.
//
// Font mapping (all SIL OFL, latin woff2 in public/part4/v1/instagram-story-4,
// declared in story.module.css; none is Instagram's own face)
//   Modern      -> Gabarito 500 (Kapwing's suggested match)        close
//   Classic     -> Instrument Sans 500 (Kapwing's match)           close
//   Typewriter  -> Courier Prime 400 (Kapwing's match)             close
//   Strong      -> Archivo 800 Italic, caps                        approximate
//   Literature  -> Cormorant 500 (Kapwing's match)                 approximate
//   Elegant     -> Antic Didone (Kapwing's match)                  approximate
//   Squeeze     -> Fjalla One, caps (Kapwing's match)              approximate
//   Left out: Neon, Bubble, Deco, Poster, Signature, Journal, Editor,
//   Directional, Meme (no faithful stand-in, or they read as decoration).
// - The text background is one rounded block around the word, as Instagram
//   draws it around a one-line text.
//
// Other sources and approximations
// - Photographs: nine real photographs under the Pexels License (see
//   attribution.json), cropped 9:16.
// - Glyphs: heart, share and ⋯ are verbatim IGDS geometry (icons.tsx); the ✕
//   is drawn here.
// - Viewer layout (9:16 card under the status bar on black, 2 pt segments,
//   32 pt avatar row, 44 pt reply pill, heart, share) is from memory of the
//   iOS app on a 390 × 844 phone, not measured against a frame.

type Font = "modern" | "classic" | "typewriter" | "strong" | "literature" | "elegant" | "squeeze";

type Look = {
  /** A photograph; without one the story is plain black. */
  readonly photo?: string;
  readonly font: Font;
  /** Instagram's text background behind the word. */
  readonly box?: "white" | "black";
};

// Photo and plain stories alternate loosely; a box is used where the picture is busy or bright behind the centre.
const LOOKS: readonly Look[] = [
  { photo: "bed-dark", font: "typewriter" },
  { font: "classic" },
  { photo: "dusk-moon", font: "literature" },
  { photo: "glass", font: "strong", box: "white" },
  { font: "elegant" },
  { photo: "sky-wires", font: "modern", box: "black" },
  { font: "typewriter" },
  { photo: "night-street", font: "squeeze" },
  { photo: "sheets", font: "typewriter", box: "white" },
  { font: "modern" },
  { photo: "laptop-dark", font: "classic", box: "black" },
  { photo: "rain-windshield", font: "literature", box: "black" },
  { font: "literature" },
  { photo: "room-window", font: "elegant", box: "white" },
];

const PHOTOS = ["bed-dark", "dusk-moon", "glass", "sky-wires", "night-street", "sheets", "laptop-dark", "rain-windshield", "room-window"] as const;
const src = (photo: string) => `/part4/v1/instagram-story-4/${photo}.jpg`;

/** How each style sets its letters (story.module.css follows the same). */
const CASE: Readonly<Record<Font, "lower" | "upper" | "asIs">> = {
  modern: "asIs",
  classic: "lower",
  typewriter: "lower",
  strong: "upper",
  literature: "asIs",
  elegant: "asIs",
  squeeze: "upper",
};

/** The word as a style sets it: without the line's commas, full stops and quotation marks, in the style's case. */
function setWord(word: string, font: Font) {
  const bare = word.replace(/[",.]/g, "").replace(/'/g, "’");
  return CASE[font] === "lower" ? bare.toLowerCase() : CASE[font] === "upper" ? bare.toUpperCase() : bare;
}

/** A word's width and its ink above and below the baseline, in em, from the face's table. */
function measure(word: string, font: Font) {
  const glyphs: Readonly<Record<string, readonly [number, number, number]>> = FACES[font].glyphs;
  let width = 0;
  let above = 0;
  let below = -1;
  for (const char of word) {
    const [advance, up, down] = glyphs[char] ?? [700, 720, 0];
    width += advance / 1000;
    above = Math.max(above, up / 1000);
    below = Math.max(below, down / 1000);
  }
  return { "--w": Math.max(0.2, width).toFixed(3), "--a": above.toFixed(3), "--d": below.toFixed(3) } as CSSProperties;
}

const HANDLES = ["mia.sunwoo", "noa_____k", "ellie.rhee", "sof.marchetti", "hae.won_", "june.lindqvist", "yerin.cho", "dah.yun"] as const;
const TINTS = ["#8e96a8", "#a99486", "#8aa39a", "#9c8fb0", "#b09a7c", "#7f9bb3", "#a58c96", "#8c9d84"] as const;
/** Lyric stories per account before the viewer turns to the next one. */
const RUN = 5;
const REPLY_LIMIT = 80;

type Story = {
  readonly cue: number;
  /** Which account's stories these are (changes every RUN lines). */
  readonly account: number;
  readonly handle: string;
  readonly tint: string;
  readonly age: string;
  readonly segments: number;
  readonly segment: number;
  readonly look: Look;
};

const mod = (value: number, size: number) => ((value % size) + size) % size;

/** The story for a line: pure in the line's index and the seat. `cue` is −1 before the song. */
function storyOf(cue: number, seat: number): Story {
  const step = cue + (seat % RUN);
  const account = Math.floor(step / RUN);
  const index = mod(step, RUN);
  const person = mod(account * 3 + seat, HANDLES.length);
  // Each account has five to seven stories; the ones before the lyric's five are already seen.
  const segments = RUN + mod(account * 2 + seat, 3);
  const recent = mod(account + seat, 3) !== 0;
  return {
    cue,
    account,
    handle: HANDLES[person]!,
    tint: TINTS[person]!,
    age: recent ? `${Math.max(1, 46 - index * 8 - mod(account * 5 + seat, 6))}m` : `${1 + mod(account + seat * 2, 7)}h`,
    segments,
    segment: segments - RUN + index,
    look: LOOKS[mod(cue * 5 + seat * 3 + 1, LOOKS.length)]!,
  };
}

type FaceProps = {
  readonly story: Story;
  /** The word being sung; none before the song and on the outgoing face. */
  readonly word?: string;
  /** How far the showing segment has filled, 0–1. */
  readonly progress: number;
  readonly turn?: "in" | "out";
  readonly motion: boolean;
  readonly onTurned?: (event: AnimationEvent<HTMLDivElement>) => void;
  /** The live face's controls; the outgoing face is a still. */
  readonly live?: {
    readonly draft: string;
    readonly setDraft: (value: string) => void;
    readonly reply: (event: FormEvent) => void;
    readonly liked: boolean;
    readonly toggleLike: () => void;
  };
};

function Face({ story, word, progress, turn, motion, onTurned, live }: FaceProps) {
  const { look } = story;
  const text = word ? setWord(word, look.font) : "";
  return (
    <div className={styles.face} data-turn={turn} onAnimationEnd={onTurned} inert={!live}>
      <div className={styles.story} data-scrim={look.photo ? true : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a local photograph at a fixed size */}
        {look.photo && <img key={look.photo} className={styles.photo} src={src(look.photo)} alt="" decoding="sync" />}

        <div className={styles.bars} aria-hidden="true">
          {Array.from({ length: story.segments }, (_, index) => (
            <span key={index}>
              <i
                key={index === story.segment ? `s${story.cue}` : "rest"}
                data-live={(index === story.segment && motion) || undefined}
                style={{ "--fill": index < story.segment ? 1 : index === story.segment ? progress : 0 } as CSSProperties}
              />
            </span>
          ))}
        </div>

        <div className={styles.head}>
          <span className={styles.avatar} style={{ background: story.tint }} aria-hidden="true">
            {story.handle.charAt(0).toUpperCase()}
          </span>
          <span className={styles.name}>{story.handle}</span>
          <span className={styles.age}>{story.age}</span>
          <span className={styles.headIcons} aria-hidden="true">
            <span><Glyph name="more" /></span>
            <span><Glyph name="close" /></span>
          </span>
        </div>

        {/* The one word. Not keyed: the text is swapped in place, a hard cut. */}
        {text && (
          <p data-lyric className={styles.text} data-font={look.font} data-box={look.box} style={measure(text, look.font)}>
            <span>{text}</span>
          </p>
        )}
      </div>

      <form className={styles.reply} onSubmit={live?.reply}>
        <label className={styles.field}>
          <input
            value={live?.draft ?? ""}
            readOnly={!live}
            maxLength={REPLY_LIMIT}
            onChange={(event) => live?.setDraft(event.target.value)}
            placeholder="Send message"
            aria-label="Send message"
            enterKeyHint="send"
            autoComplete="off"
          />
          {live?.draft.trim() && (
            <button type="submit" className={styles.send}>
              Send
            </button>
          )}
        </label>
        <button
          type="button"
          className={live?.liked ? `${styles.icon} ${styles.liked}` : styles.icon}
          aria-pressed={!!live?.liked}
          aria-label={live?.liked ? "Unlike" : "Like"}
          onClick={live?.toggleLike}
        >
          <Glyph name="heart" size={26} filled={!!live?.liked} />
        </button>
        <span className={styles.icon} aria-hidden="true">
          <Glyph name="share" size={26} />
        </span>
      </form>
    </div>
  );
}

function InstagramStoryState({ seat, lines, shown, reducedMotion, act }: PhoneStateProps) {
  const line = lines.at(-1);
  const cue = line ? line.cueIndex : -1;
  // The word being sung: the last one begun. Nothing before a line begins.
  const word = line && line.sung > 0 ? line.words[line.sung - 1] : undefined;
  const story = storyOf(cue, seat);
  const motion = !reducedMotion;

  const [draft, setDraft] = useState("");
  const [liked, setLiked] = useState<Readonly<Record<number, true>>>({});
  const [sent, setSent] = useState(0);
  // The story last shown, and during a turn between accounts the face turning away.
  const [view, setView] = useState<{ readonly story: Story; readonly leaving: Story | null }>({ story, leaving: null });
  if (view.story.cue !== cue || view.story.handle !== story.handle) {
    const turns = shown && motion && view.story.account !== story.account && view.story.handle !== story.handle;
    setView({ story, leaving: turns ? view.story : null });
  }

  const turned = (event: AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    setView((current) => (current.leaving ? { story: current.story, leaving: null } : current));
  };

  const reply = (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim().slice(0, REPLY_LIMIT);
    if (!message) return;
    act({ kind: "reply", text: message });
    setDraft("");
    setSent((count) => count + 1);
  };

  const toggleLike = () =>
    setLiked((current) => {
      const next = { ...current };
      if (next[cue]) delete next[cue];
      else next[cue] = true;
      return next;
    });

  return (
    <section className={styles.app} aria-label="Instagram story" inert={!shown}>
      {view.leaving && <Face key={`out${view.leaving.cue}`} story={view.leaving} progress={1} turn="out" motion={false} />}
      <Face
        key={`a${story.account}`}
        story={story}
        word={word}
        progress={line ? line.sung / Math.max(1, line.words.length) : 0.4}
        turn={view.leaving ? "in" : undefined}
        motion={motion}
        onTurned={turned}
        live={{ draft, setDraft, reply, liked: !!liked[cue], toggleLike }}
      />

      {sent > 0 && (
        <span key={sent} className={styles.sent} role="status">
          Sent
        </span>
      )}

      {/* Every photograph is fetched up front, so a cut to the next story never shows an empty frame. */}
      <div className={styles.preload} aria-hidden="true">
        {PHOTOS.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element -- preloading local photographs
          <img key={photo} src={src(photo)} alt="" />
        ))}
      </div>
    </section>
  );
}

export default memo(InstagramStoryState);
