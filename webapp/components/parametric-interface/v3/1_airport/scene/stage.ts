import * as THREE from "three";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createArchitecture } from "./architecture";
import { CAMERA, MONITOR } from "./dimensions";
import { createMonitor } from "./monitor";

const AIR = "#d3d6d8";

export type LayerClassNames = { background: string; display: string; foreground: string };

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

function createRenderer(pixelRatio: number, className: string, alpha: boolean) {
  const renderer = new THREE.WebGLRenderer({ alpha, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.domElement.className = className;
  return renderer;
}

function withEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene, intensity: number) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = intensity;
  return environment;
}

// Three stacked layers share one fixed camera: the hall (WebGL), the live DOM
// display (CSS3D), and the monitor housing (WebGL) with an aperture cut where
// the display shows through. Everything is in focus, as in a view-camera still.
export function mountAirportHall(container: HTMLElement, displayElement: HTMLElement, layers: LayerClassNames) {
  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  const hallRenderer = createRenderer(pixelRatio, layers.background, false);
  hallRenderer.shadowMap.enabled = true;
  hallRenderer.shadowMap.type = THREE.PCFShadowMap;
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.domElement.className = layers.display;
  const monitorRenderer = createRenderer(pixelRatio, layers.foreground, true);

  container.append(hallRenderer.domElement, cssRenderer.domElement, monitorRenderer.domElement);

  // Hall: overcast daylight through the airside glazing, ceiling luminaires as fill.
  const hall = new THREE.Scene();
  hall.background = new THREE.Color(AIR);
  hall.fog = new THREE.Fog(AIR, 28, 150);
  const hallEnvironment = withEnvironment(hallRenderer, hall, 0.4);
  hall.add(new THREE.HemisphereLight("#f3f5f7", "#8f8b82", 1.45));

  const daylight = new THREE.DirectionalLight("#fff8ee", 1.7);
  daylight.position.set(-18, 34, -90);
  daylight.target.position.set(0, 0, -16);
  daylight.castShadow = true;
  daylight.shadow.mapSize.set(2048, 2048);
  daylight.shadow.camera.left = -40;
  daylight.shadow.camera.right = 40;
  daylight.shadow.camera.top = 40;
  daylight.shadow.camera.bottom = -40;
  daylight.shadow.camera.near = 20;
  daylight.shadow.camera.far = 160;
  daylight.shadow.bias = -0.0004;
  daylight.shadow.normalBias = 0.03;
  daylight.shadow.radius = 4;
  hall.add(daylight, daylight.target);

  const reflectionSize = () => ({
    width: Math.round((container.clientWidth || window.innerWidth) * pixelRatio * 0.5),
    height: Math.round((container.clientHeight || window.innerHeight) * pixelRatio * 0.5),
  });

  const architecture = createArchitecture(reflectionSize());
  hall.add(architecture.group);

  // Monitor: the same light, so housing and hall agree.
  const foreground = new THREE.Scene();
  const monitorEnvironment = withEnvironment(monitorRenderer, foreground, 0.55);
  foreground.add(new THREE.HemisphereLight("#f3f5f7", "#8f8b82", 1.45));
  const monitorKey = new THREE.DirectionalLight("#fff8ee", 0.9);
  monitorKey.position.set(-6, 12, -20);
  foreground.add(monitorKey);
  const monitor = createMonitor(displayElement);
  foreground.add(monitor.group);

  const displayScene = new THREE.Scene();
  displayScene.add(monitor.cssObject);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 600);

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    // Step back on narrow screens until the monitor fits its share of the frame.
    const halfHorizontal = Math.atan(Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2)) * camera.aspect);
    const fitDistance = (MONITOR.width + MONITOR.bezel * 2) / (2 * Math.tan(halfHorizontal) * CAMERA.maximumMonitorShare);
    // Fixed at eye level, looking just up at the screen centre.
    camera.position.set(0, CAMERA.eyeHeight, Math.max(0, fitDistance + MONITOR.z));
    camera.lookAt(0, MONITOR.centerY - 0.04, MONITOR.z);

    hallRenderer.setSize(width, height);
    cssRenderer.setSize(width, height);
    monitorRenderer.setSize(width, height);
    const size = reflectionSize();
    architecture.reflector.getRenderTarget().setSize(size.width, size.height);

    // Nothing in the hall moves and the DOM display updates itself, so the
    // layers are drawn only when the frame changes size.
    hallRenderer.render(hall, camera);
    cssRenderer.render(displayScene, camera);
    monitorRenderer.render(foreground, camera);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return () => {
    observer.disconnect();
    displayScene.remove(monitor.cssObject);
    architecture.reflector.dispose();
    disposeScene(hall);
    disposeScene(foreground);
    hallEnvironment.dispose();
    monitorEnvironment.dispose();
    hallRenderer.dispose();
    monitorRenderer.dispose();
    hallRenderer.domElement.remove();
    cssRenderer.domElement.remove();
    monitorRenderer.domElement.remove();
  };
}
