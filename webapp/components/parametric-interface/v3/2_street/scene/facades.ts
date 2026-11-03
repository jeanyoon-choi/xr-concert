import * as THREE from "three";
import { pick, range, type Random } from "./random";

const PX_PER_M = 72;

export type FacadeKind = "paint" | "tile" | "brick" | "stone";

const WINDOW_WORDS = ["인쇄", "기획", "임대문의", "사무실", "디자인", "출력", "제본", "세무회계", "공구", "조명"] as const;

function stains(context: CanvasRenderingContext2D, random: Random, width: number, height: number, count: number) {
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const top = random() * height * 0.9;
    const length = range(random, height * 0.05, height * 0.35);
    context.globalAlpha = range(random, 0.04, 0.14);
    context.fillStyle = "#2a241d";
    context.fillRect(x, top, range(random, 2, 9), length);
  }
  context.globalAlpha = 1;
}

// Per-pixel grain written straight into the image data: one pass, no draw calls.
function speckle(context: CanvasRenderingContext2D, random: Random, width: number, height: number, count: number, colour: string) {
  const tint = new THREE.Color(colour);
  const [r, g, b] = [tint.r * 255, tint.g * 255, tint.b * 255];
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  const pixels = width * height;
  for (let index = 0; index < count; index += 1) {
    const offset = Math.floor(random() * pixels) * 4;
    const alpha = range(random, 0.05, 0.25);
    data[offset] = data[offset]! + (r - data[offset]!) * alpha;
    data[offset + 1] = data[offset + 1]! + (g - data[offset + 1]!) * alpha;
    data[offset + 2] = data[offset + 2]! + (b - data[offset + 2]!) * alpha;
  }
  context.putImageData(image, 0, 0);
}

function wall(context: CanvasRenderingContext2D, random: Random, kind: FacadeKind, width: number, height: number) {
  switch (kind) {
    case "paint": {
      context.fillStyle = pick(random, ["#c9c0ad", "#b9b6a8", "#a9b4ad", "#d2c6b0", "#9fa3a2", "#c4b49a"]);
      context.fillRect(0, 0, width, height);
      speckle(context, random, width, height, width * height * 0.02, "#5e574c");
      break;
    }
    case "tile": {
      // 1980s two-tone ceramic tiles, 0.1 × 0.2 m.
      const base = pick(random, [["#9b6b4c", "#8a5c3f"], ["#c9b79a", "#b8a587"], ["#7f7a72", "#706b63"], ["#b88d64", "#a47b55"]]);
      const tileW = 0.2 * PX_PER_M;
      const tileH = 0.1 * PX_PER_M;
      for (let y = 0; y < height; y += tileH) {
        for (let x = 0; x < width; x += tileW) {
          context.fillStyle = random() < 0.5 ? base[0]! : base[1]!;
          context.fillRect(x, y, tileW, tileH);
        }
      }
      context.fillStyle = "rgba(230, 226, 214, 0.55)";
      for (let y = 0; y < height; y += tileH) context.fillRect(0, y, width, 1);
      for (let x = 0; x < width; x += tileW) context.fillRect(x, 0, 1, height);
      break;
    }
    case "brick": {
      const brickW = 0.21 * PX_PER_M;
      const brickH = 0.068 * PX_PER_M;
      context.fillStyle = "#b9ad9a";
      context.fillRect(0, 0, width, height);
      for (let row = 0, y = 0; y < height; row += 1, y += brickH) {
        for (let x = row % 2 ? -brickW / 2 : 0; x < width; x += brickW) {
          context.fillStyle = pick(random, ["#8c4630", "#7d3e2b", "#9a5338", "#6f3826", "#a05c3f"]);
          context.fillRect(x + 1, y + 1, brickW - 2, brickH - 2);
        }
      }
      break;
    }
    case "stone": {
      context.fillStyle = pick(random, ["#a8a49c", "#8f8c86", "#b7b0a3"]);
      context.fillRect(0, 0, width, height);
      speckle(context, random, width, height, width * height * 0.08, "#3d3a35");
      speckle(context, random, width, height, width * height * 0.04, "#f0ece4");
      context.fillStyle = "rgba(60, 56, 50, 0.5)";
      for (let y = 0; y < height; y += 0.6 * PX_PER_M) context.fillRect(0, y, width, 2);
      for (let x = 0; x < width; x += 1.2 * PX_PER_M) context.fillRect(x, 0, 2, height);
      break;
    }
  }
}

export type Facade = {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  // Wall-relative positions (metres from the facade's left edge and ground) for air conditioners.
  units: { u: number; y: number }[];
};

// Upper floors of one building: wall finish, aluminium windows with grilles,
// blinds, vinyl lettering, and a separate emissive map for the lit rooms.
export function paintFacade(random: Random, widthM: number, heightM: number, groundM: number, floorM: number): Facade {
  const width = Math.round(widthM * PX_PER_M);
  const height = Math.round(heightM * PX_PER_M);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;
  const glow = document.createElement("canvas");
  glow.width = width;
  glow.height = height;
  const glowContext = glow.getContext("2d")!;
  glowContext.fillStyle = "#000";
  glowContext.fillRect(0, 0, width, height);

  const kind = pick(random, ["paint", "paint", "tile", "tile", "brick", "stone"] as const);
  wall(context, random, kind, width, height);

  const units: Facade["units"] = [];
  const floors = Math.round((heightM - groundM) / floorM);
  const columns = Math.max(1, Math.round(widthM / range(random, 2.2, 3.2)));
  const bay = widthM / columns;

  for (let floor = 0; floor < floors; floor += 1) {
    const floorBase = groundM + floor * floorM;
    // Concrete floor band.
    context.fillStyle = "rgba(70, 66, 60, 0.35)";
    context.fillRect(0, height - (floorBase + 0.02) * PX_PER_M, width, 0.18 * PX_PER_M);

    const lit = random() < 0.45;
    const warm = random() < 0.4;
    const grille = random() < 0.4;
    const blinds = random() < 0.5;
    const lettering = random() < 0.28 ? pick(random, WINDOW_WORDS) : null;

    for (let column = 0; column < columns; column += 1) {
      const windowW = bay * range(random, 0.55, 0.72);
      const windowH = floorM * range(random, 0.42, 0.52);
      const left = (column * bay + (bay - windowW) / 2) * PX_PER_M;
      const top = height - (floorBase + floorM * 0.32 + windowH) * PX_PER_M;
      const w = windowW * PX_PER_M;
      const h = windowH * PX_PER_M;

      // Frame, glass, mullion.
      context.fillStyle = "#8e9295";
      context.fillRect(left - 3, top - 3, w + 6, h + 6);
      const roomLit = lit && random() < 0.8;
      context.fillStyle = roomLit ? (warm ? "#e9c98f" : "#d9e4e8") : pick(random, ["#1d2328", "#252b31", "#2c3237"]);
      context.fillRect(left, top, w, h);
      if (roomLit) {
        glowContext.fillStyle = warm ? "#c79a55" : "#a9bcc4";
        glowContext.fillRect(left, top, w, h);
      }
      if (roomLit && blinds) {
        for (let line = top; line < top + h; line += 5) {
          context.fillStyle = "rgba(90, 80, 60, 0.35)";
          context.fillRect(left, line, w, 2);
          glowContext.fillStyle = "rgba(0, 0, 0, 0.35)";
          glowContext.fillRect(left, line, w, 2);
        }
      }
      context.fillStyle = "#7b7f82";
      context.fillRect(left + w / 2 - 2, top, 4, h);
      if (grille) {
        context.fillStyle = "#3a3c3e";
        for (let bar = left + 6; bar < left + w; bar += 9) {
          context.fillRect(bar, top - 4, 2, h + 8);
          glowContext.fillStyle = "#000";
          glowContext.fillRect(bar, top - 4, 2, h + 8);
        }
        context.fillRect(left - 4, top - 6, w + 8, 3);
        context.fillRect(left - 4, top + h + 3, w + 8, 3);
      }
      if (lettering && column === 0) {
        const size = Math.round(h * 0.34);
        context.font = `800 ${size}px "Apple SD Gothic Neo", "Gothic A1", sans-serif`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = pick(random, ["#d61f1f", "#1b3a8c", "#f2f2f2"]);
        context.fillText(lettering, left + w / 2, top + h / 2, w * 0.9);
        glowContext.fillStyle = "#000";
        glowContext.font = context.font;
        glowContext.textAlign = "center";
        glowContext.textBaseline = "middle";
        glowContext.fillText(lettering, left + w / 2, top + h / 2, w * 0.9);
      }
      // Sill drip.
      context.fillStyle = "rgba(40, 36, 30, 0.25)";
      context.fillRect(left, top + h + 6, w, 4);

      if (random() < 0.22) units.push({ u: column * bay + bay / 2 + range(random, -0.3, 0.3), y: floorBase + floorM * 0.12 });
    }
  }

  stains(context, random, width, height, Math.round(widthM * 4));

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const emissiveMap = new THREE.CanvasTexture(glow);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap, units };
}

// Roll-shutter slats as a 1 m repeating tile (UVs are in metres).
export function paintShutter(random: Random) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = pick(random, ["#a7abad", "#9aa0a3", "#b4b2aa", "#8f9597"]);
  context.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 8) {
    context.fillStyle = "rgba(0, 0, 0, 0.22)";
    context.fillRect(0, y, size, 2);
    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    context.fillRect(0, y + 3, size, 1);
  }
  speckle(context, random, size, size, size * size * 0.1, "#3d3a35");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

// Patched asphalt with a concrete gutter at each wall.
export function paintAsphalt(random: Random, widthM: number, lengthM: number) {
  const scale = 40;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(widthM * scale);
  canvas.height = Math.min(4096, Math.round(lengthM * scale));
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#3b3b3a";
  context.fillRect(0, 0, canvas.width, canvas.height);
  speckle(context, random, canvas.width, canvas.height, canvas.width * canvas.height * 0.25, "#6c6a66");
  speckle(context, random, canvas.width, canvas.height, canvas.width * canvas.height * 0.15, "#1e1e1d");

  for (let patch = 0; patch < 26; patch += 1) {
    context.fillStyle = pick(random, ["rgba(20, 20, 20, 0.45)", "rgba(90, 88, 84, 0.35)"]);
    context.fillRect(random() * canvas.width, random() * canvas.height, range(random, 20, 90), range(random, 30, 160));
  }
  // Cracks.
  context.strokeStyle = "rgba(15, 15, 15, 0.7)";
  context.lineWidth = 1.5;
  for (let crack = 0; crack < 40; crack += 1) {
    let x = random() * canvas.width;
    let y = random() * canvas.height;
    context.beginPath();
    context.moveTo(x, y);
    for (let step = 0; step < 6; step += 1) {
      x += range(random, -10, 10);
      y += range(random, 4, 16);
      context.lineTo(x, y);
    }
    context.stroke();
  }
  // Gutters.
  const gutter = 0.35 * scale;
  context.fillStyle = "#77746e";
  context.fillRect(0, 0, gutter, canvas.height);
  context.fillRect(canvas.width - gutter, 0, gutter, canvas.height);
  context.fillStyle = "rgba(30, 30, 30, 0.6)";
  for (let y = 0; y < canvas.height; y += 0.6 * scale) {
    context.fillRect(0, y, gutter, 1);
    context.fillRect(canvas.width - gutter, y, gutter, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}
