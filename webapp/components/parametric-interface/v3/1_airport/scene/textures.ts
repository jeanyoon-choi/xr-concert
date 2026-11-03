import * as THREE from "three";
import { pick, range, seededRandom } from "./random";

function canvasTexture(width: number, height: number, draw: (context: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext("2d")!);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function tiled(texture: THREE.Texture, metresX: number, metresY: number) {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // ShapeGeometry and the box UVs below are written in metres, so repeat is 1 / tile size.
  texture.repeat.set(1 / metresX, 1 / metresY);
  return texture;
}

function speckle(
  context: CanvasRenderingContext2D,
  random: () => number,
  width: number,
  height: number,
  count: number,
  colours: readonly string[],
  maxSize: number,
) {
  for (let index = 0; index < count; index += 1) {
    context.globalAlpha = range(random, 0.18, 0.7);
    context.fillStyle = pick(random, colours);
    const size = range(random, 0.6, maxSize);
    context.fillRect(random() * width, random() * height, size, size * range(random, 0.6, 1.4));
  }
  context.globalAlpha = 1;
}

// Honed limestone cladding: 1.6 × 0.8 m panels, each cut from a slightly different block.
export function createStoneTexture() {
  const random = seededRandom(11);
  const pxPerMetre = 256;
  const panelWidth = 1.6 * pxPerMetre;
  const panelHeight = 0.8 * pxPerMetre;

  const texture = canvasTexture(2048, 1024, (context) => {
    for (let y = 0; y < 1024; y += panelHeight) {
      for (let x = 0; x < 2048; x += panelWidth) {
        const tone = Math.round(range(random, -7, 7));
        context.fillStyle = `rgb(${190 + tone} ${185 + tone} ${175 + tone})`;
        context.fillRect(x, y, panelWidth, panelHeight);
      }
    }

    speckle(context, random, 2048, 1024, 26_000, ["#9d978c", "#cfcac0", "#a9a297", "#d8d3c8"], 2.2);

    context.fillStyle = "#77736b";
    for (let y = 0; y < 1024; y += panelHeight) context.fillRect(0, y, 2048, 2);
    for (let x = 0; x < 2048; x += panelWidth) context.fillRect(x, 0, 2, 1024);
  });

  return tiled(texture, 8, 4);
}

// Polished grey terrazzo in 1 m tiles.
export function createTerrazzoTexture() {
  const random = seededRandom(23);
  const size = 2048;
  const tile = size / 4;

  const texture = canvasTexture(size, size, (context) => {
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const tone = Math.round(range(random, -4, 4));
        context.fillStyle = `rgb(${150 + tone} ${149 + tone} ${145 + tone})`;
        context.fillRect(x, y, tile, tile);
      }
    }

    speckle(context, random, size, size, 90_000, ["#5f5d59", "#c9c6bf", "#7c7a74", "#e2dfd8", "#3e3d3a", "#a59d8f"], 3.2);

    context.fillStyle = "#6b6964";
    for (let line = 0; line < size; line += tile) {
      context.fillRect(0, line, size, 2);
      context.fillRect(line, 0, 2, size);
    }
  });

  return tiled(texture, 4, 4);
}
