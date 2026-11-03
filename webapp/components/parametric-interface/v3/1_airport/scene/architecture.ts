import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { HALL } from "./dimensions";
import { createStoneTexture, createTerrazzoTexture } from "./textures";

const FRONT_Z = 8;
const BACK_Z = -HALL.depth;
const HALF_WIDTH = HALL.width / 2;

// BoxGeometry maps every face to 0–1; rewrite its UVs in metres so the shared
// stone texture keeps one panel size on walls and columns alike.
function metricBox(width: number, height: number, depth: number) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  // Face order: +x, −x, +y, −y, +z, −z; four vertices each.
  const faceSizes = [
    [depth, height], [depth, height],
    [width, depth], [width, depth],
    [width, height], [width, height],
  ] as const;

  faceSizes.forEach(([u, v], face) => {
    for (let vertex = face * 4; vertex < face * 4 + 4; vertex += 1) {
      uv.setXY(vertex, uv.getX(vertex) * u, uv.getY(vertex) * v);
    }
  });

  return geometry;
}

function metricPlane(width: number, height: number) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
  for (let vertex = 0; vertex < uv.count; vertex += 1) {
    uv.setXY(vertex, uv.getX(vertex) * width, uv.getY(vertex) * height);
  }
  return geometry;
}

function withVertexColour(geometry: THREE.BufferGeometry, colour: THREE.ColorRepresentation) {
  const tint = new THREE.Color(colour);
  const count = geometry.getAttribute("position").count;
  const colours = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) tint.toArray(colours, index * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colours, 3));
  return geometry;
}

function placed(geometry: THREE.BufferGeometry, x: number, y: number, z: number) {
  geometry.translate(x, y, z);
  return geometry;
}

export type Architecture = {
  group: THREE.Group;
  reflector: Reflector;
};

export function createArchitecture(reflectionSize: { width: number; height: number }): Architecture {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ map: createStoneTexture(), roughness: 0.74 });

  group.add(createWalls(stone));
  group.add(createGlazing());
  group.add(createAirside());
  group.add(createCeiling());
  group.add(createColumns(stone));
  group.add(createSeating());

  const floor = createFloor(reflectionSize);
  group.add(floor.group);

  return { group, reflector: floor.reflector };
}

function createWalls(stone: THREE.Material) {
  const depth = FRONT_Z - BACK_Z;
  const group = new THREE.Group();

  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(metricPlane(depth, HALL.height), stone);
    wall.rotation.y = side * -Math.PI / 2;
    wall.position.set(side * HALF_WIDTH, HALL.height / 2, (FRONT_Z + BACK_Z) / 2);
    wall.receiveShadow = true;
    group.add(wall);
  }

  const behind = new THREE.Mesh(metricPlane(HALL.width, HALL.height), stone);
  behind.rotation.y = Math.PI;
  behind.position.set(0, HALL.height / 2, FRONT_Z);
  group.add(behind);

  return group;
}

// Full-height airside curtain wall: steel mullions every 2.4 m, transoms every 3 m.
function createGlazing() {
  const group = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#3a3d41", roughness: 0.45, metalness: 0.6 });

  const mullions: THREE.BufferGeometry[] = [];
  for (let x = -HALF_WIDTH; x <= HALF_WIDTH + 0.01; x += 2.4) {
    mullions.push(placed(new THREE.BoxGeometry(0.09, HALL.height, 0.32), x, HALL.height / 2, BACK_Z));
  }
  for (const y of [0.05, 3, 6, 9]) {
    mullions.push(placed(new THREE.BoxGeometry(HALL.width, y === 0.05 ? 0.1 : 0.07, 0.24), 0, y, BACK_Z));
  }
  const frame = new THREE.Mesh(mergeGeometries(mullions)!, steel);
  frame.castShadow = true;

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width, HALL.height),
    new THREE.MeshStandardMaterial({
      color: "#b9c6c9",
      depthWrite: false,
      metalness: 0.1,
      opacity: 0.12,
      roughness: 0.03,
      transparent: true,
    }),
  );
  glass.position.set(0, HALL.height / 2, BACK_Z - 0.05);

  group.add(frame, glass);
  return group;
}

// The apron beyond the glass: overcast sky, a stand with a parked widebody and its jet bridge.
function createAirside() {
  const group = new THREE.Group();

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 260),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#eef2f4").multiplyScalar(1.25), fog: false }),
  );
  sky.position.set(0, 100, -320);

  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 300),
    new THREE.MeshStandardMaterial({ color: "#8e8f8c", roughness: 0.95 }),
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(0, -0.6, BACK_Z - 150);
  apron.receiveShadow = true;

  const white = new THREE.MeshStandardMaterial({ color: "#f2f3f2", roughness: 0.35, metalness: 0.1 });
  const grey = new THREE.MeshStandardMaterial({ color: "#7e8287", roughness: 0.5, metalness: 0.4 });

  // Widebody parked nose-in, seen side-on across the stand.
  const aircraft = new THREE.Group();
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(2.9, 52, 8, 32).rotateZ(Math.PI / 2), white);
  fuselage.position.set(0, 5.6, 0);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(9, 11, 0.5).translate(0, 5.5, 0),
    white,
  );
  tail.position.set(-24, 7.5, 0);
  tail.rotation.z = 0.5;
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 58), white);
  wing.position.set(-2, 3.8, 0);
  wing.rotation.y = 0.32;
  const engines = new THREE.Mesh(
    mergeGeometries([
      placed(new THREE.CylinderGeometry(1.5, 1.5, 6, 24).rotateZ(Math.PI / 2), 1, 2.3, 9),
      placed(new THREE.CylinderGeometry(1.5, 1.5, 6, 24).rotateZ(Math.PI / 2), 1, 2.3, -9),
    ])!,
    grey,
  );
  const gear = new THREE.Mesh(
    mergeGeometries([
      placed(new THREE.BoxGeometry(0.4, 3, 0.4), 22, 1.5, 0),
      placed(new THREE.BoxGeometry(2, 1.6, 2.8), -4, 0.8, 0),
    ])!,
    new THREE.MeshStandardMaterial({ color: "#2b2c2e", roughness: 0.7 }),
  );
  aircraft.add(fuselage, tail, wing, engines, gear);
  aircraft.position.set(-6, -0.6, BACK_Z - 46);
  aircraft.traverse((object) => {
    if (object instanceof THREE.Mesh) object.castShadow = true;
  });

  const jetBridge = new THREE.Mesh(
    mergeGeometries([
      placed(new THREE.BoxGeometry(3.4, 3.2, 30), 20, 5.4, BACK_Z - 18),
      placed(new THREE.BoxGeometry(1.2, 5, 1.2), 20, 1.9, BACK_Z - 26),
    ])!,
    new THREE.MeshStandardMaterial({ color: "#c7c9c8", roughness: 0.6, metalness: 0.3 }),
  );
  jetBridge.castShadow = true;

  group.add(sky, apron, aircraft, jetBridge);
  return group;
}

// Coffered ceiling: steel beams along the hall and rows of linear luminaires across it.
function createCeiling() {
  const group = new THREE.Group();
  const depth = FRONT_Z - BACK_Z;
  const centreZ = (FRONT_Z + BACK_Z) / 2;

  const soffit = new THREE.Mesh(
    new THREE.PlaneGeometry(HALL.width, depth),
    new THREE.MeshStandardMaterial({ color: "#cfd0d1", roughness: 0.9 }),
  );
  soffit.rotation.x = Math.PI / 2;
  soffit.position.set(0, HALL.height, centreZ);

  const beams = new THREE.Mesh(
    mergeGeometries(
      Array.from({ length: 9 }, (_, index) =>
        placed(new THREE.BoxGeometry(0.4, 0.9, depth), -28 + index * 7, HALL.height - 0.45, centreZ),
      ),
    )!,
    new THREE.MeshStandardMaterial({ color: "#b8babc", roughness: 0.6, metalness: 0.3 }),
  );

  const luminaires = new THREE.Mesh(
    mergeGeometries(
      Array.from({ length: Math.floor(depth / 2.8) }, (_, index) =>
        placed(new THREE.BoxGeometry(HALL.width, 0.05, 0.2), 0, HALL.height - 0.03, FRONT_Z - 1.4 - index * 2.8),
      ),
    )!,
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#fbfcff").multiplyScalar(1.7) }),
  );

  group.add(soffit, beams, luminaires);
  return group;
}

function createColumns(stone: THREE.Material) {
  const positions: [number, number][] = [];
  for (const x of [-11, 11, -22, 22]) {
    for (const z of [-9, -21, -33]) positions.push([x, z]);
  }

  const columns = new THREE.Mesh(
    mergeGeometries(positions.map(([x, z]) => placed(metricBox(1.1, HALL.height, 1.1), x, HALL.height / 2, z)))!,
    stone,
  );
  columns.castShadow = true;
  columns.receiveShadow = true;
  return columns;
}

// Rows of beam seating, facing the glazing.
function createSeating() {
  const chrome = "#9a9c9f";
  const leather = "#151618";
  const seat = mergeGeometries([
    withVertexColour(placed(new THREE.BoxGeometry(0.54, 0.07, 0.5), 0, 0.45, 0), leather),
    withVertexColour(placed(new THREE.BoxGeometry(0.54, 0.46, 0.06), 0, 0.76, -0.26), leather),
    withVertexColour(placed(new THREE.BoxGeometry(0.04, 0.22, 0.46), 0.29, 0.6, 0), chrome),
  ])!;
  const unitsPerRow = 14;
  const span = unitsPerRow * 0.6;
  const row = mergeGeometries([
    ...Array.from({ length: unitsPerRow }, (_, index) => seat.clone().translate((index - (unitsPerRow - 1) / 2) * 0.6, 0, 0)),
    withVertexColour(placed(new THREE.BoxGeometry(span, 0.08, 0.08), 0, 0.36, 0), chrome),
    withVertexColour(placed(new THREE.BoxGeometry(0.06, 0.36, 0.5), -span / 2 + 0.6, 0.18, 0), chrome),
    withVertexColour(placed(new THREE.BoxGeometry(0.06, 0.36, 0.5), span / 2 - 0.6, 0.18, 0), chrome),
  ])!;
  seat.dispose();

  const rows: [number, number][] = [];
  for (const x of [-9, 9]) {
    for (const z of [-15, -17.2, -19.4]) rows.push([x, z]);
  }

  const mesh = new THREE.InstancedMesh(
    row,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.35 }),
    rows.length,
  );
  const matrix = new THREE.Matrix4();
  rows.forEach(([x, z], index) => {
    // Facing the glazing, backs to the camera.
    matrix.makeRotationY(Math.PI).setPosition(x, 0, z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.castShadow = true;
  return mesh;
}

// A mirror under a translucent terrazzo skin: the floor carries a soft, partial
// reflection the way polished stone does, rather than a perfect mirror.
function createFloor(reflectionSize: { width: number; height: number }) {
  const group = new THREE.Group();
  const depth = FRONT_Z - BACK_Z;
  const centreZ = (FRONT_Z + BACK_Z) / 2;

  const reflector = new Reflector(new THREE.PlaneGeometry(HALL.width, depth), {
    clipBias: 0.003,
    color: 0x7f7f7f,
    multisample: 4,
    textureHeight: reflectionSize.height,
    textureWidth: reflectionSize.width,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0, centreZ);

  const skin = new THREE.Mesh(
    metricPlane(HALL.width, depth),
    new THREE.MeshStandardMaterial({ map: createTerrazzoTexture(), opacity: 0.93, roughness: 0.3, transparent: true }),
  );
  skin.rotation.x = -Math.PI / 2;
  skin.position.set(0, 0.004, centreZ);
  skin.receiveShadow = true;

  group.add(reflector, skin);
  return { group, reflector };
}
