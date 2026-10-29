import { TABLES } from '@grill/shared';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { tr } from '../i18n';
import { useTheme } from '../state/theme';
import { Canvas3D } from './Canvas3D';

/** Where the tables stand: four inside behind the glass, three on the terrace with the red chairs. */
const SPOTS: Record<number, [number, number]> = { 1: [-1.4, -1.3], 2: [-0.2, -1.5], 3: [1.0, -1.3], 4: [-0.6, -0.3], 5: [-1.5, 1.4], 6: [0.0, 1.5], 7: [1.4, 1.4] };

/**
 * Grill-Point in 3D from above, for booking a table: tap a table to pick it. Taken tables are greyed out; the picked one
 * glows. Inside behind the glass front, the terrace in front under the red-and-white sign.
 */
export function TablePicker({ picked, taken, onPick, style }: { picked: number | null; taken: number[]; onPick: (n: number) => void; style?: StyleProp<ViewStyle> }) {
  const { mode } = useTheme();
  const night = mode === 'night';
  const live = useRef({ picked, taken, onPick });
  live.current = { picked, taken, onPick };
  return (
    <Canvas3D
      style={style}
      deps={[night]}
      fov={34}
      setup={({ scene, camera, el, renderer }) => {
        renderer.toneMappingExposure = night ? 1.25 : 1.1;
        scene.add(new THREE.HemisphereLight(night ? 0x7a5a48 : 0xfff3e0, night ? 0x0a0604 : 0x9a8670, night ? 0.7 : 1.3));
        const sun = new THREE.DirectionalLight(night ? 0xffc890 : 0xffffff, night ? 0.6 : 1.4);
        sun.position.set(2, 5, 3);
        sun.castShadow = true;
        scene.add(sun);
        const floorIn = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 2.4), new THREE.MeshStandardMaterial({ color: night ? 0x3a2a22 : 0xcdb79a, roughness: 0.8 }));
        floorIn.position.set(0, -0.03, -0.9);
        floorIn.receiveShadow = true;
        const terrace = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.04, 1.8), new THREE.MeshStandardMaterial({ color: night ? 0x4a403a : 0xb9b0a6, roughness: 0.9 }));
        terrace.position.set(0, -0.04, 1.35);
        terrace.receiveShadow = true;
        scene.add(floorIn, terrace);
        // Back wall with the counter, and the glass front with a door.
        const wall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 0.08), new THREE.MeshStandardMaterial({ color: night ? 0x2a2420 : 0x6b5a50 }));
        wall.position.set(0, 0.55, -2.1);
        const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.5 }));
        counter.position.set(0.6, 0.25, -1.85);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.0, 0.04), new THREE.MeshStandardMaterial({ color: 0x9ec4d8, transparent: true, opacity: 0.18, roughness: 0.1 }));
        glass.position.set(0, 0.5, 0.33);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.06), new THREE.MeshStandardMaterial({ color: 0xf3ece2, emissive: night ? 0x332a20 : 0x000000 }));
        sign.position.set(-0.4, 1.12, 0.36);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.065), new THREE.MeshStandardMaterial({ color: 0xee5e1c, emissive: night ? 0x662200 : 0x000000 }));
        stripe.position.set(-0.4, 1.03, 0.36);
        scene.add(wall, counter, glass, sign, stripe);

        const tableMat = (zone: string) => new THREE.MeshStandardMaterial({ color: zone === 'terras' ? 0xc89a62 : 0x5a3a28, roughness: 0.5, emissive: 0x000000 });
        const chairMat = new THREE.MeshStandardMaterial({ color: 0xc8261a, roughness: 0.55 });
        const chairIn = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.6 });
        const hits: THREE.Mesh[] = [];
        const tops: Record<number, THREE.Mesh> = {};
        const tags: Record<number, HTMLDivElement> = {};
        for (const t of TABLES) {
          const [x, z] = SPOTS[t.n];
          const w = t.seats >= 6 ? 1.0 : t.seats >= 4 ? 0.62 : 0.46;
          const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.56), tableMat(t.zone));
          top.position.set(x, 0.42, z);
          top.castShadow = true;
          top.userData.n = t.n;
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8a8d90, metalness: 0.8, roughness: 0.3 }));
          leg.position.set(x, 0.2, z);
          scene.add(top, leg);
          for (let s = 0; s < t.seats; s++) {
            const side = s % 2 ? 1 : -1;
            const along = (Math.floor(s / 2) - (Math.ceil(t.seats / 2) - 1) / 2) * 0.36;
            const chair = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.26), t.zone === 'terras' ? chairMat : chairIn);
            seat.position.y = 0.28;
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, 0.03), t.zone === 'terras' ? chairMat : chairIn);
            back.position.set(0, 0.44, side * 0.12);
            chair.add(seat, back);
            chair.position.set(x + along, 0, z + side * 0.42);
            chair.traverse((o) => (o.castShadow = true));
            scene.add(chair);
          }
          const hit = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.8, 1.3), new THREE.MeshBasicMaterial({ visible: false }));
          hit.position.set(x, 0.4, z);
          hit.userData.n = t.n;
          scene.add(hit);
          hits.push(hit);
          tops[t.n] = top;
          const tag = document.createElement('div');
          tag.innerHTML = `<b>${t.n}</b> · ${t.seats} ${tr('plaatsen')}`;
          Object.assign(tag.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            pointerEvents: 'none',
            font: '600 11px "Geist", sans-serif',
            color: '#FFF6EC',
            background: 'rgba(17,12,10,0.72)',
            padding: '4px 9px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
          } satisfies Partial<CSSStyleDeclaration>);
          el.appendChild(tag);
          tags[t.n] = tag;
        }
        const ray = new THREE.Raycaster();
        const ptr = new THREE.Vector2();
        const click = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
          ray.setFromCamera(ptr, camera);
          const hit = ray.intersectObjects(hits)[0];
          const n = hit?.object.userData.n as number | undefined;
          if (n && !live.current.taken.includes(n)) live.current.onPick(n);
        };
        el.addEventListener('pointerup', click);
        const v = new THREE.Vector3();
        return {
          update: (t) => {
            const { picked: p, taken: busy } = live.current;
            const a = Math.sin(t * 0.15) * 0.25;
            camera.position.set(Math.sin(a) * 4.6, 4.4, Math.cos(a) * 4.6 + 0.6);
            camera.lookAt(0, 0, 0.1);
            for (const table of TABLES) {
              const m = tops[table.n].material as THREE.MeshStandardMaterial;
              const on = table.n === p;
              m.emissive.setHex(on ? 0xff5a1e : 0x000000);
              m.emissiveIntensity = on ? 0.7 + Math.sin(t * 5) * 0.25 : 0;
              m.opacity = busy.includes(table.n) ? 0.35 : 1;
              m.transparent = busy.includes(table.n);
              tops[table.n].getWorldPosition(v);
              v.y += 0.35;
              v.project(camera);
              const tag = tags[table.n];
              tag.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight}px)`;
              tag.style.background = on ? '#E0321B' : busy.includes(table.n) ? 'rgba(17,12,10,0.35)' : 'rgba(17,12,10,0.72)';
              tag.style.textDecoration = busy.includes(table.n) ? 'line-through' : 'none';
            }
          },
          dispose: () => {
            el.removeEventListener('pointerup', click);
            Object.values(tags).forEach((t) => t.remove());
          },
        };
      }}
    />
  );
}
