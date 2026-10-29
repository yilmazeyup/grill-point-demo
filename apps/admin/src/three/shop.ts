import { CALL_NAMES, DISHES, euro, RESTAURANT, staff, STATION_NAMES, COOK_AT, tr, trHtml, type Station, type ThemeMode } from '@grill/shared';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

import type { CourierView, FloorView, TableView } from '../data';
import { charcoalTextures, Emitter, flicker, spitTexture } from './fire';
import { damp, el, type Stage, type Vec } from './stage';

/**
 * Grill-Point on the Willibrorduslaan in 3D, cut open like a doll's house: the glass front with its sign, the terrace
 * with the red chairs, four tables inside, the counter with the salad display, and along the back wall the kitchen
 * line — pizza oven, two döner spits, the charcoal grill under its hood, the plancha and the fryers. Staff stand at
 * their stations, tickets float over whatever is cooking, calls from the tables light up as beacons and the couriers
 * ride off down the street.
 */

export const VIEWS: Record<'overzicht' | 'keuken' | 'terras' | 'grill', { camera: Vec; target: Vec; label: string }> = {
  overzicht: { camera: [11.5, 17.5, 21.5], target: [0.3, 0, 2.4], label: 'Overzicht' },
  keuken: { camera: [1.2, 6.2, 6.6], target: [0, 1.25, -2.6], label: 'Keuken' },
  terras: { camera: [-3.5, 5.8, 16.5], target: [0, 0.6, 6.6], label: 'Terras' },
  grill: { camera: [1.9, 3.4, -1.2], target: [0.8, 1.35, -4.1], label: 'Grill' },
};
export type ViewId = keyof typeof VIEWS;

const mat = (color: string, roughness = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function box(w: number, h: number, d: number, material: THREE.Material, r = 0.03) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(radius: number, height: number, material: THREE.Material, top = radius, segments = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(top, radius, height, segments), material);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function at<T extends THREE.Object3D>(object: T, x: number, y: number, z: number): T {
  object.position.set(x, y, z);
  return object;
}

let seed = 3;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
  }
  return texture;
}

/** Warm stone tiles for inside. */
const floorTiles = () =>
  canvasTexture(
    512,
    512,
    (ctx) => {
      ctx.fillStyle = '#B9A48E';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 4; x++) {
          const v = 165 + Math.floor(rand() * 26);
          ctx.fillStyle = `rgb(${v + 12},${v},${v - 18})`;
          ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
          for (let k = 0; k < 120; k++) {
            ctx.fillStyle = `rgba(80,60,40,${rand() * 0.12})`;
            ctx.fillRect(x * 128 + rand() * 124, y * 128 + rand() * 124, 2, 2);
          }
        }
    },
    [3, 2.25],
  );

/** The pavement in front: grey concrete tiles in a half-bond, like on the Instagram photo. */
const pavement = () =>
  canvasTexture(
    512,
    512,
    (ctx) => {
      ctx.fillStyle = '#7E7770';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 8; y++)
        for (let x = -1; x < 8; x++) {
          const v = 150 + Math.floor(rand() * 30);
          ctx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
          ctx.fillRect(x * 64 + (y % 2) * 32 + 1.5, y * 64 + 1.5, 61, 61);
        }
    },
    [9, 2.6],
  );

/** The brick of the building, dark brown-grey. */
const brick = () =>
  canvasTexture(
    512,
    512,
    (ctx) => {
      ctx.fillStyle = '#4A3F38';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 24; y++)
        for (let x = -1; x < 9; x++) {
          const v = 88 + Math.floor(rand() * 34);
          ctx.fillStyle = `rgb(${v + 18},${v},${v - 8})`;
          ctx.fillRect(x * 64 + (y % 2) * 32 + 2, y * 21.3 + 2, 60, 18);
        }
    },
    [3, 1],
  );

/** The fascia sign: GRILL-POINT in white on black, the orange stripe with DÖNER | PIZZA | RESTAURANT under it. */
function signTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 200;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, 2048, 200);
    ctx.fillStyle = '#E8611C';
    ctx.fillRect(0, 138, 2048, 62);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 112px "Big Shoulders Display", Impact, sans-serif';
    ctx.fillText('GRILL-POINT', 1024, 72);
    ctx.font = '700 44px "Big Shoulders Display", Impact, sans-serif';
    ctx.fillStyle = '#FFF6EC';
    ctx.fillText('DÖNER  |  PIZZA  |  RESTAURANT', 1024, 170);
    // The two burger badges at the ends of the real sign.
    for (const x of [140, 1908]) {
      ctx.fillStyle = '#F4ECE0';
      ctx.beginPath();
      ctx.ellipse(x, 70, 74, 46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#B5651D';
      ctx.beginPath();
      ctx.ellipse(x, 58, 52, 22, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#5B2E17';
      ctx.fillRect(x - 54, 64, 108, 14);
      ctx.fillStyle = '#E3A33A';
      ctx.fillRect(x - 50, 80, 100, 10);
    }
    texture.needsUpdate = true;
  };
  draw();
  document.fonts.load('900 112px "Big Shoulders Display"').then(draw).catch(() => {});
  return texture;
}

/** The menu board on the side wall, after the printed board on Instagram: black and red panels, the real prices. */
function menuBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1500;
  canvas.height = 620;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const columns: { title: string; red: boolean; ids: string[] }[] = [
    { title: 'GRILL', red: false, ids: ['mix-grill', 'adana', 'kofte', 'kip-sis', 'pirzola', 'kippenvleugels'] },
    { title: 'KAPSALON & DÖNER', red: true, ids: ['kapsalon', 'schotel', 'durum', 'broodje', 'lahmacun', 'lahmacun-doner'] },
    { title: 'PIZZA & BURGERS', red: false, ids: ['pizza-margherita', 'pizza-doner', 'pizza-sucuk', 'smash', 'classic', 'chicken'] },
  ];
  const draw = () => {
    const ctx = canvas.getContext('2d')!;
    columns.forEach((col, i) => {
      const x0 = i * 500;
      ctx.fillStyle = col.red ? '#B8261A' : '#151110';
      ctx.fillRect(x0, 0, 500, 620);
      ctx.fillStyle = col.red ? '#FFFFFF' : '#F2A93B';
      ctx.font = '800 56px "Big Shoulders Display", Impact, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(col.title, x0 + 34, 34);
      ctx.font = '600 34px "Big Shoulders Display", Impact, sans-serif';
      col.ids.forEach((id, k) => {
        const d = DISHES.find((x) => x.id === id);
        if (!d) return;
        const y = 130 + k * 76;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.fillText(d.name.toUpperCase(), x0 + 34, y);
        ctx.textAlign = 'right';
        ctx.fillStyle = col.red ? '#FFE3C4' : '#F2A93B';
        ctx.fillText(d.price.toFixed(2), x0 + 466, y);
        ctx.textAlign = 'left';
      });
    });
    texture.needsUpdate = true;
  };
  draw();
  document.fonts.load('800 56px "Big Shoulders Display"').then(draw).catch(() => {});
  return texture;
}

// ---------------------------------------------------------------------------------------------------------- people

const SKIN = ['#E2B48F', '#C98F66', '#A8704D', '#EBC6A6', '#8C5A3C'];

/** A stylised person: a soft body in apron colours, a round head, arms that work while they cook. */
class Figure {
  readonly group = new THREE.Group();
  private readonly armL: THREE.Mesh;
  private readonly armR: THREE.Mesh;
  private readonly phase = rand() * 10;
  /** How hard they work: 0 idle, 1 busy. */
  busy = 0;

  constructor(colour: string, opts: { hat?: 'chef' | 'cap' | null; skin?: string; seated?: boolean; scale?: number } = {}) {
    const skin = mat(opts.skin ?? SKIN[Math.floor(rand() * SKIN.length)], 0.7);
    const cloth = mat(colour, 0.85);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, opts.seated ? 0.32 : 0.62, 6, 14), cloth);
    body.position.y = opts.seated ? 0.62 : 0.74;
    body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), skin);
    head.position.y = opts.seated ? 1.08 : 1.38;
    head.castShadow = true;
    this.group.add(body, head);
    const armGeo = new THREE.CapsuleGeometry(0.06, 0.36, 4, 8);
    this.armL = new THREE.Mesh(armGeo, cloth);
    this.armR = new THREE.Mesh(armGeo, cloth);
    const shoulder = opts.seated ? 0.86 : 1.12;
    this.armL.position.set(-0.25, shoulder - 0.18, 0.06);
    this.armR.position.set(0.25, shoulder - 0.18, 0.06);
    this.armL.geometry.translate(0, -0.12, 0);
    this.group.add(this.armL, this.armR);
    if (opts.hat === 'chef') {
      const hat = cyl(0.13, 0.2, mat('#FFFFFF', 0.9), 0.16);
      hat.position.y = head.position.y + 0.2;
      this.group.add(hat);
    } else if (opts.hat === 'cap') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.155, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#151110', 0.8));
      cap.position.y = head.position.y + 0.02;
      this.group.add(cap);
    }
    this.group.scale.setScalar(opts.scale ?? 1);
  }

  frame(time: number) {
    const t = time * (2 + this.busy * 4) + this.phase;
    const reach = 0.3 + this.busy * 0.6;
    this.armL.rotation.x = -reach - Math.sin(t) * 0.25 * (0.3 + this.busy);
    this.armR.rotation.x = -reach - Math.cos(t * 1.1) * 0.3 * (0.3 + this.busy);
    this.group.position.y = Math.abs(Math.sin(time * 1.4 + this.phase)) * 0.015;
  }
}

/** A delivery scooter with its rider and the red box on the back. */
class Scooter {
  readonly group = new THREE.Group();
  readonly rider: Figure;
  constructor() {
    const red = mat('#C8341E', 0.45, { metalness: 0.2 });
    const dark = mat('#1A1512', 0.6);
    const body = box(0.42, 0.34, 1.05, red, 0.12);
    body.position.set(0, 0.42, 0);
    const front = box(0.36, 0.6, 0.2, red, 0.08);
    front.position.set(0, 0.68, 0.42);
    front.rotation.x = -0.25;
    const bar = cyl(0.025, 0.56, dark);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.0, 0.48);
    const seat = box(0.34, 0.08, 0.5, dark, 0.04);
    seat.position.set(0, 0.62, -0.1);
    const crate = box(0.48, 0.42, 0.44, mat('#E0321B', 0.5), 0.05);
    crate.position.set(0, 0.88, -0.42);
    const wheelGeo = new THREE.TorusGeometry(0.17, 0.065, 10, 22);
    for (const z of [-0.38, 0.42]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.2, z);
      wheel.castShadow = true;
      this.group.add(wheel);
    }
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#FFF4D6' }));
    light.position.set(0, 0.86, 0.55);
    this.group.add(body, front, bar, seat, crate, light);
    this.rider = new Figure('#1C1410', { hat: null, seated: true, scale: 0.92 });
    this.rider.group.position.set(0, 0.14, -0.05);
    this.group.add(this.rider.group);
  }
}

// ---------------------------------------------------------------------------------------------------------- the scene

const TABLE_SPOTS: Record<number, { x: number; z: number; w: number; d: number }> = {
  1: { x: -4.2, z: 0.3, w: 0.95, d: 0.95 },
  2: { x: -4.5, z: 2.85, w: 0.75, d: 0.75 },
  3: { x: -0.7, z: 2.5, w: 0.95, d: 0.95 },
  4: { x: 3.0, z: 1.25, w: 1.9, d: 0.95 },
  5: { x: -4.4, z: 6.7, w: 0.8, d: 0.8 },
  6: { x: -0.6, z: 7.0, w: 0.8, d: 0.8 },
  7: { x: 3.6, z: 6.7, w: 0.8, d: 0.8 },
};

/** Where tickets float for each station. */
const STATION_SPOTS: Partial<Record<Station, Vec>> = {
  oven: [-4.7, 2.3, -3.6],
  spit: [-2.6, 2.35, -3.8],
  grill: [0.8, 1.95, -4.45],
  plancha: [2.6, 1.85, -3.7],
  fryer: [4.3, 1.85, -3.7],
};

const CURB = [4.4, 5.5, 6.6];
const LANE_Z = 10.6;

type TableParts = { group: THREE.Group; guests: Figure[]; label: CSS2DObject; element: HTMLDivElement; beacon: THREE.Mesh; ring: THREE.Mesh; plates: THREE.Group };

export type SceneHandlers = { answer: (callId: string) => void; table: (n: number) => void };

export class GrillScene {
  private readonly root = new THREE.Group();
  private readonly lights: {
    hemi: THREE.HemisphereLight;
    sun: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
    lamps: THREE.PointLight[];
    bulbs: THREE.MeshStandardMaterial;
    grill: THREE.PointLight;
    oven: THREE.PointLight;
    spit: THREE.PointLight;
    street: THREE.PointLight;
    streetBulb: THREE.MeshBasicMaterial;
  };
  private readonly coals: THREE.MeshStandardMaterial;
  private readonly ovenFire: THREE.MeshBasicMaterial;
  private readonly heaters: THREE.MeshStandardMaterial;
  private readonly heatLamp: THREE.MeshStandardMaterial;
  private readonly glass: THREE.MeshPhysicalMaterial;
  private readonly spits: THREE.Mesh[] = [];
  private readonly emitters: { sparks: Emitter; flames: Emitter; smoke: Emitter; ovenFlames: Emitter; steam: Emitter };
  private readonly staff: Record<string, Figure> = {};
  private readonly tables = new Map<number, TableParts>();
  private readonly stationLabels = new Map<Station, { element: HTMLDivElement; object: CSS2DObject }>();
  private readonly scooters = new Map<string, { scooter: Scooter; element: HTMLDivElement; label: CSS2DObject; x: number; z: number; yaw: number; visible: number }>();
  private readonly bags: THREE.Group;
  private readonly bagLabel: HTMLDivElement;
  private readonly bagObject: CSS2DObject;
  private readonly burgers: THREE.Mesh[] = [];
  private view: FloorView | null = null;
  private readonly glowing: THREE.MeshStandardMaterial[] = [];
  private readonly groundMat: THREE.MeshStandardMaterial;
  private night = 1;
  private nightTarget = 1;
  private readonly unsubscribe: () => void;

  constructor(private readonly stage: Stage, private readonly handlers: SceneHandlers) {
    stage.scene.add(this.root);
    stage.scene.fog = new THREE.Fog('#110C0A', 34, 70);

    // ---------------------------------------------------------------- light
    const hemi = new THREE.HemisphereLight('#FFF1E0', '#3A2A20', 1.1);
    const sun = new THREE.DirectionalLight('#FFE6C8', 2.2);
    sun.position.set(-9, 16, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -16;
    sun.shadow.camera.right = 16;
    sun.shadow.camera.top = 16;
    sun.shadow.camera.bottom = -16;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    const fill = new THREE.DirectionalLight('#9FB4FF', 0.4);
    fill.position.set(12, 8, -6);
    this.root.add(hemi, sun, fill);

    // ---------------------------------------------------------------- ground, floor, walls
    this.groundMat = mat('#3B3632', 0.95);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), this.groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, 6);
    ground.receiveShadow = true;
    const street = new THREE.Mesh(new THREE.PlaneGeometry(44, 4.4), mat('#2A2826', 0.9));
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, -0.005, 11.4);
    street.receiveShadow = true;
    const dashes = new THREE.Group();
    for (let x = -20; x < 20; x += 2.4) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.1), new THREE.MeshBasicMaterial({ color: '#D8D2C6' }));
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.002, 11.4);
      dashes.add(dash);
    }
    const walk = new THREE.Mesh(new THREE.PlaneGeometry(30, 4.8), mat('#FFFFFF', 0.9, { map: pavement() }));
    walk.rotation.x = -Math.PI / 2;
    walk.position.set(0, 0.0, 6.8);
    walk.receiveShadow = true;
    const curb = box(30, 0.12, 0.2, mat('#9A948C', 0.8), 0.02);
    curb.position.set(0, 0.04, 9.2);
    const floor = box(12.2, 0.12, 9.2, mat('#FFFFFF', 0.55, { map: floorTiles() }), 0.02);
    floor.position.set(0, -0.06, -0.1);
    this.root.add(ground, street, dashes, walk, curb, floor);

    const brickMat = mat('#FFFFFF', 0.92, { map: brick() });
    const plaster = mat('#E9DDCB', 0.9);
    const back = box(12.2, 3.2, 0.2, plaster, 0.02);
    back.position.set(0, 1.6, -4.7);
    const left = box(0.2, 3.2, 9.2, brickMat, 0.02);
    left.position.set(-6.1, 1.6, -0.1);
    const right = box(0.2, 0.9, 9.2, brickMat, 0.02);
    right.position.set(6.1, 0.45, -0.1);
    // A strip of red tiles behind the kitchen line, like a grill house wall.
    const tiles = box(11.6, 1.3, 0.04, mat('#8A2A1A', 0.42), 0.01);
    tiles.position.set(0, 1.55, -4.58);
    this.root.add(back, left, right, tiles);

    // The menu board on the side wall.
    const boardTexture = menuBoardTexture();
    const boardMat = new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.5, emissive: '#FFFFFF', emissiveMap: boardTexture, emissiveIntensity: 0 });
    this.glowing.push(boardMat);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.49), boardMat);
    board.rotation.y = Math.PI / 2;
    board.position.set(-5.98, 2.15, 0.6);
    this.root.add(board);

    // ---------------------------------------------------------------- the glass front and the sign
    this.glass = new THREE.MeshPhysicalMaterial({ color: '#CFE3EA', roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.12, depthWrite: false });
    const frame = mat('#2B2724', 0.5, { metalness: 0.4 });
    const front = new THREE.Group();
    const panes: [number, number][] = [
      [-6, -3.3],
      [-2.0, 0.6],
      [0.6, 3.3],
      [3.3, 6],
    ];
    for (const [a, b] of panes) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(b - a, 2.5), this.glass);
      pane.position.set((a + b) / 2, 1.25, 4.4);
      front.add(pane);
    }
    for (const x of [-6, -3.3, -2.0, 0.6, 3.3, 6]) front.add(at(box(0.09, 2.6, 0.12, frame), x, 1.3, 4.4));
    front.add(at(box(12.1, 0.14, 0.14, frame), 0, 2.6, 4.4));
    front.add(at(box(12.1, 0.18, 0.14, frame), 0, 0.09, 4.4));
    // The door, open into the room.
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.45), this.glass);
    door.position.set(-2.65 - 0.5, 1.23, 4.0);
    door.rotation.y = -1.1;
    front.add(door);
    // Window posters with dishes, as on the real windows.
    const posterColours = ['#E2B13A', '#C8341E', '#5C8C3A'];
    [1.9, 4.6, -4.7].forEach((x, i) => {
      const poster = box(0.95, 0.75, 0.02, mat(posterColours[i], 0.5), 0.01);
      poster.position.set(x, 0.62, 4.36);
      front.add(poster);
    });
    this.root.add(front);

    const sign = signTexture();
    const signMat = new THREE.MeshStandardMaterial({ map: sign, roughness: 0.4, emissive: '#FFFFFF', emissiveMap: sign, emissiveIntensity: 0 });
    this.glowing.push(signMat);
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.82, 0.12), [frame, frame, frame, frame, signMat, frame]);
    fascia.position.set(-1.8, 3.12, 5.55);
    fascia.castShadow = true;
    const canopyUnder = box(12.2, 0.08, 1.2, mat('#EDE6DA', 0.8), 0.01);
    canopyUnder.position.set(0, 2.72, 5.0);
    canopyUnder.material = new THREE.MeshStandardMaterial({ color: '#EDE6DA', roughness: 0.8, transparent: true, opacity: 0.28, depthWrite: false });
    canopyUnder.castShadow = false;
    const pillar = box(0.32, 2.75, 0.32, mat('#F2EEE8', 0.8), 0.02);
    pillar.position.set(-5.85, 1.37, 5.45);
    this.root.add(fascia, canopyUnder, pillar);

    // ---------------------------------------------------------------- kitchen line along the back wall
    const steel = mat('#B8B4AE', 0.32, { metalness: 0.75 });
    const darkSteel = mat('#3A3634', 0.4, { metalness: 0.6 });
    const line = box(11.2, 0.92, 0.85, steel, 0.02);
    line.position.set(0, 0.46, -4.1);
    this.root.add(line);

    // Pizza oven: a domed oven on its base, fire glowing in the mouth.
    const ovenBase = box(1.6, 0.25, 1.35, mat('#5A3A2A', 0.8), 0.04);
    ovenBase.position.set(-4.7, 1.05, -3.95);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), mat('#B24A2A', 0.7));
    dome.scale.set(1, 0.85, 1);
    dome.position.set(-4.7, 1.17, -3.95);
    dome.castShadow = true;
    const mosaic = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.05, 8, 40, Math.PI), mat('#E0B04A', 0.4, { metalness: 0.3 }));
    mosaic.position.set(-4.7, 1.2, -3.95);
    mosaic.rotation.y = Math.PI / 2;
    this.ovenFire = new THREE.MeshBasicMaterial({ color: '#FF7A2A' });
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.3, 24, 0, Math.PI), this.ovenFire);
    mouth.position.set(-4.7, 1.18, -3.18);
    const chimney = cyl(0.1, 1.6, darkSteel);
    chimney.position.set(-4.7, 2.5, -4.1);
    this.root.add(ovenBase, dome, mosaic, mouth, chimney);

    // Two döner spits, slowly turning in front of their glowing heaters.
    this.heaters = new THREE.MeshStandardMaterial({ color: '#3A1A0E', emissive: '#FF5A1A', emissiveIntensity: 1.6, roughness: 0.6 });
    [
      [-3.0, false],
      [-2.15, true],
    ].forEach(([x, chicken]) => {
      const heater = box(0.5, 1.15, 0.08, this.heaters, 0.02);
      heater.position.set(x as number, 1.55, -4.42);
      const rod = cyl(0.018, 1.35, steel);
      rod.position.set(x as number, 1.6, -4.05);
      const profile = [
        new THREE.Vector2(0.02, 0),
        new THREE.Vector2(0.18, 0.02),
        new THREE.Vector2(0.24, 0.35),
        new THREE.Vector2(0.27, 0.7),
        new THREE.Vector2(0.24, 0.92),
        new THREE.Vector2(0.02, 0.96),
      ];
      const meat = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), mat('#FFFFFF', 0.75, { map: spitTexture(chicken as boolean) }));
      meat.position.set(x as number, 1.05, -4.05);
      meat.castShadow = true;
      this.spits.push(meat);
      const tray = cyl(0.3, 0.04, steel);
      tray.position.set(x as number, 1.0, -4.05);
      this.root.add(heater, rod, meat, tray);
    });

    // The charcoal grill (ocakbaşı) under its hood, skewers across the coals.
    const trough = box(2.3, 0.3, 0.82, darkSteel, 0.03);
    trough.position.set(0.8, 1.06, -4.05);
    const { map, glow } = charcoalTextures();
    this.coals = new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: '#FF6A22', emissiveIntensity: 2.2, roughness: 1 });
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(2.14, 0.66), this.coals);
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0.8, 1.215, -4.05);
    const skewerMat = mat('#C9C6C0', 0.3, { metalness: 0.9 });
    const meatMats = [mat('#7A3B1E', 0.7), mat('#B9783E', 0.65), mat('#8B4A26', 0.7)];
    for (let i = 0; i < 7; i++) {
      const x = -0.15 + i * 0.32;
      const skewer = cyl(0.008, 0.95, skewerMat, 0.008, 6);
      skewer.rotation.x = Math.PI / 2;
      skewer.position.set(x, 1.32, -4.05);
      this.root.add(skewer);
      const kind = i % 3;
      if (kind === 0) {
        const kebab = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.55, 4, 10), meatMats[0]);
        kebab.rotation.x = Math.PI / 2;
        kebab.position.set(x, 1.32, -4.05);
        kebab.castShadow = true;
        this.root.add(kebab);
      } else {
        for (let k = 0; k < 5; k++) {
          const cube = box(0.07, 0.065, 0.07, meatMats[kind], 0.02);
          cube.position.set(x, 1.32, -4.3 + k * 0.12);
          cube.rotation.z = rand();
          this.root.add(cube);
        }
      }
    }
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.35, 0.7, 4, 1, true), steel);
    hood.rotation.y = Math.PI / 4;
    hood.scale.set(1.25, 1, 0.5);
    hood.position.set(0.8, 2.65, -4.2);
    hood.castShadow = true;
    const duct = box(0.5, 0.5, 0.4, steel, 0.02);
    duct.position.set(0.8, 3.2, -4.4);
    this.root.add(trough, bed, hood, duct);

    // Plancha with burgers sizzling, and two fryers.
    const plate = box(1.1, 0.06, 0.7, mat('#2E2B29', 0.35, { metalness: 0.7 }), 0.01);
    plate.position.set(2.6, 0.95, -4.05);
    this.root.add(plate);
    for (let i = 0; i < 4; i++) {
      const patty = cyl(0.11, 0.035, mat('#5A2E18', 0.8), 0.11, 16);
      patty.position.set(2.25 + (i % 2) * 0.32 + Math.floor(i / 2) * 0.32, 1.0, -4.2 + (i % 2) * 0.28);
      this.burgers.push(patty);
      this.root.add(patty);
    }
    for (const x of [3.9, 4.65]) {
      const fryer = box(0.62, 0.12, 0.7, steel, 0.02);
      fryer.position.set(x, 0.98, -4.05);
      const oil = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.52), mat('#C48A2A', 0.15, { metalness: 0.3, emissive: '#3A2006', emissiveIntensity: 0.5 }));
      oil.rotation.x = -Math.PI / 2;
      oil.position.set(x, 1.045, -4.05);
      const basket = box(0.3, 0.16, 0.36, mat('#C9C6C0', 0.4, { metalness: 0.8, wireframe: true }), 0.01);
      basket.position.set(x, 1.12, -3.9);
      this.root.add(fryer, oil, basket);
    }

    // ---------------------------------------------------------------- the counter, the salad display, the kassa
    const counterWood = mat('#2A211C', 0.55);
    const counter = box(9.0, 1.05, 0.72, counterWood, 0.03);
    counter.position.set(-0.6, 0.52, -1.75);
    const counterTop = box(9.1, 0.05, 0.8, mat('#D9CFC2', 0.35), 0.01);
    counterTop.position.set(-0.6, 1.07, -1.75);
    const kassa = box(1.2, 1.05, 0.72, counterWood, 0.03);
    kassa.position.set(4.9, 0.52, -1.75);
    const kassaTop = box(1.3, 0.05, 0.8, mat('#D9CFC2', 0.35), 0.01);
    kassaTop.position.set(4.9, 1.07, -1.75);
    const screen = box(0.4, 0.28, 0.03, mat('#141414', 0.3), 0.01);
    screen.position.set(4.9, 1.35, -1.85);
    screen.rotation.x = -0.3;
    this.root.add(counter, counterTop, kassa, kassaTop, screen);
    // The bain-marie with salads under a glass guard.
    const salads = ['#7FB24A', '#D9442E', '#F0E9D8', '#9AC26A', '#E7A33A', '#B03A2E'];
    salads.forEach((c, i) => {
      const tray = box(0.42, 0.06, 0.4, mat(c, 0.85), 0.02);
      tray.position.set(-3.4 + i * 0.5, 1.12, -1.8);
      this.root.add(tray);
    });
    const guard = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.45), this.glass);
    guard.position.set(-2.15, 1.42, -1.42);
    guard.rotation.x = -0.5;
    this.root.add(guard);
    // The pass: heat lamps over the counter.
    this.heatLamp = new THREE.MeshStandardMaterial({ color: '#3A120C', emissive: '#FF3A1A', emissiveIntensity: 1.2 });
    for (const x of [0.5, 1.3]) {
      const lamp = box(0.6, 0.07, 0.16, darkSteel, 0.02);
      lamp.position.set(x, 1.62, -1.85);
      const glowStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.1), this.heatLamp);
      glowStrip.rotation.x = Math.PI / 2;
      glowStrip.position.set(x, 1.58, -1.85);
      const arm = cyl(0.012, 0.42, darkSteel);
      arm.position.set(x, 1.85, -1.85);
      this.root.add(lamp, glowStrip, arm);
    }
    this.bags = new THREE.Group();
    this.bags.position.set(3.7, 1.1, -1.75);
    this.root.add(this.bags);
    this.bagLabel = el('gp-label bags');
    this.bagObject = this.stage.label(this.bagLabel, this.root, [3.9, 1.85, -1.6]);

    // ---------------------------------------------------------------- staff
    const kerem = new Figure('#1C1410', { hat: 'chef', skin: SKIN[1] });
    kerem.group.position.set(0.8, 0, -3.15);
    kerem.group.rotation.y = Math.PI;
    const mert = new Figure('#C8341E', { hat: 'cap', skin: SKIN[2] });
    mert.group.position.set(-2.6, 0, -3.2);
    mert.group.rotation.y = Math.PI;
    const ayla = new Figure('#C8341E', { hat: 'cap', skin: SKIN[3] });
    ayla.group.position.set(3.3, 0, -3.2);
    ayla.group.rotation.y = Math.PI;
    const sevda = new Figure('#E8A23A', { hat: null, skin: SKIN[0] });
    sevda.group.position.set(4.9, 0, -2.5);
    this.staff.kerem = kerem;
    this.staff.mert = mert;
    this.staff.ayla = ayla;
    this.staff.sevda = sevda;
    this.root.add(kerem.group, mert.group, ayla.group, sevda.group);

    // ---------------------------------------------------------------- tables, inside and on the terrace
    const lampShade = mat('#1C1410', 0.5, { metalness: 0.3 });
    this.lights = {
      hemi,
      sun,
      fill,
      lamps: [],
      bulbs: new THREE.MeshStandardMaterial({ color: '#FFE2B0', emissive: '#FFC27A', emissiveIntensity: 3 }),
      grill: new THREE.PointLight('#FF6A22', 6, 7, 1.6),
      oven: new THREE.PointLight('#FF7A2A', 4, 5, 1.6),
      spit: new THREE.PointLight('#FF5A1A', 3, 4, 1.6),
      street: new THREE.PointLight('#FFD9A0', 10, 16, 1.4),
      streetBulb: new THREE.MeshBasicMaterial({ color: '#FFE9C4' }),
    };
    this.lights.grill.position.set(0.8, 1.6, -3.7);
    this.lights.oven.position.set(-4.7, 1.3, -2.9);
    this.lights.spit.position.set(-2.6, 1.6, -3.7);
    this.root.add(this.lights.grill, this.lights.oven, this.lights.spit);

    for (const [n, spot] of Object.entries(TABLE_SPOTS)) {
      const table = Number(n);
      const outside = table >= 5;
      const group = new THREE.Group();
      group.position.set(spot.x, 0, spot.z);
      const top = box(spot.w, 0.05, spot.d, mat(outside ? '#C79A62' : '#3A2A22', 0.6), 0.02);
      top.position.y = 0.74;
      const leg = cyl(0.04, 0.72, mat('#B9B5AF', 0.4, { metalness: 0.7 }));
      leg.position.y = 0.36;
      const foot = cyl(0.25, 0.03, mat('#B9B5AF', 0.4, { metalness: 0.7 }));
      foot.position.y = 0.015;
      group.add(top, leg, foot);
      if (spot.w > 1.2) {
        leg.position.x = -0.6;
        const leg2 = leg.clone();
        leg2.position.x = 0.6;
        const foot2 = foot.clone();
        foot2.position.x = 0.6;
        foot.position.x = -0.6;
        group.add(leg2, foot2);
      }
      // Chairs: red seats on the terrace like on the photo, dark wood inside.
      const seats = table === 4 ? 6 : table === 2 || table === 7 ? 2 : 4;
      const chairs: [number, number, number][] = [];
      if (seats === 6) for (const x of [-0.6, 0, 0.6]) chairs.push([x, -0.72, 0], [x, 0.72, Math.PI]);
      else if (seats === 2) chairs.push([0, -0.62, 0], [0, 0.62, Math.PI]);
      else chairs.push([0, -0.68, 0], [0, 0.68, Math.PI], [-0.68, 0, Math.PI / 2], [0.68, 0, -Math.PI / 2]);
      const seatMat = mat(outside ? '#C8261E' : '#5A3E30', 0.55);
      const frameMat = mat(outside ? '#D8D4CE' : '#2A211C', 0.4, { metalness: outside ? 0.7 : 0 });
      for (const [x, z, ry] of chairs) {
        const chair = new THREE.Group();
        const seat = box(0.42, 0.06, 0.42, seatMat, 0.03);
        seat.position.y = 0.46;
        const backrest = box(0.42, 0.42, 0.05, outside ? frameMat : seatMat, 0.02);
        backrest.position.set(0, 0.7, -0.2);
        for (const lx of [-0.17, 0.17])
          for (const lz of [-0.17, 0.17]) {
            const l = cyl(0.015, 0.46, frameMat, 0.015, 6);
            l.position.set(lx, 0.23, lz);
            chair.add(l);
          }
        chair.add(seat, backrest);
        chair.position.set(x, 0, z);
        chair.rotation.y = ry;
        group.add(chair);
      }
      // Guests sitting down, shown when the table is taken.
      const guests: Figure[] = chairs.map(([x, z, ry], i) => {
        const g = new Figure(['#2E4A6B', '#6B2E3A', '#3E5A3A', '#5A4A6B', '#7A5A3A', '#2A2A2A'][i % 6], { seated: true, hat: null });
        g.group.position.set(x * 0.95, 0.12, z * 0.95);
        g.group.rotation.y = ry;
        g.group.visible = false;
        group.add(g.group);
        return g;
      });
      const plates = new THREE.Group();
      for (let i = 0; i < Math.min(4, seats); i++) {
        const plate2 = cyl(0.13, 0.02, mat('#F4F0EA', 0.4), 0.13, 20);
        const [x, z] = chairs[i];
        plate2.position.set(x * 0.45, 0.78, z * 0.45);
        const food = cyl(0.08, 0.04, mat(['#8B4A26', '#D9A43A', '#7FB24A', '#B9783E'][i], 0.8), 0.06, 12);
        food.position.set(x * 0.45, 0.81, z * 0.45);
        plates.add(plate2, food);
      }
      plates.visible = false;
      group.add(plates);
      // The call beacon: a column of light and a ring on the floor.
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.32, 3.2, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: '#FFB347', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      beacon.position.y = 1.6;
      beacon.visible = false;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 40), new THREE.MeshBasicMaterial({ color: '#FFB347', transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.03;
      ring.visible = false;
      group.add(beacon, ring);

      if (!outside) {
        // A pendant lamp over each table inside.
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.24, 20, 1, true), lampShade);
        shade.position.set(0, 2.55, 0);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), this.lights.bulbs);
        bulb.position.set(0, 2.43, 0);
        const cord = cyl(0.008, 0.6, lampShade);
        cord.position.set(0, 2.97, 0);
        const light = new THREE.PointLight('#FFC27A', 3, 4.5, 1.8);
        light.position.set(0, 2.3, 0);
        this.lights.lamps.push(light);
        group.add(shade, bulb, cord, light);
      }
      this.root.add(group);

      const element = el('gp-label table');
      element.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const answer = target.closest('[data-answer]') as HTMLElement | null;
        if (answer) this.handlers.answer(answer.dataset.answer!);
        else this.handlers.table(table);
      });
      const label = this.stage.label(element, group, [0, 1.35, 0]);
      this.tables.set(table, { group, guests, label, element, beacon, ring, plates });
    }

    // Planters by the terrace and a street lamp.
    for (const x of [-2.2, 1.7]) {
      const planter = box(0.7, 0.5, 0.7, mat('#3A3430', 0.8), 0.04);
      planter.position.set(x, 0.25, 8.4);
      const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), mat('#3F6B33', 0.9));
      bush.position.set(x, 0.75, 8.4);
      bush.castShadow = true;
      this.root.add(planter, bush);
    }
    const post = cyl(0.06, 4.4, mat('#2B2724', 0.5, { metalness: 0.5 }));
    post.position.set(8.4, 2.2, 9.0);
    const arm = box(1.2, 0.08, 0.08, mat('#2B2724', 0.5, { metalness: 0.5 }), 0.02);
    arm.position.set(7.9, 4.35, 9.0);
    const streetBulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), this.lights.streetBulb);
    streetBulb.position.set(7.4, 4.22, 9.0);
    this.lights.street.position.set(7.4, 4.0, 9.0);
    this.root.add(post, arm, streetBulb, this.lights.street);
    // Trees along the Willibrorduslaan, as on the photo.
    for (const [x, z, s] of [
      [-10.5, 7.5, 1.3],
      [-13, 3.5, 1.6],
      [11.5, 7.2, 1.2],
    ] as const) {
      const trunk = cyl(0.12, 2.2, mat('#4A3628', 0.9));
      trunk.position.set(x, 1.1, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 * s, 1), mat('#3D5E2E', 0.95));
      crown.position.set(x, 2.6 + s * 0.6, z);
      crown.castShadow = true;
      this.root.add(trunk, crown);
    }

    // ---------------------------------------------------------------- couriers
    COURIER_IDS.forEach((id, i) => {
      const scooter = new Scooter();
      scooter.group.position.set(CURB[i], 0, 9.0);
      scooter.group.rotation.y = Math.PI / 2;
      const element = el('gp-label courier');
      const label = this.stage.label(element, scooter.group, [0, 1.75, 0]);
      this.root.add(scooter.group);
      this.scooters.set(id, { scooter, element, label, x: CURB[i], z: 9.0, yaw: Math.PI / 2, visible: 1 });
    });

    // ---------------------------------------------------------------- tickets over the stations
    for (const [station, spot] of Object.entries(STATION_SPOTS) as [Station, Vec][]) {
      const element = el('gp-label station');
      const object = this.stage.label(element, this.root, spot);
      this.stationLabels.set(station, { element, object });
    }

    // ---------------------------------------------------------------- fire, smoke and steam
    this.emitters = {
      sparks: new Emitter({ count: 140, origin: new THREE.Vector3(0.8, 1.25, -4.05), spread: new THREE.Vector3(2.0, 0.05, 0.6), rise: [0.6, 1.8], drift: 0.5, life: [0.6, 1.6], size: [0.025, 0.05], from: new THREE.Color('#FFD27A'), to: new THREE.Color('#FF3A10'), opacity: 1, additive: true, ceiling: 2.5 }),
      flames: new Emitter({ count: 70, origin: new THREE.Vector3(0.8, 1.24, -4.05), spread: new THREE.Vector3(2.0, 0.04, 0.55), rise: [0.25, 0.6], drift: 0.15, life: [0.25, 0.6], size: [0.14, 0.26], from: new THREE.Color('#FFB24A'), to: new THREE.Color('#FF3A10'), opacity: 0.55, additive: true, grow: 0.4 }),
      smoke: new Emitter({ count: 60, origin: new THREE.Vector3(1.2, 1.5, -4.1), spread: new THREE.Vector3(2.8, 0.2, 0.5), rise: [0.35, 0.7], drift: 0.25, life: [2.2, 3.6], size: [0.35, 0.6], from: new THREE.Color('#8A7F76'), to: new THREE.Color('#5A524C'), opacity: 0.22, additive: false, soft: true, grow: 2.2, ceiling: 3.0 }),
      ovenFlames: new Emitter({ count: 40, origin: new THREE.Vector3(-4.7, 1.2, -3.35), spread: new THREE.Vector3(0.4, 0.05, 0.1), rise: [0.15, 0.4], drift: 0.12, life: [0.25, 0.55], size: [0.12, 0.22], from: new THREE.Color('#FFC46B'), to: new THREE.Color('#FF4A12'), opacity: 0.5, additive: true, grow: 0.4 }),
      steam: new Emitter({ count: 26, origin: new THREE.Vector3(-2.15, 1.3, -1.8), spread: new THREE.Vector3(2.8, 0.05, 0.3), rise: [0.15, 0.3], drift: 0.12, life: [1.6, 2.6], size: [0.12, 0.2], from: new THREE.Color('#FFFFFF'), to: new THREE.Color('#E8E0D6'), opacity: 0.12, additive: false, soft: true, grow: 1.8 }),
    };
    for (const e of Object.values(this.emitters)) this.root.add(e.points);

    this.unsubscribe = stage.onFrame((time, delta) => this.frame(time, delta));
  }

  /** Day or night: the light, the sky, the glow of the fire and how strong the bloom is. */
  setTheme(mode: ThemeMode) {
    this.nightTarget = mode === 'night' ? 1 : 0;
  }

  private applyLight() {
    const n = this.night;
    const stage = this.stage;
    const bg = new THREE.Color('#EADFCF').lerp(new THREE.Color('#0D0907'), n);
    (stage.scene.background as THREE.Color).copy(bg);
    (stage.scene.fog as THREE.Fog).color.copy(bg);
    this.lights.hemi.intensity = THREE.MathUtils.lerp(1.25, 0.3, n);
    this.lights.hemi.color.set('#FFF1E0').lerp(new THREE.Color('#4A5A8A'), n);
    this.lights.sun.intensity = THREE.MathUtils.lerp(2.4, 0.12, n);
    this.lights.sun.color.set('#FFE6C8').lerp(new THREE.Color('#8FA2D8'), n);
    this.lights.fill.intensity = THREE.MathUtils.lerp(0.45, 0.05, n);
    this.stage.scene.environmentIntensity = THREE.MathUtils.lerp(0.55, 0.2, n);
    for (const l of this.lights.lamps) l.intensity = THREE.MathUtils.lerp(0.6, 5.5, n);
    this.lights.bulbs.emissiveIntensity = THREE.MathUtils.lerp(0.8, 4, n);
    this.lights.street.intensity = THREE.MathUtils.lerp(0, 14, n);
    this.lights.streetBulb.color.set('#B8B2A8').lerp(new THREE.Color('#FFE9C4'), n);
    this.glass.opacity = THREE.MathUtils.lerp(0.16, 0.08, n);
    // The sign and the menu board are lit from inside after dark.
    for (const m of this.glowing) m.emissiveIntensity = THREE.MathUtils.lerp(0.04, 0.55, n);
    this.stage.bloom.strength = THREE.MathUtils.lerp(0.18, 0.85, n);
    this.stage.bloom.threshold = THREE.MathUtils.lerp(1.05, 0.74, n);
    this.groundMat.color.set('#B8AC9C').lerp(new THREE.Color('#241F1C'), n);
    this.emitters.steam.tint(new THREE.Color('#FFFFFF'), new THREE.Color('#E8E0D6'), THREE.MathUtils.lerp(0.14, 0.05, n));
    this.stage.renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.15, n);
    const smokeDay = new THREE.Color('#A39A92');
    this.emitters.smoke.tint(smokeDay.clone().lerp(new THREE.Color('#4A3A32'), n), new THREE.Color('#BDB5AE').lerp(new THREE.Color('#2A221E'), n), THREE.MathUtils.lerp(0.18, 0.28, n));
  }

  update(view: FloorView) {
    this.view = view;
    // Stations: tickets over what is cooking; the cook works harder the more is on.
    for (const [station, { element }] of this.stationLabels) {
      const tickets = view.stations[station] ?? [];
      const cook = staff(COOK_AT[station]);
      const list = tickets
        .slice(0, 3)
        .map((t) => `<li class="${t.mine ? 'mine' : ''}"><b>${t.number}</b><span>${t.dish}</span><i style="--p:${Math.round(t.progress * 100)}%"></i></li>`)
        .join('');
      const more = tickets.length > 3 ? `<li class="more">+${tickets.length - 3}</li>` : '';
      element.classList.toggle('idle', tickets.length === 0);
      element.classList.toggle('has-mine', tickets.some((t) => t.mine));
      element.innerHTML = trHtml(
        `<div class="st-head"><span class="st-count">${tickets.length}</span><b>${STATION_NAMES[station]}</b><small>${cook.name}</small></div>${tickets.length ? `<ul>${list}${more}</ul>` : ''}`,
      );
    }
    const load = (s: Station) => Math.min(1, (view.stations[s]?.length ?? 0) / 3);
    this.staff.kerem.busy = load('grill');
    this.staff.mert.busy = Math.max(load('spit'), load('oven'));
    this.staff.ayla.busy = Math.max(load('plancha'), load('fryer'));
    this.staff.sevda.busy = Math.min(1, view.bags.length / 3);
    this.emitters.sparks.rate = 0.35 + load('grill') * 0.65;
    this.emitters.flames.rate = 0.45 + load('grill') * 0.55;
    this.emitters.ovenFlames.rate = 0.5 + load('oven') * 0.5;

    for (const t of view.tables) this.updateTable(t);

    // Bags on the counter for pick-up.
    const count = Math.min(6, view.bags.length);
    while (this.bags.children.length < count) {
      const i = this.bags.children.length;
      const bag = box(0.24, 0.3, 0.16, mat('#C49A6C', 0.9), 0.02);
      const sticker = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: '#D42D17' }));
      sticker.position.set(0, 0.02, 0.082);
      bag.add(sticker);
      bag.position.set((i % 3) * 0.3, 0.15 + Math.floor(i / 3) * 0.0, Math.floor(i / 3) * 0.22 - 0.1);
      this.bags.add(bag);
    }
    while (this.bags.children.length > count) this.bags.remove(this.bags.children[this.bags.children.length - 1]);
    // The label layer sets display itself, so hiding goes through the object.
    this.bagObject.visible = view.bags.length > 0;
    this.bagLabel.classList.toggle('mine', view.bags.some((b) => b.mine));
    this.bagLabel.innerHTML = trHtml(`<b>${view.bags.length}</b><span>${view.bags.length === 1 ? 'tas klaar om af te halen' : 'tassen klaar om af te halen'}</span>`);

    for (const c of view.couriers) this.updateCourierLabel(c);
  }

  private updateTable(t: TableView) {
    const parts = this.tables.get(t.n);
    if (!parts) return;
    const seated = t.state === 'wacht' || t.state === 'eet' || t.state === 'roept';
    const guests = seated ? Math.max(1, Math.min(parts.guests.length, t.guests || 2)) : 0;
    parts.guests.forEach((g, i) => (g.group.visible = i < guests));
    parts.plates.visible = t.state === 'eet' || (t.state === 'roept' && t.total > 0);
    parts.beacon.visible = t.state === 'roept';
    parts.ring.visible = t.state === 'roept' || t.mine;
    const ringMat = parts.ring.material as THREE.MeshBasicMaterial;
    ringMat.color.set(t.state === 'roept' ? '#FFB347' : '#FF4B2B');
    parts.element.dataset.state = t.state;
    parts.element.classList.toggle('mine', t.mine);
    const detail =
      t.state === 'vrij'
        ? '<span>Vrij</span>'
        : t.state === 'gereserveerd'
          ? `<span>Gereserveerd · ${t.booked}</span>`
          : `<span>${t.guests === 1 ? '1 gast' : `${t.guests} gasten`}${t.total ? ` · ${euro(t.total)}` : ''}</span>`;
    const call = t.call
      ? `<div class="call"><em>${CALL_NAMES[t.call.kind]}</em><button data-answer="${t.call.id}">Beantwoord</button></div>`
      : '';
    parts.element.innerHTML = trHtml(`<div class="t-head"><b>T${t.n}</b>${detail}</div>${call}`);
  }

  private updateCourierLabel(c: CourierView) {
    const s = this.scooters.get(c.id);
    if (!s) return;
    const where = c.area ? c.area.name : '';
    const text =
      c.phase === 'heen'
        ? `<b>${c.name}</b><span>${c.order?.number ?? ''} → ${where}</span>`
        : c.phase === 'terug'
          ? `<b>${c.name}</b><span>terug uit ${where}</span>`
          : c.phase === 'wacht'
            ? `<b>${c.name}</b><span>wacht op ${c.order?.number ?? ''}</span>`
            : `<b>${c.name}</b><span>vrij</span>`;
    s.element.dataset.phase = c.phase;
    s.element.classList.toggle('mine', !!c.order?.mine);
    s.element.innerHTML = trHtml(text);
  }

  /** Where a courier is: at the curb, pulling out, gone down the street, or coming back. */
  private courierTarget(c: CourierView, slot: number): { x: number; z: number; yaw: number; visible: number } {
    const home = { x: CURB[slot], z: 9.0, yaw: Math.PI / 2, visible: 1 };
    if (c.phase !== 'heen' && c.phase !== 'terug') return home;
    const dir = (c.area?.x ?? 1) < 0 ? -1 : 1;
    const end = 19 * dir;
    // Out: first 15% of the ride on screen, back: the last 30% of the way home.
    const p = c.phase === 'heen' ? Math.min(1, c.progress / 0.15) : Math.max(0, (c.progress - 0.7) / 0.3);
    const along = c.phase === 'heen' ? p : 1 - p;
    const x = CURB[slot] + (end - CURB[slot]) * along;
    const z = along < 0.08 ? 9.0 + (LANE_Z - 9.0) * (along / 0.08) : LANE_Z;
    const yaw = c.phase === 'heen' ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    const visible = c.phase === 'heen' ? (p >= 1 ? 0 : 1) : p <= 0 ? 0 : 1;
    return { x, z, yaw, visible };
  }

  private frame(time: number, delta: number) {
    // Day and night fade into each other.
    const before = this.night;
    this.night = damp(this.night, this.nightTarget, 2.2, delta);
    if (Math.abs(before - this.night) > 1e-4 || time < 0.1 || !this.lightApplied) {
      this.applyLight();
      this.lightApplied = true;
    }
    const f = flicker(time);
    this.coals.emissiveIntensity = (1.7 + this.night * 1.2) * f;
    this.lights.grill.intensity = (3 + this.night * 7) * f;
    this.lights.oven.intensity = (1.5 + this.night * 3) * flicker(time, 2.4);
    this.ovenFire.color.setRGB(1, 0.42 + 0.12 * flicker(time, 1.3), 0.12);
    this.heaters.emissiveIntensity = 1.2 + this.night * 1.2 + Math.sin(time * 1.3) * 0.08;
    this.lights.spit.intensity = 1.5 + this.night * 3;
    this.heatLamp.emissiveIntensity = 0.8 + this.night * 1.2;
    for (const [i, spit] of this.spits.entries()) spit.rotation.y = time * (0.35 + i * 0.07);
    for (const [i, b] of this.burgers.entries()) b.position.y = 1.0 + Math.max(0, Math.sin(time * 9 + i * 2)) * 0.004;
    for (const fig of Object.values(this.staff)) fig.frame(time);
    // Particle sizes are in metres: the projection turns them into pixels for this canvas.
    const pixels = this.stage.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.stage.camera.fov / 2)));
    for (const e of Object.values(this.emitters)) {
      e.setScale(pixels * this.stage.camera.zoom);
      e.update(delta, time);
    }

    // Beacons pulse; the guests at the tables move a little.
    for (const parts of this.tables.values()) {
      if (parts.beacon.visible) {
        const pulse = 0.5 + Math.sin(time * 5) * 0.5;
        (parts.beacon.material as THREE.MeshBasicMaterial).opacity = 0.18 + pulse * 0.3;
        parts.ring.scale.setScalar(1 + pulse * 0.25);
      } else if (parts.ring.visible) {
        parts.ring.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
      }
      for (const g of parts.guests) if (g.group.visible) g.frame(time * 0.4);
    }

    // Couriers glide to where they should be.
    if (this.view) {
      this.view.couriers.forEach((c, slot) => {
        const s = this.scooters.get(c.id);
        if (!s) return;
        const target = this.courierTarget(c, slot);
        s.x = damp(s.x, target.x, 3, delta);
        s.z = damp(s.z, target.z, 3, delta);
        s.yaw = damp(s.yaw, target.yaw, 4, delta);
        s.visible = damp(s.visible, target.visible, 4, delta);
        s.scooter.group.position.set(s.x, 0, s.z);
        s.scooter.group.rotation.y = s.yaw;
        s.scooter.group.scale.setScalar(Math.max(0.001, s.visible));
        s.scooter.group.visible = s.visible > 0.02;
        s.scooter.rider.group.visible = c.phase !== 'binnen';
        s.element.style.opacity = String(Math.min(1, s.visible * 1.4));
        s.scooter.rider.frame(time * 0.3);
      });
    }

    // Close up, the tickets show in full; from afar only the counts, so nothing overlaps.
    const distance = this.stage.camera.position.distanceTo(this.stage.controls.target);
    this.stage.host.classList.toggle('near', distance < 13);
    // The kitchen's tickets open up only when the camera looks at the kitchen, not from the terrace.
    this.stage.host.classList.toggle('near-kitchen', distance < 13 && this.stage.controls.target.z < -0.5);
  }

  private lightApplied = false;

  dispose() {
    this.unsubscribe();
    this.root.removeFromParent();
  }
}

const COURIER_IDS = ['joep', 'bilal', 'mats'];

/** "Tafel 4" in the current language, for tooltips built in code. */
export const tableName = (n: number) => `${tr('Tafel')} ${n}`;

export const ADDRESS = `${RESTAURANT.street}, ${RESTAURANT.city}`;
