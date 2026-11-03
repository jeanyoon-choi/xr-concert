import { SIGN_FACES, TEXT_FONT, type SignFace } from "./fonts";

// Signs that carry the lyric are arranged in rows (one side of the street, one
// kind, one height: a floor band, the fascias, a level of the projecting
// stacks, the sidewalk stands, the rooftops). Along a row, nearest first, sign
// k shows word k mod n of the current line, so every row reads the line from
// the viewer into the street, over and over.
//
// Faces are colourless masks coloured in the shader from per-sign palettes
// (LYRIC_ROW_SIGN_FRAG): red = lettering, green = accent shapes, blue =
// lettering knocked out of an accent. One mask cell per kind and word position
// serves every sign; the shader picks the cell from the sign's row order and
// the line length, so a new line needs no geometry update.

export type LyricSignKind = "vertical" | "horizontal" | "standing";
export const LYRIC_KINDS: readonly LyricSignKind[] = ["vertical", "horizontal", "standing"];

// The longest line of the song has 10 words.
export const SLOTS = 10;
const SCALE = 1.25;

const CELL = {
  vertical: { width: 128, height: 512 },
  horizontal: { width: 512, height: 128 },
  standing: { width: 256, height: 384 },
} as const;

function cellOrigin(kind: LyricSignKind, slot: number) {
  switch (kind) {
    case "vertical": return { x: slot * 128, y: 0 };
    case "horizontal": return { x: (slot % 4) * 512, y: 512 + Math.floor(slot / 4) * 128 };
    case "standing": return { x: (slot % 8) * 256, y: 896 + Math.floor(slot / 8) * 384 };
  }
}

const ATLAS_W = 2048;
const ATLAS_H = 1664;

// Academy names each cell shows until its word is sung.
const OWN_NAMES: Record<LyricSignKind, readonly string[]> = {
  vertical: ["명인수학", "의대관", "한결국어", "최상위수학", "정석학원", "영어전문", "과학탐구", "입시컨설팅", "일등급국어", "사고력수학"],
  horizontal: ["명인 수학학원", "최상위 의대반 모집", "한결 국어학원", "내신 1:1 클리닉", "정석수학 S관", "SKY 입시컨설팅", "대치 영어전문", "과학탐구 전문관", "고3 수능 파이널", "1등급 영어 리딩"],
  standing: ["명인수학", "의대반 모집", "한결국어", "내신클리닉", "정석수학", "입시상담", "영어전문", "과학탐구", "수능파이널", "1등급영어"],
};
const FLOORS = ["3F", "", "5F", "02-556-1204", "6F", "상담예약", "2F", "7F", "4F", "4F"];
const STANDING_HEADS = ["신규모집", "상담환영", "특강접수", "겨울방학", "선착순", "무료진단"];

export const ownNameSample = Object.values(OWN_NAMES).flat().join("") + FLOORS.join("") + STANDING_HEADS.join("") + "학원입시☎";

const LETTER = "#ff0000";
const ACCENT = "#00ff00";
const KNOCKOUT = "#0000ff";

// How a sign maker finished the lettering: plain, outlined, drop-shadowed, or condensed.
type Finish = "plain" | "outline" | "shadow" | "condensed";
const FINISHES: readonly Finish[] = ["plain", "outline", "plain", "shadow", "condensed", "plain", "outline"];

function cellStyle(kind: LyricSignKind, slot: number) {
  const kindIndex = LYRIC_KINDS.indexOf(kind);
  // Neighbouring cells (adjacent signs in a row) never share a face.
  return {
    face: SIGN_FACES[(slot * 5 + kindIndex * 3) % SIGN_FACES.length]!,
    finish: FINISHES[(slot * 3 + kindIndex) % FINISHES.length]!,
  };
}

function setFace(context: CanvasRenderingContext2D, face: SignFace, size: number) {
  context.font = `${face.weight} ${size}px ${face.family}`;
}

function fittedSize(context: CanvasRenderingContext2D, text: string, face: SignFace, maxSize: number, maxWidth: number) {
  setFace(context, face, maxSize);
  const width = context.measureText(text).width;
  const size = width > maxWidth ? Math.floor((maxSize * maxWidth) / width) : maxSize;
  setFace(context, face, size);
  return size;
}

function textFont(context: CanvasRenderingContext2D, text: string, weight: number, maxSize: number, maxWidth: number) {
  fittedSize(context, text, { family: TEXT_FONT, weight }, maxSize, maxWidth);
}

// Lettering with its finish. Condensed signs squeeze the face horizontally.
function letter(context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, finish: Finish) {
  if (finish === "outline") {
    context.strokeStyle = ACCENT;
    context.lineJoin = "round";
    context.lineWidth = Math.max(3, size * 0.14);
    context.strokeText(text, x, y);
  } else if (finish === "shadow") {
    context.fillStyle = ACCENT;
    context.fillText(text, x + size * 0.06, y + size * 0.06);
  }
  context.fillStyle = LETTER;
  context.fillText(text, x, y);
}

function condensed(context: CanvasRenderingContext2D, finish: Finish, x: number, draw: () => void) {
  if (finish !== "condensed") return draw();
  context.save();
  context.translate(x, 0);
  context.scale(0.84, 1);
  context.translate(-x, 0);
  draw();
  context.restore();
}

// Stacked lightbox: one letter or syllable per line, some capped with 학원/입시, some framed.
function drawVertical(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, slot: number) {
  const { face, finish } = cellStyle("vertical", slot);
  let top = y + 20;
  if (slot % 3 === 1) {
    context.fillStyle = ACCENT;
    context.fillRect(x + 8, y + 8, w - 16, 72);
    context.fillStyle = KNOCKOUT;
    textFont(context, "학원", 900, 44, w - 30);
    context.fillText(slot % 2 ? "입시" : "학원", x + w / 2, y + 46);
    top = y + 92;
  } else if (slot % 4 === 0) {
    context.strokeStyle = ACCENT;
    context.lineWidth = 5;
    context.strokeRect(x + 9, y + 9, w - 18, h - 18);
  }
  const glyphs = [...text];
  const room = y + h - 22 - top;
  const step = room / glyphs.length;
  const size = Math.min(w * (finish === "outline" ? 0.68 : 0.76), step * 1.02);
  setFace(context, face, size);
  glyphs.forEach((glyph, index) => letter(context, glyph, x + w / 2, top + step * (index + 0.53), size, finish === "condensed" ? "plain" : finish));
}

// Floor sign or fascia: a floor chip or an accent bar, the name in the cell's face.
function drawHorizontal(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, slot: number) {
  const { face, finish } = cellStyle("horizontal", slot);
  const sub = FLOORS[slot] ?? "";
  let left = x + 20;
  let right = x + w - 20;
  if (/F$/.test(sub)) {
    context.fillStyle = ACCENT;
    context.fillRect(x + w - 104, y + 14, 90, h - 28);
    context.fillStyle = KNOCKOUT;
    textFont(context, sub, 900, 60, 76);
    context.fillText(sub, x + w - 59, y + h / 2 + 2);
    right = x + w - 120;
  } else if (sub) {
    context.fillStyle = LETTER;
    context.textAlign = "right";
    textFont(context, sub, 700, 24, 200);
    context.fillText(sub, right, y + h - 20);
    context.textAlign = "center";
  }
  if (slot % 3 === 0) {
    context.fillStyle = ACCENT;
    context.fillRect(x, y, 14, h);
    left += 6;
  }
  const centre = (left + right) / 2;
  const width = (right - left) / (finish === "condensed" ? 0.84 : 1);
  const size = fittedSize(context, text, face, 84, width * (finish === "outline" ? 0.94 : 1));
  condensed(context, finish, centre, () => letter(context, text, centre, y + h / 2 + (sub && !/F$/.test(sub) ? -8 : 3), size, finish));
}

// Sidewalk stand: an accent header with a call to enrol, the name, a phone line.
function drawStanding(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, slot: number) {
  const { face, finish } = cellStyle("standing", slot);
  const head = STANDING_HEADS[slot % STANDING_HEADS.length]!;
  context.fillStyle = ACCENT;
  context.fillRect(x, y, w, h * 0.2);
  context.fillStyle = KNOCKOUT;
  textFont(context, head, 900, h * 0.12, w * 0.84);
  context.fillText(head, x + w / 2, y + h * 0.1 + 2);

  const glyphs = [...text];
  // Short Korean names stack in two lines, as on real stands; others fit one line.
  const lines = glyphs.length >= 4 && glyphs.length <= 6 && !/[a-z]/i.test(text)
    ? [glyphs.slice(0, Math.ceil(glyphs.length / 2)).join(""), glyphs.slice(Math.ceil(glyphs.length / 2)).join("")]
    : [text];
  lines.forEach((line, index) => {
    const size = fittedSize(context, line, face, h * (lines.length > 1 ? 0.22 : 0.26), w * 0.86);
    const lineY = y + h * (lines.length > 1 ? 0.38 + index * 0.22 : 0.48);
    condensed(context, finish, x + w / 2, () => letter(context, line, x + w / 2, lineY, size, finish));
  });

  context.fillStyle = LETTER;
  context.fillRect(x + w * 0.1, y + h * 0.78, w * 0.8, 3);
  const phone = `☎ 02-55${slot}-12${slot}4`;
  textFont(context, phone, 700, h * 0.075, w * 0.8);
  context.fillText(phone, x + w / 2, y + h * 0.87);
}

export type LyricRows = {
  current: HTMLCanvasElement;
  // The faces as they were before the last word, for signs the change has not reached yet.
  previous: HTMLCanvasElement;
  // UV rects (x, y, w, h) of every cell, kind-major: index = kind × SLOTS + slot.
  rects: [number, number, number, number][];
  // Draws each slot's text (null keeps the cell's own name); returns the slots that changed.
  draw: (texts: readonly (string | null)[]) => number[];
};

export function createLyricRows(): LyricRows {
  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = ATLAS_W * SCALE;
    canvas.height = ATLAS_H * SCALE;
    return canvas;
  };
  const current = make();
  const previous = make();
  const context = current.getContext("2d")!;
  const previousContext = previous.getContext("2d")!;
  context.scale(SCALE, SCALE);
  context.textAlign = "center";
  context.textBaseline = "middle";

  const drawn: (string | null | undefined)[] = Array.from({ length: SLOTS }, () => undefined);

  const draw = (texts: readonly (string | null)[]) => {
    const changed: number[] = [];
    for (let slot = 0; slot < SLOTS; slot += 1) {
      if (drawn[slot] !== (texts[slot] ?? null)) changed.push(slot);
    }
    if (changed.length === 0) return changed;

    previousContext.drawImage(current, 0, 0);
    for (const slot of changed) {
      const text = texts[slot] ?? null;
      drawn[slot] = text;
      for (const kind of LYRIC_KINDS) {
        const { x, y } = cellOrigin(kind, slot);
        const { width, height } = CELL[kind];
        context.fillStyle = "#000";
        context.fillRect(x, y, width, height);
        // Lyric words are set in capitals, as Latin is on Korean signage.
        const label = text === null ? OWN_NAMES[kind][slot]! : text.toUpperCase();
        if (kind === "vertical") drawVertical(context, x, y, width, height, label, slot);
        else if (kind === "horizontal") drawHorizontal(context, x, y, width, height, label, slot);
        else drawStanding(context, x, y, width, height, label, slot);
      }
    }
    return changed;
  };
  draw([]);
  previousContext.drawImage(current, 0, 0);

  const rects = LYRIC_KINDS.flatMap((kind) =>
    Array.from({ length: SLOTS }, (_, slot): [number, number, number, number] => {
      const { x, y } = cellOrigin(kind, slot);
      const { width, height } = CELL[kind];
      return [(x + 1) / ATLAS_W, 1 - (y + height - 1) / ATLAS_H, (width - 2) / ATLAS_W, (height - 2) / ATLAS_H];
    }),
  );

  return { current, previous, rects, draw };
}

// Slot w holds word w of the line once it has been sung, and its own name before.
export function slotTexts(lyric: readonly string[], activeWordPosition: number): (string | null)[] {
  return Array.from({ length: SLOTS }, (_, slot) => (slot < lyric.length && slot <= activeWordPosition ? lyric[slot]! : null));
}
