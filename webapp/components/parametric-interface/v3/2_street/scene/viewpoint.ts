import * as THREE from "three";

// Viewpoint controls: drag to look, wheel or pinch to walk forward and back,
// W A S D / arrow keys to walk, Q / E to lower and raise, double-click to return
// to the opening view. The camera stays inside `bounds`.

const LOOK_RADIANS_PER_PX = 0.0035;
const PITCH_LIMIT = 1.25;
const WHEEL_METRES_PER_PX = 0.012;
const PINCH_METRES_PER_PX = 0.04;
const DRAG_THRESHOLD_PX = 4;

export type ViewpointOptions = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  bounds: THREE.Box3;
  // Metres per key press (auto-repeat makes it continuous).
  step: number;
  onChange: () => void;
};

export function createViewpoint(element: HTMLElement, camera: THREE.PerspectiveCamera, options: ViewpointOptions) {
  const position = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;

  const reset = () => {
    position.copy(options.position);
    const direction = options.target.clone().sub(options.position).normalize();
    pitch = Math.asin(direction.y);
    yaw = Math.atan2(direction.x, -direction.z);
  };

  const forward = new THREE.Vector3();
  const target = new THREE.Vector3();
  const apply = () => {
    position.clamp(options.bounds.min, options.bounds.max);
    forward.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
    camera.position.copy(position);
    camera.lookAt(target.copy(position).add(forward));
    camera.updateMatrixWorld();
    options.onChange();
  };

  // Walking stays level, whatever the pitch.
  const walk = (ahead: number, aside: number, up = 0) => {
    position.x += Math.sin(yaw) * ahead + Math.cos(yaw) * aside;
    position.z += -Math.cos(yaw) * ahead + Math.sin(yaw) * aside;
    position.y += up;
    apply();
  };

  const pointers = new Map<number, { x: number; y: number }>();
  let dragged = 0;
  let pinch = 0;

  const onPointerDown = (event: PointerEvent) => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) dragged = 0;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
    element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      walk((distance - pinch) * PINCH_METRES_PER_PX, 0);
      pinch = distance;
      dragged += DRAG_THRESHOLD_PX;
      return;
    }

    dragged += Math.abs(dx) + Math.abs(dy);
    // Grab-the-world: dragging right turns the view left.
    yaw -= dx * LOOK_RADIANS_PER_PX;
    pitch = THREE.MathUtils.clamp(pitch + dy * LOOK_RADIANS_PER_PX, -PITCH_LIMIT, PITCH_LIMIT);
    apply();
  };

  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    // A drag is not a click: keep it from reaching click handlers (the whole cycle advances on click).
    if (dragged >= DRAG_THRESHOLD_PX && pointers.size === 0) {
      window.addEventListener("click", (click) => click.stopPropagation(), { capture: true, once: true });
      window.setTimeout(() => dragged = 0, 0);
    }
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    walk(-event.deltaY * WHEEL_METRES_PER_PX, 0);
  };

  const onDoubleClick = () => {
    reset();
    apply();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))) return;
    const step = options.step;
    switch (event.key) {
      case "w": case "W": case "ArrowUp": walk(step, 0); break;
      case "s": case "S": case "ArrowDown": walk(-step, 0); break;
      case "a": case "A": case "ArrowLeft": walk(0, -step); break;
      case "d": case "D": case "ArrowRight": walk(0, step); break;
      case "q": case "Q": walk(0, 0, -step); break;
      case "e": case "E": walk(0, 0, step); break;
      default: return;
    }
    // Arrow keys would otherwise also drive other listeners (the whole cycle advances on →).
    event.preventDefault();
    event.stopPropagation();
  };

  element.style.touchAction = "none";
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("dblclick", onDoubleClick);
  window.addEventListener("keydown", onKeyDown, { capture: true });

  reset();
  apply();

  return {
    dispose() {
      element.removeEventListener("pointerdown", onPointerDown);
      element.removeEventListener("pointermove", onPointerMove);
      element.removeEventListener("pointerup", onPointerUp);
      element.removeEventListener("pointercancel", onPointerUp);
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("dblclick", onDoubleClick);
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    },
  };
}
