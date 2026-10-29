import type { Station } from '@grill/shared';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { useTheme } from '../state/theme';
import { Canvas3D } from './Canvas3D';
import { faceCamera, grill, kitchenRoom, oven, plancha, skewer, spit, type SkewerKind } from './kitchen';

export type CamProps = {
  /** The station the camera looks at. */
  station: Station;
  /** The guest's own item at that station, highlighted and named; null shows the kitchen at work. */
  mine: { label: string; kind: SkewerKind | 'spit' | 'pizza' | 'burger'; cook: number } | null;
  /** Ticket numbers hanging on the rail above the line. */
  tickets: string[];
  style?: StyleProp<ViewStyle>;
};

/** Where each camera hangs and what it looks at. */
const CAMS: Record<Station, { pos: [number, number, number]; look: [number, number, number] }> = {
  grill: { pos: [0.15, 1.7, 1.2], look: [0.15, -0.2, -0.05] },
  spit: { pos: [-2.15, 0.15, 1.55], look: [-2.2, -0.5, -0.1] },
  oven: { pos: [2.5, 0.2, 1.9], look: [2.55, -0.4, 0.2] },
  plancha: { pos: [1.85, -0.2, 1.75], look: [1.45, -0.8, 0.72] },
  fryer: { pos: [1.85, -0.2, 1.75], look: [1.45, -0.8, 0.72] },
  pass: { pos: [0.2, 1.9, 3.2], look: [0.1, 0.2, 0] },
  cold: { pos: [0.2, 1.9, 3.2], look: [0.1, 0.2, 0] },
};

function ticketTexture(text: string, mine: boolean) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = mine ? '#FFF1DE' : '#F4EEE6';
  ctx.fillRect(0, 0, 256, 320);
  ctx.fillStyle = mine ? '#D42D17' : '#1C1410';
  ctx.fillRect(0, 0, 256, 54);
  ctx.fillStyle = '#FFF6EC';
  ctx.font = '700 30px "Big Shoulders Display", Impact, sans-serif';
  ctx.fillText('GRILL-POINT', 18, 38);
  ctx.fillStyle = '#1C1410';
  ctx.font = '800 64px "Big Shoulders Display", Impact, sans-serif';
  ctx.fillText(text, 18, 130);
  ctx.fillStyle = 'rgba(28,20,16,0.55)';
  for (let y = 160; y < 300; y += 22) ctx.fillRect(18, y, 120 + ((y * 37) % 100), 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * The Grill-Cam: Grill-Point's kitchen line in 3D (döner spits, the charcoal grill, the plancha, the pizza oven), seen
 * through the camera above the station that is cooking. The guest's own item glows and carries their name; it browns
 * on the fire as the minutes pass. The camera drifts a little, like a real one on a bracket.
 */
export function GrillCam({ station, mine, tickets, style }: CamProps) {
  const { mode } = useTheme();
  const night = mode === 'night';
  const live = useRef({ station, mine, tickets });
  live.current = { station, mine, tickets };
  return (
    <Canvas3D
      style={style}
      deps={[night]}
      fov={42}
      alpha={false}
      setup={({ scene, camera, el, renderer }) => {
        renderer.toneMappingExposure = night ? 1.15 : 1.25;
        scene.background = new THREE.Color(night ? 0x0d0907 : 0x2a211c);
        scene.fog = new THREE.Fog(scene.background, 4, 11);
        scene.add(kitchenRoom(night));

        // The line, left to right: two döner spits, the charcoal grill, the plancha, the pizza oven.
        const doner = spit(false);
        doner.group.position.set(-2.55, -0.85, -0.1);
        const kip = spit(true);
        kip.group.position.set(-1.85, -0.85, -0.1);
        const g = grill(1.5, 0.6);
        g.group.position.set(0.15, -0.3, 0);
        const p = plancha();
        p.group.position.set(1.45, -0.85, 0.75);
        const o = oven();
        o.group.position.set(2.55, -0.45, -0.1);
        o.group.scale.setScalar(0.8);
        scene.add(doner.group, kip.group, g.group, p.group, o.group);
        // Warm lamps under the hood over each station, so every camera has its subject lit.
        for (const [x, z] of [[-2.2, 0.4], [0.15, 0.4], [1.45, 1.0], [2.55, 0.8]] as const) {
          const lamp = new THREE.PointLight(0xffd2a0, night ? 2.2 : 1.6, 2.6, 1.4);
          lamp.position.set(x, 0.75, z);
          scene.add(lamp);
        }

        // Skewers on the grill: the guest's one in the middle slot, the others around it.
        const kinds: SkewerKind[] = ['kofte', 'sis', 'adana', 'vleugel', 'pirzola', 'adana'];
        const sticks = kinds.map((k, i) => {
          const s = skewer(k, 1.2);
          s.group.position.copy(g.slots[i]).add(new THREE.Vector3(0.05, 0.03, 0));
          s.cook(0.3 + ((i * 0.37) % 0.6));
          g.group.add(s.group);
          return s;
        });
        const myStick = { s: skewer('adana', 1.2), kind: 'adana' as SkewerKind };
        myStick.s.group.position.copy(g.slots[2]).add(new THREE.Vector3(0.05, 0.035, 0));
        g.group.add(myStick.s.group);
        sticks[2].group.visible = false;

        // A ring of light under the guest's item.
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 48), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        ring.rotation.x = -Math.PI / 2;
        scene.add(ring);

        // The ticket rail over the line.
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 6, 8), new THREE.MeshStandardMaterial({ color: 0x9a9da0, metalness: 0.9, roughness: 0.3 }));
        rail.rotation.z = Math.PI / 2;
        rail.position.set(0, 1.25, -0.55);
        scene.add(rail);
        const ticketMeshes: THREE.Mesh[] = [];
        let shown = '';
        const STATION_X: Partial<Record<Station, number>> = { grill: 0.15, spit: -2.2, oven: 2.55, plancha: 1.45, fryer: 1.45 };
        /** Tonight's tickets along the rail; the guest's own one hangs over the station that is cooking it. */
        const hangTickets = (list: string[], mineLabel: string | null, st: Station) => {
          const key = `${list.join(',')}|${mineLabel}|${st}`;
          if (key === shown) return;
          shown = key;
          for (const m of ticketMeshes) {
            scene.remove(m);
            (m.material as THREE.MeshStandardMaterial).map?.dispose();
          }
          ticketMeshes.length = 0;
          const hang = (text: string, x: number, own: boolean) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(own ? 0.26 : 0.2, own ? 0.33 : 0.25), new THREE.MeshStandardMaterial({ map: ticketTexture(text, own), roughness: 0.9, emissive: own ? 0x5a2200 : 0x000000 }));
            m.position.set(x, own ? 1.07 : 1.1, own ? -0.5 : -0.53);
            m.rotation.z = (((x * 13.7) % 1) - 0.5) * 0.1;
            scene.add(m);
            ticketMeshes.push(m);
          };
          const mineX = STATION_X[st] ?? 0.15;
          list.slice(0, 9).forEach((text, i) => {
            const x = -2.8 + i * 0.68;
            if (mineLabel && Math.abs(x - mineX) < 0.3) return;
            hang(text, x, false);
          });
          if (mineLabel) hang(mineLabel, mineX, true);
        };

        // The guest's name over their item, as an HTML label that follows it.
        const tag = document.createElement('div');
        Object.assign(tag.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          pointerEvents: 'none',
          font: '700 12px "Geist", sans-serif',
          color: '#1C1410',
          background: '#FFB04A',
          padding: '6px 10px',
          borderRadius: '999px',
          boxShadow: '0 6px 20px rgba(255,120,40,.45)',
          whiteSpace: 'nowrap',
          transition: 'opacity .3s',
          opacity: '0',
        } satisfies Partial<CSSStyleDeclaration>);
        el.appendChild(tag);

        const camPos = new THREE.Vector3(...CAMS.pass.pos);
        const camLook = new THREE.Vector3(...CAMS.pass.look);
        const wantPos = new THREE.Vector3();
        const wantLook = new THREE.Vector3();
        const v = new THREE.Vector3();
        let first = true;

        return {
          update: (t, dt) => {
            const { station: st, mine: me, tickets: list } = live.current;
            doner.update(t, dt);
            kip.update(t, dt);
            g.update(t, dt);
            p.update(t, dt);
            o.update(t, dt);
            sticks.forEach((s, i) => {
              s.group.rotation.x = Math.sin(t * 0.5 + i * 1.7) * 0.2;
            });
            hangTickets(list, me ? me.label.split(' · ')[0] : null, st);

            // The guest's skewer: the kind they ordered, browning as the minutes pass.
            const want: SkewerKind = me && me.kind !== 'spit' && me.kind !== 'pizza' && me.kind !== 'burger' ? me.kind : 'adana';
            if (want !== myStick.kind) {
              g.group.remove(myStick.s.group);
              myStick.s = skewer(want, 1.2);
              myStick.kind = want;
              myStick.s.group.position.copy(g.slots[2]).add(new THREE.Vector3(0.05, 0.035, 0));
              g.group.add(myStick.s.group);
            }
            myStick.s.cook(me && st === 'grill' ? me.cook : 0.6);
            myStick.s.group.rotation.x = Math.sin(t * 0.8) * 0.15;

            // Where the guest's item is: the middle skewer, a spit, the plancha or the pizza on the peel.
            let anchor: THREE.Object3D = myStick.s.group;
            if (st === 'spit') anchor = me?.kind === 'spit' && me.label.toLowerCase().includes('kip') ? kip.group : doner.group;
            if (st === 'oven') anchor = o.pizza;
            if (st === 'plancha' || st === 'fryer') anchor = p.group;
            anchor.getWorldPosition(v);
            ring.position.set(v.x, (st === 'grill' ? v.y - 0.02 : st === 'spit' ? -0.83 : v.y + 0.02), v.z);
            ring.visible = !!me && st !== 'pass' && st !== 'cold';
            const pulse = 1 + Math.sin(t * 4) * 0.12;
            ring.scale.setScalar((st === 'spit' ? 1.6 : st === 'oven' ? 1.1 : st === 'grill' ? 1.4 : 2.2) * pulse);

            const cam = CAMS[st];
            wantPos.set(...cam.pos);
            wantLook.set(...cam.look);
            if (first) {
              camPos.copy(wantPos);
              camLook.copy(wantLook);
              first = false;
            }
            camPos.lerp(wantPos, Math.min(1, dt * 1.6));
            camLook.lerp(wantLook, Math.min(1, dt * 1.6));
            camera.position.copy(camPos).add(new THREE.Vector3(Math.sin(t * 0.7) * 0.03, Math.sin(t * 0.9) * 0.02, 0));
            camera.lookAt(camLook);
            faceCamera(scene, camera);

            if (me && st !== 'pass' && st !== 'cold') {
              anchor.getWorldPosition(v);
              v.y += st === 'spit' ? 0.9 : 0.2;
              v.project(camera);
              tag.textContent = me.label;
              tag.style.opacity = v.z < 1 ? '1' : '0';
              tag.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight}px)`;
            } else tag.style.opacity = '0';
          },
          dispose: () => tag.remove(),
        };
      }}
    />
  );
}
