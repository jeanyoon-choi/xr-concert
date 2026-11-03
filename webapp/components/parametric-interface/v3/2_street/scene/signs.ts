import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Shop } from "../model/shops";

export const SIGN_FONT = '"Apple SD Gothic Neo", "Gothic A1", "Noto Sans KR", "Malgun Gothic", sans-serif';
// Lightbox face resolution at 10 m from the camera, falling off with distance
// as the sign shrinks on screen, so every face fits one atlas.
const PROJECTING_PX_PER_M = 420;
const FULL_RESOLUTION_DISTANCE_M = 10;
const FASCIA_PX_PER_M = 240;
const ATLAS_SIZE = 2048;

// One measurement instead of a shrinking loop: text scales linearly with size.
function fittedSize(context: CanvasRenderingContext2D, text: string, weight: number, maxSize: number, maxWidth: number) {
  context.font = `${weight} ${maxSize}px ${SIGN_FONT}`;
  const width = context.measureText(text).width;
  return width > maxWidth ? Math.floor((maxSize * maxWidth) / width) : maxSize;
}

// Everything on a lightbox face except the name: background, accent rule, trade, phone.
function drawProjectingBase(context: CanvasRenderingContext2D, width: number, height: number, shop: Shop) {
  const { background, ink, accent } = shop.palette;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const inset = Math.round(height * 0.05);
  context.strokeStyle = accent;
  context.lineWidth = Math.max(3, height * 0.014);
  context.strokeRect(inset, inset, width - inset * 2, height - inset * 2);

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = accent;
  context.font = `600 ${fittedSize(context, shop.trade, 600, height * 0.12, width * 0.8)}px ${SIGN_FONT}`;
  context.fillText(shop.trade, width / 2, height * 0.7);

  context.fillStyle = ink;
  context.font = `700 ${Math.round(height * 0.1)}px ${SIGN_FONT}`;
  context.fillText(`☎ ${shop.phone}`, width / 2, height * 0.84);
}

function drawProjectingName(context: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, shop: Shop) {
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = shop.palette.ink;
  context.font = `800 ${fittedSize(context, shop.name, 800, height * 0.42, width * 0.82)}px ${SIGN_FONT}`;
  context.fillText(shop.name, left + width / 2, top + height * 0.42);
}

// Shopfront fascia: name left of centre, trade and phone on the right, as on old flex signs.
function drawFascia(context: CanvasRenderingContext2D, width: number, height: number, shop: Shop) {
  const { background, ink, accent } = shop.palette;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = accent;
  context.fillRect(0, height * 0.88, width, height * 0.12);

  context.textBaseline = "middle";
  context.fillStyle = ink;
  const hasDetail = shop.trade.length > 0 || shop.phone.length > 0;
  const nameWidth = hasDetail ? width * 0.58 : width * 0.86;
  context.font = `800 ${fittedSize(context, shop.name, 800, height * 0.62, nameWidth)}px ${SIGN_FONT}`;
  context.textAlign = hasDetail ? "left" : "center";
  context.fillText(shop.name, hasDetail ? width * 0.05 : width / 2, height * 0.45);

  if (hasDetail) {
    context.textAlign = "right";
    context.font = `600 ${Math.round(height * 0.17)}px ${SIGN_FONT}`;
    context.fillText(shop.trade, width * 0.95, height * 0.3);
    context.font = `700 ${Math.round(height * 0.22)}px ${SIGN_FONT}`;
    context.fillText(shop.phone, width * 0.95, height * 0.6);
  }
}

export type LightboxAnchor = { wallX: number; y: number; z: number; width: number; height: number };

export type Lightboxes = {
  group: THREE.Group;
  // Where each sign's light falls, for spill lights.
  spill: { colour: THREE.Color; position: THREE.Vector3 }[];
  // Sets every sign's name at once (null keeps the shop's own); one canvas upload.
  setName: (name: string | null) => void;
};

// All projecting lightboxes share one atlas texture and two merged meshes
// (steel frames and brackets, lit faces), however many signs line the alley.
export function createLightboxes(anchors: readonly LightboxAnchor[], shops: readonly Shop[], frame: THREE.Material, cameraZ: number): Lightboxes {
  const atlas = document.createElement("canvas");
  atlas.width = ATLAS_SIZE;
  atlas.height = ATLAS_SIZE;
  const context = atlas.getContext("2d")!;

  // Shelf-pack the faces into the atlas, shrinking the scale until all fit.
  const pack = (scale: number) => {
    const placed: { left: number; top: number; width: number; height: number }[] = [];
    let cursorX = 0;
    let cursorY = 0;
    let shelf = 0;
    for (const anchor of anchors) {
      const density = scale * PROJECTING_PX_PER_M * Math.min(1, FULL_RESOLUTION_DISTANCE_M / Math.max(1, cameraZ - anchor.z));
      const width = Math.round(anchor.width * density);
      const height = Math.round(anchor.height * density);
      if (cursorX + width > ATLAS_SIZE) {
        cursorX = 0;
        cursorY += shelf + 2;
        shelf = 0;
      }
      placed.push({ left: cursorX, top: cursorY, width, height });
      cursorX += width + 2;
      shelf = Math.max(shelf, height);
    }
    return cursorY + shelf <= ATLAS_SIZE ? placed : null;
  };
  let layout = pack(1);
  for (let scale = 0.9; !layout; scale *= 0.9) layout = pack(scale);

  // Each cell keeps a pre-drawn base without its name.
  const cells = layout.map((cell, index) => {
    const base = document.createElement("canvas");
    base.width = cell.width;
    base.height = cell.height;
    drawProjectingBase(base.getContext("2d")!, cell.width, cell.height, shops[index]!);
    return { ...cell, base };
  });

  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const depth = 0.2;
  const faces: THREE.BufferGeometry[] = [];
  const frames: THREE.BufferGeometry[] = [];
  const spill: Lightboxes["spill"] = [];

  anchors.forEach((anchor, index) => {
    const cell = cells[index]!;
    const side = Math.sign(anchor.wallX);
    const offset = 0.22 + anchor.width / 2;
    const x = anchor.wallX - side * offset;

    frames.push(new THREE.BoxGeometry(anchor.width + 0.04, anchor.height + 0.04, depth).translate(x, anchor.y, anchor.z));
    frames.push(new THREE.BoxGeometry(offset + 0.05, 0.05, 0.05).translate(anchor.wallX - (side * (offset + 0.05)) / 2, anchor.y + anchor.height / 2 + 0.06, anchor.z));

    // Front and back faces, both mapped to this sign's atlas cell (canvas y runs down, UV v up).
    const u0 = cell.left / ATLAS_SIZE;
    const u1 = (cell.left + cell.width) / ATLAS_SIZE;
    const v0 = 1 - (cell.top + cell.height) / ATLAS_SIZE;
    const v1 = 1 - cell.top / ATLAS_SIZE;
    for (const facing of [1, -1]) {
      const plane = new THREE.PlaneGeometry(anchor.width, anchor.height);
      if (facing === -1) plane.rotateY(Math.PI);
      plane.translate(x, anchor.y, anchor.z + facing * (depth / 2 + 0.002));
      const uv = plane.getAttribute("uv") as THREE.BufferAttribute;
      for (let vertex = 0; vertex < uv.count; vertex += 1) {
        uv.setXY(vertex, u0 + uv.getX(vertex) * (u1 - u0), v0 + uv.getY(vertex) * (v1 - v0));
      }
      faces.push(plane);
    }

    spill.push({ colour: new THREE.Color(shops[index]!.palette.background), position: new THREE.Vector3(x, anchor.y, anchor.z + 0.6) });
  });

  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(mergeGeometries(frames)!, frame),
    // Lit acrylic: the face is the light source, so it is not shaded.
    new THREE.Mesh(mergeGeometries(faces)!, new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })),
  );
  for (const geometry of [...frames, ...faces]) geometry.dispose();

  const setName = (name: string | null) => {
    cells.forEach((cell, index) => {
      const shop = shops[index]!;
      context.drawImage(cell.base, cell.left, cell.top);
      drawProjectingName(context, cell.left, cell.top, cell.width, cell.height, name === null ? shop : { ...shop, name });
    });
    texture.needsUpdate = true;
  };
  setName(null);

  return { group, spill, setName };
}

export type FasciaAnchor = { wallX: number; y: number; z: number; width: number; lit: boolean };

// Shopfront fascias, drawn once: frames merged into one mesh, faces lit or unlit.
export function createFascias(anchors: readonly FasciaAnchor[], shops: readonly Shop[], frame: THREE.Material) {
  const group = new THREE.Group();
  const height = 0.78;
  const frames: THREE.BufferGeometry[] = [];

  anchors.forEach((anchor, index) => {
    const side = Math.sign(anchor.wallX);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(anchor.width * FASCIA_PX_PER_M);
    canvas.height = Math.round(height * FASCIA_PX_PER_M);
    drawFascia(canvas.getContext("2d")!, canvas.width, canvas.height, shops[index % shops.length]!);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;

    const face = anchor.lit
      ? new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
      : new THREE.MeshLambertMaterial({ map: texture });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(anchor.width, height), face);
    plane.rotation.y = (-side * Math.PI) / 2;
    plane.position.set(anchor.wallX - side * 0.161, anchor.y, anchor.z);
    group.add(plane);
    frames.push(new THREE.BoxGeometry(0.16, height + 0.06, anchor.width + 0.06).translate(anchor.wallX - side * 0.08, anchor.y, anchor.z));
  });

  group.add(new THREE.Mesh(mergeGeometries(frames)!, frame));
  for (const geometry of frames) geometry.dispose();
  return group;
}
