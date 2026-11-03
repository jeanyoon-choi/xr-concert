import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { DISPLAY_PIXELS, MONITOR } from "./dimensions";

function placed(geometry: THREE.BufferGeometry, x: number, y: number, z: number) {
  geometry.translate(x, y, z);
  return geometry;
}

export type Monitor = {
  group: THREE.Group;
  cssObject: CSS3DObject;
};

// A plain landscape TV on a slim floor stand.
export function createMonitor(displayElement: HTMLElement): Monitor {
  const group = new THREE.Group();
  const { width, height, centerY, z, bezel, depth } = MONITOR;
  const faceZ = z + depth / 2;

  const enclosureMaterial = new THREE.MeshStandardMaterial({ color: "#141518", roughness: 0.32, metalness: 0.55 });
  const powderCoat = new THREE.MeshStandardMaterial({ color: "#3b3e43", roughness: 0.55, metalness: 0.45 });

  // The bezel overlaps the screen edge by 4 mm so sub-pixel drift between the
  // CSS and WebGL projections never shows a seam.
  const overlap = 0.004;
  const outerWidth = width + bezel * 2;
  const enclosure = new THREE.Mesh(
    mergeGeometries([
      placed(new THREE.BoxGeometry(outerWidth, bezel + overlap, depth), 0, centerY + height / 2 + (bezel - overlap) / 2, z),
      placed(new THREE.BoxGeometry(outerWidth, bezel + overlap, depth), 0, centerY - height / 2 - (bezel - overlap) / 2, z),
      placed(new THREE.BoxGeometry(bezel + overlap, height, depth), -width / 2 - (bezel - overlap) / 2, centerY, z),
      placed(new THREE.BoxGeometry(bezel + overlap, height, depth), width / 2 + (bezel - overlap) / 2, centerY, z),
      placed(new THREE.BoxGeometry(width, height, depth - 0.01), 0, centerY, z - 0.005),
    ])!,
    enclosureMaterial,
  );

  const pylonTop = centerY + height / 4;
  const pylon = new THREE.Mesh(
    mergeGeometries([
      placed(new THREE.BoxGeometry(0.1, pylonTop, 0.06), 0, pylonTop / 2, z - depth / 2 - 0.03),
      placed(new THREE.BoxGeometry(0.7, 0.02, 0.45), 0, 0.01, z - depth / 2 - 0.03),
    ])!,
    powderCoat,
  );

  // Toughened cover glass: a faint, even sheen over the panel.
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({
      color: "#ffffff",
      depthWrite: false,
      metalness: 1,
      opacity: 0.045,
      roughness: 0.08,
      transparent: true,
    }),
  );
  glass.position.set(0, centerY, faceZ + 0.002);

  // The DOM display sits behind the transparent canvas; this clears the canvas
  // where the display shows and still occludes what lies behind the screen.
  const aperture = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      blending: THREE.NoBlending,
      color: 0x000000,
      fog: false,
      opacity: 0,
      toneMapped: false,
      transparent: true,
    }),
  );
  aperture.position.set(0, centerY, faceZ);
  aperture.renderOrder = 1;
  glass.renderOrder = 2;

  group.add(enclosure, pylon, aperture, glass);

  displayElement.style.width = `${DISPLAY_PIXELS.width}px`;
  displayElement.style.height = `${DISPLAY_PIXELS.height}px`;
  const cssObject = new CSS3DObject(displayElement);
  cssObject.position.set(0, centerY, faceZ);
  cssObject.scale.setScalar(width / DISPLAY_PIXELS.width);

  return { group, cssObject };
}
