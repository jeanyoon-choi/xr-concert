import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { paintAsphalt, paintFacade, paintShutter } from "./facades";
import { pick, range, seededRandom, type Random } from "./random";

// World units are metres. The alley runs along −z from the camera; its walls
// stand at x = ±ALLEY.halfWidth.
export const ALLEY = {
  halfWidth: 2.3,
  start: 6,
  end: -62,
  groundFloor: 3.4,
  floor: 3.05,
} as const;

export type SignAnchor = { wallX: number; z: number; y: number; width: number; height: number };
export type FasciaAnchor = { wallX: number; z: number; y: number; width: number; lit: boolean };

export type Alley = {
  group: THREE.Group;
  projecting: SignAnchor[];
  fascias: FasciaAnchor[];
  lamps: THREE.Vector3[];
  shopLights: THREE.Vector3[];
};

function placed(geometry: THREE.BufferGeometry, x: number, y: number, z: number) {
  geometry.translate(x, y, z);
  return geometry;
}

// A wire hanging between two points with a catenary-like sag.
function wire(from: THREE.Vector3, to: THREE.Vector3, sag: number) {
  const points = Array.from({ length: 12 }, (_, index) => {
    const t = index / 11;
    const point = from.clone().lerp(to, t);
    point.y -= Math.sin(Math.PI * t) * sag;
    return point;
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.009, 4, false);
}

function building(random: Random, side: -1 | 1, zNear: number, width: number, materials: Materials, alley: Alley) {
  const group = new THREE.Group();
  const floors = 2 + Math.floor(random() * 4);
  const height = ALLEY.groundFloor + floors * ALLEY.floor;
  const wallX = side * (ALLEY.halfWidth + range(random, 0, 0.22));
  const zFar = zNear - width;
  const zMid = (zNear + zFar) / 2;
  const facing = -side * Math.PI / 2;

  // Upper floors.
  const facade = paintFacade(random, width, height - ALLEY.groundFloor, 0, ALLEY.floor);
  const upper = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height - ALLEY.groundFloor),
    new THREE.MeshLambertMaterial({ emissive: "#ffffff", emissiveIntensity: 0.9, emissiveMap: facade.emissiveMap, map: facade.map }),
  );
  upper.rotation.y = facing;
  upper.position.set(wallX, ALLEY.groundFloor + (height - ALLEY.groundFloor) / 2, zMid);

  // Parapet cap and the side return that closes the gap to the next building.
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, width + 0.04), materials.concrete);
  parapet.position.set(wallX - side * 0.05, height + 0.12, zMid);
  // Solid mass behind the upper floors only; the ground floor is open shop rooms.
  const back = new THREE.Mesh(new THREE.BoxGeometry(8, height - ALLEY.groundFloor, width), materials.backWall);
  back.position.set(wallX + side * 4.01, ALLEY.groundFloor + (height - ALLEY.groundFloor) / 2, zMid);

  // Ground floor: soffit band, then either a lit shopfront or a pulled-down shutter.
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, width), materials.concrete);
  band.position.set(wallX - side * 0.06, ALLEY.groundFloor - 0.25, zMid);
  group.add(upper, parapet, back, band);

  const bays = Math.max(1, Math.round(width / 4.2));
  const bayWidth = width / bays;
  for (let bay = 0; bay < bays; bay += 1) {
    const bayNear = zNear - bay * bayWidth;
    const bayMid = bayNear - bayWidth / 2;
    const open = random() < 0.55;
    const recess = 0.35;

    if (open) {
      // Shop interior seen through glass: a lit back wall and shelving silhouettes.
      const interior = new THREE.Mesh(
        new THREE.PlaneGeometry(bayWidth - 0.3, 2.8),
        pick(random, materials.interiors),
      );
      interior.rotation.y = facing;
      interior.position.set(wallX + side * 2.2, 1.45, bayMid);
      const shelves = new THREE.Mesh(
        mergeGeometries(
          Array.from({ length: 4 }, (_, index) =>
            placed(new THREE.BoxGeometry(0.4, range(random, 1.2, 2.2), range(random, 0.5, 1.1)), 0, 0, (index - 1.5) * (bayWidth / 4.5)),
          ).map((geometry) => {
            geometry.computeBoundingBox();
            return geometry.translate(0, -geometry.boundingBox!.min.y, 0);
          }),
        )!,
        materials.shelf,
      );
      shelves.position.set(wallX + side * 1.6, 0, bayMid);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(bayWidth - 0.3, 2.7), materials.glass);
      glass.rotation.y = facing;
      glass.position.set(wallX + side * recess, 1.4, bayMid);
      const frame = new THREE.Mesh(
        mergeGeometries([
          placed(new THREE.BoxGeometry(0.06, 2.8, 0.06), 0, 1.4, bayWidth / 2 - 0.15),
          placed(new THREE.BoxGeometry(0.06, 2.8, 0.06), 0, 1.4, -bayWidth / 2 + 0.15),
          placed(new THREE.BoxGeometry(0.06, 2.8, 0.05), 0, 1.4, 0.25),
          placed(new THREE.BoxGeometry(0.06, 0.06, bayWidth - 0.3), 0, 2.78, 0),
          placed(new THREE.BoxGeometry(0.06, 0.06, bayWidth - 0.3), 0, 2.1, 0),
        ])!,
        materials.aluminium,
      );
      frame.position.set(wallX + side * recess, 0, bayMid);
      // Side walls of the shop room.
      const room = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.9, bayWidth - 0.2), materials.room);
      room.position.set(wallX + side * 1.4, 1.45, bayMid);
      group.add(interior, shelves, glass, frame, room);
      alley.shopLights.push(new THREE.Vector3(wallX - side * 0.5, 2.4, bayMid));
    } else {
      // Slat textures are 1 m tiles; scale the plane's UVs to metres.
      const shutterGeometry = new THREE.PlaneGeometry(bayWidth - 0.2, 2.9);
      const shutterUv = shutterGeometry.getAttribute("uv") as THREE.BufferAttribute;
      for (let vertex = 0; vertex < shutterUv.count; vertex += 1) {
        shutterUv.setXY(vertex, shutterUv.getX(vertex) * (bayWidth - 0.2), shutterUv.getY(vertex) * 2.9);
      }
      const shutter = new THREE.Mesh(shutterGeometry, pick(random, materials.shutters));
      shutter.rotation.y = facing;
      shutter.position.set(wallX + side * 0.1, 1.45, bayMid);
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, bayWidth - 0.1), materials.aluminium);
      housing.position.set(wallX - side * 0.06, 3.04, bayMid);
      group.add(shutter, housing);
    }

    // Piers between bays.
    const pier = new THREE.Mesh(new THREE.BoxGeometry(0.3, ALLEY.groundFloor, 0.24), materials.concrete);
    pier.position.set(wallX - side * 0.02, ALLEY.groundFloor / 2, bayNear - 0.12);
    group.add(pier);

    alley.fascias.push({ wallX, z: bayMid, y: ALLEY.groundFloor - 0.25, width: bayWidth - 0.4, lit: open || random() < 0.4 });
    addClutter(random, group, side, wallX, bayMid, bayWidth, materials);
  }

  // Outdoor air-conditioner units hung on the wall.
  for (const unit of facade.units) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.6, 0.8), materials.acUnit);
    box.position.set(wallX - side * 0.2, ALLEY.groundFloor + unit.y + 0.3, zNear - unit.u);
    group.add(box);
  }

  // A yellow gas riser and a drain pipe.
  const pipes = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, height - 0.4, 8), materials.gasPipe);
  pipes.position.set(wallX - side * 0.08, (height - 0.4) / 2 + 0.2, zNear - range(random, 0.3, width - 0.3));
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, height, 10), materials.pvc);
  drain.position.set(wallX - side * 0.09, height / 2, zFar + 0.15);
  group.add(pipes, drain);

  // One projecting lightbox per building near its nearer edge, upper storeys.
  const signs = random() < 0.35 && floors >= 3 ? 2 : 1;
  for (let sign = 0; sign < signs; sign += 1) {
    const square = random() < 0.35;
    alley.projecting.push({
      wallX,
      z: zNear - 0.6 - sign * range(random, 1.6, 2.4),
      y: ALLEY.groundFloor + 0.9 + sign * 1.5 + range(random, 0, 1.2),
      width: square ? 0.9 : range(random, 1.1, 1.4),
      height: square ? 0.9 : range(random, 0.62, 0.8),
    });
  }

  return group;
}

function addClutter(random: Random, group: THREE.Group, side: -1 | 1, wallX: number, z: number, width: number, materials: Materials) {
  const kind = random();
  const x = wallX - side * range(random, 0.35, 0.6);
  if (kind < 0.3) {
    // Bundled print stock on a pallet.
    const stack = new THREE.Mesh(
      mergeGeometries(
        Array.from({ length: 2 + Math.floor(random() * 4) }, (_, index) =>
          placed(new THREE.BoxGeometry(0.62, 0.22, 0.44), range(random, -0.03, 0.03), 0.2 + index * 0.23, range(random, -0.04, 0.04)),
        ),
      )!,
      materials.paper,
    );
    stack.position.set(x, 0, z + range(random, -width / 3, width / 3));
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 1.0), materials.wood);
    pallet.position.set(x, 0.06, stack.position.z);
    group.add(stack, pallet);
  } else if (kind < 0.5) {
    // Beer crates and a folded plastic table.
    const crates = new THREE.Mesh(
      mergeGeometries(
        Array.from({ length: 3 + Math.floor(random() * 3) }, (_, index) =>
          placed(new THREE.BoxGeometry(0.42, 0.28, 0.32), (index % 2) * 0.02, 0.14 + index * 0.29, 0),
        ),
      )!,
      pick(random, [materials.crateGreen, materials.crateRed]),
    );
    crates.position.set(x, 0, z + range(random, -width / 3, width / 3));
    group.add(crates);
  } else if (kind < 0.62) {
    // Hand cart.
    const cart = new THREE.Mesh(
      mergeGeometries([
        placed(new THREE.BoxGeometry(0.5, 0.03, 0.9), 0, 0.28, 0),
        placed(new THREE.BoxGeometry(0.03, 0.9, 0.03), -0.24, 0.72, -0.45),
        placed(new THREE.BoxGeometry(0.03, 0.9, 0.03), 0.24, 0.72, -0.45),
        placed(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16).rotateZ(Math.PI / 2), -0.27, 0.12, 0.2),
        placed(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16).rotateZ(Math.PI / 2), 0.27, 0.12, 0.2),
      ])!,
      materials.aluminium,
    );
    cart.position.set(x, 0, z);
    cart.rotation.y = range(random, -0.4, 0.4);
    group.add(cart);
  }
}

type Materials = ReturnType<typeof createMaterials>;

// Matte surfaces use Lambert: at dusk, under a dozen point lights, physically
// based specular adds cost without adding anything the eye reads.
function createMaterials(random: Random) {
  return {
    concrete: new THREE.MeshLambertMaterial({ color: "#8d8a84" }),
    backWall: new THREE.MeshLambertMaterial({ color: "#5e5b56" }),
    room: new THREE.MeshLambertMaterial({ color: "#d9d4c8", side: THREE.BackSide }),
    shelf: new THREE.MeshLambertMaterial({ color: "#4a4d52" }),
    glass: new THREE.MeshStandardMaterial({ color: "#9fb0b4", depthWrite: false, metalness: 0.2, opacity: 0.18, roughness: 0.05, transparent: true }),
    aluminium: new THREE.MeshLambertMaterial({ color: "#a2a6a9" }),
    acUnit: new THREE.MeshLambertMaterial({ color: "#d8d8d2" }),
    gasPipe: new THREE.MeshLambertMaterial({ color: "#d9b21a" }),
    pvc: new THREE.MeshLambertMaterial({ color: "#c8c8c2" }),
    paper: new THREE.MeshLambertMaterial({ color: "#e9e6dc" }),
    wood: new THREE.MeshLambertMaterial({ color: "#8a6a45" }),
    crateGreen: new THREE.MeshLambertMaterial({ color: "#1f7a3d" }),
    crateRed: new THREE.MeshLambertMaterial({ color: "#b0261f" }),
    pole: new THREE.MeshLambertMaterial({ color: "#8a8780" }),
    wire: new THREE.MeshLambertMaterial({ color: "#111111" }),
    transformer: new THREE.MeshLambertMaterial({ color: "#7f8a84" }),
    // Lit shop rooms: the back wall is the light, so it is not shaded.
    interiors: ["#f1ede2", "#e6efe9", "#f4e6cc"].map((color) => new THREE.MeshBasicMaterial({ color })),
    shutters: Array.from({ length: 3 }, () => new THREE.MeshLambertMaterial({ map: paintShutter(random) })),
    lampFitting: new THREE.MeshBasicMaterial({ color: "#ffe2b0", toneMapped: false }),
  };
}

// Collapse every mesh that shares a material into one merged mesh per material,
// so the alley draws in a few dozen calls instead of hundreds. Meshes with
// their own textures (facades, fascias) are left as they are.
function mergeByMaterial(group: THREE.Group, mergeable: ReadonlySet<THREE.Material>) {
  group.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const merged: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    if (Array.isArray(object.material) || !mergeable.has(object.material)) return;
    const geometry = (object.geometry as THREE.BufferGeometry).clone().applyMatrix4(object.matrixWorld);
    // Merging needs one attribute layout: keep position, normal and uv, all indexed.
    for (const name of Object.keys(geometry.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") geometry.deleteAttribute(name);
    }
    const indexed = geometry.index ? geometry : geometry.setIndex([...Array(geometry.getAttribute("position").count).keys()]);
    buckets.set(object.material, [...(buckets.get(object.material) ?? []), indexed]);
    merged.push(object);
  });
  for (const mesh of merged) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
  for (const [material, geometries] of buckets) {
    group.add(new THREE.Mesh(mergeGeometries(geometries)!, material));
    for (const geometry of geometries) geometry.dispose();
  }
}

export function createAlley(): Alley {
  const random = seededRandom(2026_11_03);
  const materials = createMaterials(random);
  const alley: Alley = { group: new THREE.Group(), projecting: [], fascias: [], lamps: [], shopLights: [] };

  for (const side of [-1, 1] as const) {
    let z = ALLEY.start;
    while (z > ALLEY.end) {
      const width = Math.min(range(random, 4.2, 8.6), z - ALLEY.end);
      if (width < 2) break;
      alley.group.add(building(random, side, z, width, materials, alley));
      z -= width;
    }
  }

  // The alley closes on a building across its far end.
  const endFacade = paintFacade(random, ALLEY.halfWidth * 2 + 6, 12, 0, ALLEY.floor);
  const end = new THREE.Mesh(
    new THREE.PlaneGeometry(ALLEY.halfWidth * 2 + 6, 12),
    new THREE.MeshLambertMaterial({ emissive: "#ffffff", emissiveIntensity: 0.9, emissiveMap: endFacade.emissiveMap, map: endFacade.map }),
  );
  end.position.set(0, 6, ALLEY.end - 4);
  alley.group.add(end);

  // Ground: asphalt and the cross street at the far end.
  const lengthM = ALLEY.start - ALLEY.end + 4;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ALLEY.halfWidth * 2 + 0.6, lengthM),
    new THREE.MeshLambertMaterial({ map: paintAsphalt(random, ALLEY.halfWidth * 2 + 0.6, lengthM) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, (ALLEY.start + ALLEY.end - 4) / 2);
  alley.group.add(ground);

  // Concrete utility poles on the right, wires slung along the alley and dropped to the walls.
  const poleX = ALLEY.halfWidth - 0.35;
  const poles = [-4, -21, -38, -55];
  const tops = poles.map((z) => new THREE.Vector3(poleX, 9.2, z));
  const poleGeometry = mergeGeometries(
    poles.flatMap((z) => [
      placed(new THREE.CylinderGeometry(0.13, 0.19, 10, 14), poleX, 5, z),
      placed(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleX - 0.4, 8.9, z),
      placed(new THREE.BoxGeometry(1.2, 0.1, 0.1), poleX - 0.3, 8.2, z),
    ]),
  )!;
  alley.group.add(new THREE.Mesh(poleGeometry, materials.pole));
  const transformers = new THREE.Mesh(
    mergeGeometries([placed(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), poleX + 0.35, 7.3, -21), placed(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), poleX + 0.35, 7.3, -55)])!,
    materials.transformer,
  );
  alley.group.add(transformers);

  const wires: THREE.BufferGeometry[] = [];
  for (let index = 0; index < tops.length - 1; index += 1) {
    for (const [dx, dy] of [[-1.1, 0], [-0.6, 0], [0.2, 0], [-0.8, -0.7], [-0.2, -0.7]] as const) {
      const from = tops[index]!.clone().add(new THREE.Vector3(dx, dy - 0.25, 0));
      const to = tops[index + 1]!.clone().add(new THREE.Vector3(dx, dy - 0.25, 0));
      wires.push(wire(from, to, range(random, 0.35, 0.8)));
    }
    // Service drops to both walls.
    for (let drop = 0; drop < 4; drop += 1) {
      const from = tops[index]!.clone().add(new THREE.Vector3(-0.8, -0.95, 0));
      const side = drop % 2 === 0 ? -1 : 1;
      const to = new THREE.Vector3(side * ALLEY.halfWidth, range(random, 5, 8), tops[index]!.z - range(random, 1, 14));
      wires.push(wire(from, to, range(random, 0.2, 0.6)));
    }
  }
  // A tangle of telecom cables right overhead, nearest the camera.
  for (let index = 0; index < 7; index += 1) {
    const from = new THREE.Vector3(-ALLEY.halfWidth, range(random, 5.5, 7.5), range(random, -2, 3));
    const to = new THREE.Vector3(ALLEY.halfWidth, range(random, 5.5, 7.5), range(random, -9, -2));
    wires.push(wire(from, to, range(random, 0.3, 1.1)));
  }
  alley.group.add(new THREE.Mesh(mergeGeometries(wires)!, materials.wire));

  // Wall lamps: warm sodium-like fittings on alternate sides.
  for (const [side, z] of [[-1, -8], [1, -17], [-1, -29], [1, -41], [-1, -52]] as const) {
    // Just above the shop band, below the lowest projecting sign.
    alley.lamps.push(new THREE.Vector3(side * (ALLEY.halfWidth - 0.4), 3.55, z));
    const fitting = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.24), materials.lampFitting);
    fitting.position.set(side * (ALLEY.halfWidth - 0.3), 3.62, z);
    alley.group.add(fitting);
  }

  const shared = Object.values(materials).flat();
  mergeByMaterial(alley.group, new Set(shared));

  return alley;
}
