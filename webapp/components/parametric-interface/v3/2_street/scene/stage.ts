import * as THREE from "three";
import { fasciaShops, projectingShops, type Shop } from "../model/shops";
import { createAlley } from "./alley";
import { createFascias, createLightboxes } from "./signs";

const DUSK = "#22304d";
const CAMERA = { fov: 50, position: new THREE.Vector3(0.35, 1.62, 3.6), target: new THREE.Vector3(-0.1, 2.9, -40) };
// Every point light is paid by every lit fragment; keep only the ones that read.
const SIGN_SPILL_LIGHTS = 4;
const SHOP_LIGHTS = 4;

function disposeScene(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

export type Street = {
  // Every projecting sign's name becomes this word at once; null restores the shops' own.
  setWord: (word: string | null) => void;
  dispose: () => void;
};

// Euljiro back alley at blue hour from a fixed eye-level camera. Nothing moves;
// the scene is redrawn only when a sign changes or the frame resizes.
export function mountStreet(container: HTMLElement, className: string): Street {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = className;
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(DUSK);
  scene.fog = new THREE.FogExp2(DUSK, 0.018);
  scene.add(new THREE.HemisphereLight("#5a6f99", "#2a2018", 0.9));

  const alley = createAlley();
  scene.add(alley.group);

  const frame = new THREE.MeshStandardMaterial({ color: "#2d2f33", metalness: 0.6, roughness: 0.45 });
  // Fascias along the walls keep their shops' names; only the lightboxes take the lyric.
  scene.add(createFascias(alley.fascias, fasciaShops, frame));

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.1, 200);
  camera.position.copy(CAMERA.position);
  camera.lookAt(CAMERA.target);
  camera.updateMatrixWorld();

  // Signs a landscape frame shows come first, nearest first, so the spill
  // lights below go to signs that are seen.
  const inFrame = (anchor: (typeof alley.projecting)[number]) => {
    const point = new THREE.Vector3(anchor.wallX - Math.sign(anchor.wallX) * (0.22 + anchor.width / 2), anchor.y, anchor.z).project(camera);
    return point.z < 1 && Math.abs(point.x) < 0.92 && Math.abs(point.y) < 0.9;
  };
  const byDistance = (a: { z: number }, b: { z: number }) => b.z - a.z;
  const anchors = [
    ...alley.projecting.filter(inFrame).sort(byDistance),
    ...alley.projecting.filter((anchor) => !inFrame(anchor)).sort(byDistance),
  ];
  const shops: Shop[] = anchors.map((_, index) => projectingShops[index] ?? fasciaShops[index % fasciaShops.length]!);
  const lightboxes = createLightboxes(anchors, shops, frame, CAMERA.position.z);
  scene.add(lightboxes.group);

  for (const spill of lightboxes.spill.slice(0, SIGN_SPILL_LIGHTS)) {
    const light = new THREE.PointLight(spill.colour, 6, 7, 2);
    light.position.copy(spill.position);
    scene.add(light);
  }
  for (const position of alley.lamps) {
    const light = new THREE.PointLight("#ffcf8f", 40, 18, 2);
    light.position.copy(position);
    scene.add(light);
  }
  for (const position of alley.shopLights.slice(0, SHOP_LIGHTS)) {
    const light = new THREE.PointLight("#eef3ff", 10, 7, 2);
    light.position.copy(position);
    scene.add(light);
  }

  // Coalesce requests so several changes in one frame cost one render.
  let pending = 0;
  const render = () => {
    if (pending) return;
    pending = window.requestAnimationFrame(() => {
      pending = 0;
      renderer.render(scene, camera);
    });
  };

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    // Portrait screens widen the lens so both walls stay in frame.
    camera.fov = camera.aspect < 1 ? 68 : CAMERA.fov;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let current: string | null = null;

  return {
    setWord(word) {
      if (word === current) return;
      current = word;
      lightboxes.setName(word);
      render();
    },
    dispose() {
      window.cancelAnimationFrame(pending);
      observer.disconnect();
      disposeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
