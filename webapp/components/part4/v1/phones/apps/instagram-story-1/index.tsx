"use client";

import { memo, useEffect, useState, type AnimationEvent, type CSSProperties, type FormEvent } from "react";
import type { SungLine } from "../../../song/lines";
import { LyricWords } from "../lyric-words";
import type { PhoneStateProps } from "../types";
import { Glyph } from "./icons";
import styles from "./story.module.css";

// Instagram iOS, the story viewer, watching a small circle of personal
// accounts. The line being sung is the text of the story showing, typed word
// by word, in the ways people really post text: over a phone photograph or on
// a plain background, in Instagram's own text styles.
//
// The line is laid out whole from its first word (the shared LyricWords, the
// unsung words unseen), so nothing reflows while it is sung; each word eases
// in, the first one with the text block itself (and its background box, which
// is the full line's from the start). Words never break: the type shrinks so
// the longest word, and the line in about four rows, fit the story's width at
// any lyric scale (story.module.css, --len / --chars).
//
// Advance. Each new line is the next story. Inside one account it is the
// tap-to-next cut: the segment that was filling (words sung / words in the
// line) is complete, the next one starts. Every fifth line (phase by seat) the
// account's stories are over and the viewer turns to the next account with the
// cube rotation (340 ms, transform only; off under reduced motion). The
// outgoing face is kept mounted only until the turn ends.
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
//   background; the two flat colours here are averages of two of the photos.
// - Not found: Korean-language sources on how twenty-somethings in Korea set
//   story text, and reliable descriptions of the time and music stickers'
//   current look. So no sticker is drawn, and the Korea-specific claim is not
//   made; the looks follow the sources above.
//
// Font mapping (all SIL OFL, latin woff2 in public/part4/v1/instagram-story-1,
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
// - The text background is drawn as a rounded block per line
//   (box-decoration-break); Instagram joins the lines' blocks with concave
//   corners, which this does not.
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
  /** A photograph, or a plain background colour. */
  readonly photo?: string;
  readonly bg?: string;
  readonly font: Font;
  readonly align?: "left";
  /** Where the text sits: the share of the free height above it, percent. */
  readonly y: number;
  readonly lower?: true;
  readonly box?: "white" | "black";
};

// Photo and plain stories alternate loosely; each is set by hand for its picture.
const LOOKS: readonly Look[] = [
  { photo: "bed-dark", font: "typewriter", align: "left", y: 24, lower: true },
  { bg: "#000", font: "classic", y: 50, lower: true },
  { photo: "dusk-moon", font: "literature", y: 84 },
  { photo: "glass", font: "strong", y: 30, box: "white" },
  { bg: "#000", font: "elegant", y: 50 },
  { photo: "sky-wires", font: "modern", y: 26 },
  { bg: "#1f1c17", font: "typewriter", align: "left", y: 50, lower: true },
  { photo: "night-street", font: "squeeze", y: 79 },
  { photo: "sheets", font: "typewriter", y: 50, box: "white", lower: true },
  { bg: "#000", font: "modern", align: "left", y: 50 },
  { photo: "laptop-dark", font: "classic", align: "left", y: 72, lower: true },
  { photo: "rain-windshield", font: "modern", y: 30, box: "black" },
  { bg: "#6d5e73", font: "literature", y: 50 },
  { photo: "room-window", font: "elegant", y: 80 },
];

/** The faces as the CSS declares them, loaded when the app mounts so no line is first laid out in a fallback. */
const FACES = [
  '500 30px "IGS1 Modern"',
  '500 30px "IGS1 Classic"',
  '400 30px "IGS1 Typewriter"',
  'italic 800 30px "IGS1 Strong"',
  '500 30px "IGS1 Literature"',
  '400 30px "IGS1 Elegant"',
  '400 30px "IGS1 Squeeze"',
] as const;
const FONTS: readonly Font[] = ["modern", "classic", "typewriter", "strong", "literature", "elegant", "squeeze"];
const PHOTOS = ["bed-dark", "dusk-moon", "glass", "sky-wires", "night-street", "sheets", "laptop-dark", "rain-windshield", "room-window"] as const;
const src = (photo: string) => `/part4/v1/instagram-story-1/${photo}.jpg`;

const HANDLES = ["mia.sunwoo", "noa_____k", "ellie.rhee", "sof.marchetti", "hae.won_", "june.lindqvist", "yerin.cho", "dah.yun"] as const;
const TINTS = ["#8e96a8", "#a99486", "#8aa39a", "#9c8fb0", "#b09a7c", "#7f9bb3", "#a58c96", "#8c9d84"] as const;
const PRIOR = ["can't sleep again", "ok so. storytime", "not me being up at 3am", "do not text him", "anyway", "some of you never got closure and it shows"] as const;
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
  /** The whole line, which sets the type size before it is all typed. */
  readonly whole: string;
};

const mod = (value: number, size: number) => ((value % size) + size) % size;

/** The story for a line: pure in the line's index and the seat. `cue` is −1 before the song. */
function storyOf(cue: number, seat: number, whole: string): Story {
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
    whole,
  };
}

function sizeOf(length: number) {
  if (length <= 18) return "l";
  if (length <= 34) return "m";
  return "s";
}

type FaceProps = {
  readonly story: Story;
  /** The line being sung; without it (before the song, or the outgoing face) `text` is set whole. */
  readonly line?: SungLine;
  readonly text: string;
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

function Face({ story, line, text, progress, turn, motion, onTurned, live }: FaceProps) {
  const { look } = story;
  return (
    <div className={styles.face} data-turn={turn} onAnimationEnd={onTurned} inert={!live}>
      <div className={styles.story} data-scrim={look.bg === "#000" ? undefined : true} style={{ background: look.bg ?? "#000" }}>
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

        <div className={styles.slot} data-align={look.align}>
          <i style={{ "--grow": look.y } as CSSProperties} />
          <p
            key={story.cue}
            data-lyric
            className={styles.text}
            data-font={look.font}
            data-size={sizeOf(story.whole.length)}
            data-lower={look.lower}
            data-box={look.box}
            data-arrive={(line && motion) || undefined}
            style={{ "--len": Math.max(...story.whole.split(" ").map((word) => word.length)), "--chars": story.whole.length } as CSSProperties}
          >
            <span>{line ? <LyricWords line={line} rest="hold" /> : text}</span>
          </p>
          <i style={{ "--grow": 100 - look.y } as CSSProperties} />
        </div>
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
  const text = line ? line.text : PRIOR[seat % PRIOR.length]!;
  const story = storyOf(cue, seat, line ? line.full : text);
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

  useEffect(() => {
    for (const face of FACES) void document.fonts.load(face).catch(() => undefined);
  }, []);

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
      {view.leaving && <Face key={`out${view.leaving.cue}`} story={view.leaving} text={view.leaving.whole} progress={1} turn="out" motion={false} />}
      <Face
        key={`a${story.account}`}
        story={story}
        line={line}
        text={text}
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

      {/* Every photograph and text face is fetched up front, so a cut to the next story never shows
          an empty frame and no line is laid out in a fallback font first. */}
      <div className={styles.preload} aria-hidden="true">
        {FONTS.map((font) => (
          <span key={font} className={styles.text} data-font={font}>
            a
          </span>
        ))}
        {PHOTOS.map((photo) => (
          // eslint-disable-next-line @next/next/no-img-element -- preloading local photographs
          <img key={photo} src={src(photo)} alt="" />
        ))}
      </div>
    </section>
  );
}

export default memo(InstagramStoryState);
