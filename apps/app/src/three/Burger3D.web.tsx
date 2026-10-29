import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { tr } from '../i18n';
import { Canvas3D } from './Canvas3D';
import { meatTexture } from './kitchen';

type Kind = 'smash' | 'classic' | 'chicken';

type Layer = { name: string; mesh: THREE.Object3D; height: number };

const mat = (color: number, rough = 0.6, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

/** A bun half as a lathe: flat bottom, domed top with a glossy brown crust. */
function bun(top: boolean, sesame: boolean): THREE.Object3D {
  const pts: THREE.Vector2[] = [];
  if (top) {
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.cos(a) * 0.62, Math.sin(a) * 0.36));
    }
    pts.unshift(new THREE.Vector2(0.001, 0), new THREE.Vector2(0.6, 0));
    pts.reverse();
  } else {
    pts.push(new THREE.Vector2(0.001, 0), new THREE.Vector2(0.58, 0), new THREE.Vector2(0.62, 0.04), new THREE.Vector2(0.62, 0.14), new THREE.Vector2(0.6, 0.17), new THREE.Vector2(0.001, 0.17));
  }
  const g = new THREE.Group();
  const crust = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), mat(top ? 0xb5671f : 0xc98a45, 0.42, { metalness: 0.02 }));
  crust.castShadow = true;
  g.add(crust);
  if (!top) {
    const crumb = new THREE.Mesh(new THREE.CircleGeometry(0.6, 48), mat(0xf2d7a4, 0.9));
    crumb.rotation.x = -Math.PI / 2;
    crumb.position.y = 0.171;
    g.add(crumb);
  }
  if (top && sesame) {
    const seed = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0xf6e6c0, 0.5), 70);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 70; i++) {
      const r = Math.sqrt(Math.random()) * 0.52;
      const a = Math.random() * Math.PI * 2;
      const y = Math.sqrt(Math.max(0, 1 - (r / 0.62) ** 2)) * 0.36;
      m.compose(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0.3)), new THREE.Vector3(1.6, 0.6, 0.9));
      seed.setMatrixAt(i, m);
    }
    g.add(seed);
  }
  return g;
}

/** A patty with a rough top and, when smashed, lacy dark edges. */
function patty(smashed: boolean, chicken = false): THREE.Object3D {
  const r = smashed ? 0.66 : 0.6;
  const h = smashed ? 0.07 : 0.13;
  const geo = new THREE.CylinderGeometry(r, r * 0.98, h, 56, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const edge = Math.hypot(x, z) / r;
    const wobble = 1 + (Math.sin(a * 9) * 0.02 + Math.sin(a * 23) * 0.015) * (smashed ? 2 : 1) * edge;
    pos.setX(i, x * wobble);
    pos.setZ(i, z * wobble);
    pos.setY(i, pos.getY(i) + (Math.random() - 0.5) * 0.012);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(
    geo,
    chicken ? new THREE.MeshStandardMaterial({ map: meatTexture([214, 150, 70], 0.25, false), roughness: 0.85, bumpScale: 1 }) : new THREE.MeshStandardMaterial({ map: meatTexture([110, 54, 32], 0.85, false), roughness: 0.6 }),
  );
  m.castShadow = true;
  return m;
}

/** A slice of cheddar that droops over the edge. */
function cheese(): THREE.Object3D {
  const geo = new THREE.PlaneGeometry(1.05, 1.05, 24, 24);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const d = Math.max(Math.abs(x), Math.abs(z));
    const out = Math.max(0, Math.hypot(x, z) - 0.55);
    pos.setY(i, -out * out * 2.2 - (d > 0.5 ? (d - 0.5) * 0.1 : 0));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(0xf3a72c, 0.32, { side: THREE.DoubleSide, emissive: 0x3a1600, emissiveIntensity: 0.4 }));
  m.rotation.y = Math.PI / 4;
  return m;
}

/** Lettuce: a ruffled green disc. */
function lettuce(): THREE.Object3D {
  const geo = new THREE.CircleGeometry(0.72, 96, 0, Math.PI * 2);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const a = Math.atan2(z, x);
    pos.setY(i, Math.sin(a * 14) * 0.05 * (r / 0.72) ** 2 + Math.sin(a * 5 + r * 8) * 0.015);
    const k = 1 + Math.sin(a * 7) * 0.05;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat(0x67a83a, 0.55, { side: THREE.DoubleSide }));
}

function sauce(color: number): THREE.Object3D {
  const geo = new THREE.CylinderGeometry(0.6, 0.6, 0.025, 64, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 6) * 0.06 + Math.sin(a * 13) * 0.03;
    pos.setX(i, x * k);
    pos.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat(color, 0.25, { metalness: 0.05 }));
}

function slices(color: number, inner: number, count: number, r: number, h: number, spread = 0.38): THREE.Object3D {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.3;
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), [mat(color, 0.5), mat(inner, 0.6), mat(inner, 0.6)]);
    s.position.set(Math.cos(a) * spread, 0, Math.sin(a) * spread);
    s.rotation.z = (Math.random() - 0.5) * 0.15;
    g.add(s);
  }
  return g;
}

/** Caramelised onion: thin brown rings, loosely piled. */
function onions(): THREE.Object3D {
  const g = new THREE.Group();
  const m = mat(0x8a4a16, 0.4, { metalness: 0.05 });
  for (let i = 0; i < 14; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07 + Math.random() * 0.06, 0.012, 6, 20, Math.PI * (1 + Math.random())), m);
    ring.rotation.set(Math.PI / 2 + (Math.random() - 0.5) * 0.4, 0, Math.random() * 6);
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 0.45;
    ring.position.set(Math.cos(a) * r, Math.random() * 0.02, Math.sin(a) * r);
    g.add(ring);
  }
  return g;
}

function layersFor(kind: Kind): Layer[] {
  const L = (name: string, mesh: THREE.Object3D, height: number): Layer => ({ name, mesh, height });
  if (kind === 'chicken') {
    return [
      L('Broodje', bun(false, false), 0.17),
      L('Burgersaus', sauce(0xe8a070), 0.025),
      L('Sla', lettuce(), 0.05),
      L('Kipburger', patty(false, true), 0.13),
      L('Tomaat', slices(0xd0321e, 0xe85a3e, 3, 0.17, 0.03), 0.03),
      L('Ui', onions(), 0.03),
      L('Augurk', slices(0x5c7a2a, 0x9cbf5a, 4, 0.09, 0.015, 0.3), 0.015),
      L('Burgersaus', sauce(0xe8a070), 0.025),
      L('Broodje', bun(true, true), 0.36),
    ];
  }
  const layers = [
    L('Broodje', bun(false, false), 0.17),
    L('Burgersaus', sauce(0xe8a070), 0.025),
    L('Sla', lettuce(), 0.05),
    L(kind === 'smash' ? 'Smash 1' : 'Rundvlees', patty(kind === 'smash'), kind === 'smash' ? 0.07 : 0.13),
    L('Cheddar', cheese(), 0.01),
  ];
  if (kind === 'smash') layers.push(L('Smash 2', patty(true), 0.07), L('Cheddar', cheese(), 0.01));
  layers.push(L('Augurk', slices(0x5c7a2a, 0x9cbf5a, 4, 0.09, 0.015, 0.3), 0.015), L('Karamelui', onions(), 0.03), L('Burgersaus', sauce(0xe8a070), 0.025), L('Broodje', bun(true, true), 0.36));
  return layers;
}

/**
 * The burger in 3D, built from its real ingredients as the menu lists them. It turns slowly; drag to turn it, tap to
 * take it apart layer by layer (with each layer named) and tap again to stack it back.
 */
export function Burger3D({ kind, style }: { kind: Kind; style?: StyleProp<ViewStyle> }) {
  return (
    <Canvas3D
      style={style}
      deps={[kind]}
      fov={32}
      setup={({ scene, camera, el, renderer }) => {
        renderer.toneMappingExposure = 1.15;
        scene.add(new THREE.HemisphereLight(0xfff0e0, 0x2a1810, 0.9));
        const key = new THREE.DirectionalLight(0xffe2c4, 2.2);
        key.position.set(2, 4, 3);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xff7a3a, 1.6);
        rim.position.set(-3, 1.5, -2);
        scene.add(rim);
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.05, 0.05, 64), mat(0x1c1410, 0.8));
        plate.position.y = -0.04;
        plate.receiveShadow = true;
        scene.add(plate);
        const glow = new THREE.Mesh(new THREE.RingGeometry(1.2, 2.2, 64), new THREE.MeshBasicMaterial({ color: 0xff5a1e, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = -0.06;
        scene.add(glow);
        const burger = new THREE.Group();
        scene.add(burger);
        const layers = layersFor(kind);
        // Stacked heights, and how far each layer floats when the burger is taken apart.
        let y = 0;
        const rest: number[] = [];
        for (const l of layers) {
          rest.push(y);
          y += l.height * 0.92;
          burger.add(l.mesh);
        }
        const spread = 0.26;

        // Names next to the layers: HTML labels that follow their layer on screen.
        const labels = layers.map((l, i) => {
          const tag = document.createElement('div');
          tag.textContent = tr(l.name);
          Object.assign(tag.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            pointerEvents: 'none',
            font: '600 10px "Geist Mono", ui-monospace, monospace',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#F6EBDD',
            whiteSpace: 'nowrap',
            padding: '4px 8px',
            borderRadius: '999px',
            background: 'rgba(17,12,10,0.66)',
            border: '1px solid rgba(255,140,60,0.35)',
            opacity: '0',
            transition: 'opacity .4s ease',
            transitionDelay: `${i * 40}ms`,
          } satisfies Partial<CSSStyleDeclaration>);
          el.appendChild(tag);
          return tag;
        });

        let open = 0;
        let want = 0;
        let spin = 0.6;
        let drag: { x: number; at: number } | null = null;
        let moved = 0;
        const timer = setTimeout(() => {
          want = 1;
        }, 900);
        const down = (e: PointerEvent) => {
          drag = { x: e.clientX, at: spin };
          moved = 0;
        };
        const move = (e: PointerEvent) => {
          if (!drag) return;
          moved = Math.max(moved, Math.abs(e.clientX - drag.x));
          spin = drag.at + (e.clientX - drag.x) * 0.012;
        };
        const up = () => {
          if (drag && moved < 6) want = want ? 0 : 1;
          drag = null;
        };
        el.addEventListener('pointerdown', down);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        const v = new THREE.Vector3();
        return {
          update: (t, dt) => {
            open += (want - open) * Math.min(1, dt * 4);
            if (!drag) spin += dt * 0.35;
            burger.rotation.y = spin;
            const total = y + open * spread * (layers.length - 1);
            layers.forEach((l, i) => {
              l.mesh.position.y = rest[i] + open * spread * i + Math.sin(t * 1.4 + i) * 0.01 * open;
            });
            burger.position.y = -total / 2 + 0.25;
            plate.position.y = burger.position.y - 0.04;
            glow.position.y = burger.position.y - 0.06;
            // Narrow phones need the camera further back to fit the opened stack and its names.
            const far = camera.aspect < 0.9 ? 1.3 : 1;
            camera.position.set(0, 0.9 + open * 0.5, (3.6 + open * 3.4) * far);
            camera.lookAt(0, 0.1, 0);
            const w = el.clientWidth;
            const h = el.clientHeight;
            layers.forEach((l, i) => {
              // Names alternate left and right of the stack, so neighbours never overlap.
              const right = i % 2 === 0;
              l.mesh.getWorldPosition(v);
              v.x = right ? 0.66 : -0.66;
              v.project(camera);
              const tag = labels[i];
              tag.style.opacity = open > 0.8 ? '1' : '0';
              tag.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h - 12}px) translateX(${right ? '0' : '-100%'})`;
            });
          },
          dispose: () => {
            clearTimeout(timer);
            el.removeEventListener('pointerdown', down);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            labels.forEach((l) => l.remove());
          },
        };
      }}
    />
  );
}
