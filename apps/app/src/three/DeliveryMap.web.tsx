import { AREAS, rng, type AreaId } from '@grill/shared';
import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { tr } from '../i18n';
import { useTheme } from '../state/theme';
import { Canvas3D } from './Canvas3D';

/**
 * The ride home in 3D: a model of Valkenswaard in blocks (a made-up street grid, not a real map), Grill-Point's flame
 * at the Willibrorduslaan, the route lit up, and the courier's scooter riding it as the minutes pass.
 */
export function DeliveryMap({ area, progress, courier, style }: { area: AreaId; progress: number; courier: string; style?: StyleProp<ViewStyle> }) {
  const { mode } = useTheme();
  const night = mode === 'night';
  const live = useRef({ progress });
  live.current = { progress };
  return (
    <Canvas3D
      style={style}
      deps={[night, area]}
      fov={38}
      alpha={false}
      setup={({ scene, camera, el, renderer }) => {
        renderer.toneMappingExposure = night ? 1.2 : 1.1;
        scene.background = new THREE.Color(night ? 0x0f0b09 : 0xeadfcf);
        scene.fog = new THREE.Fog(scene.background, 9, 22);
        scene.add(new THREE.HemisphereLight(night ? 0x6070a0 : 0xfff3e0, night ? 0x100806 : 0xa89580, night ? 0.45 : 1.3));
        const sun = new THREE.DirectionalLight(night ? 0x8090c0 : 0xfff2e0, night ? 0.4 : 1.4);
        sun.position.set(4, 8, 3);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = sun.shadow.camera.bottom = -10;
        sun.shadow.camera.right = sun.shadow.camera.top = 10;
        scene.add(sun);

        const S = 2.4; // grid units per map unit
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: night ? 0x1a1411 : 0xd9ccb8, roughness: 1 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);
        // Streets every 1.2 units, a little darker than the blocks.
        const road = new THREE.MeshStandardMaterial({ color: night ? 0x2a221e : 0xc4b6a2, roughness: 0.95 });
        for (let i = -8; i <= 8; i++) {
          const a = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 20), road);
          a.rotation.x = -Math.PI / 2;
          a.position.set(i * 1.2, 0.002, 0);
          const b = a.clone();
          b.rotation.z = Math.PI / 2;
          b.position.set(0, 0.003, i * 1.2);
          scene.add(a, b);
        }
        // Houses: brick-coloured blocks with pitched roofs in each block, lit windows at night.
        const r = rng(`map-${area}`);
        const wall = new THREE.MeshStandardMaterial({ color: night ? 0x4a2c22 : 0xb5694a, roughness: 0.85 });
        const roof = new THREE.MeshStandardMaterial({ color: night ? 0x1c1614 : 0x3b302c, roughness: 0.8 });
        const win = new THREE.MeshBasicMaterial({ color: 0xffc070 });
        const houseGeo = new THREE.BoxGeometry(0.34, 0.32, 0.4);
        const roofGeo = new THREE.ConeGeometry(0.3, 0.2, 4);
        roofGeo.rotateY(Math.PI / 4);
        for (let gx = -7; gx < 7; gx++)
          for (let gz = -7; gz < 7; gz++) {
            const cx = gx * 1.2 + 0.6;
            const cz = gz * 1.2 + 0.6;
            if (Math.hypot(cx, cz) < 0.9) continue;
            for (let k = 0; k < 4; k++) {
              if (r() < 0.25) continue;
              const h = new THREE.Group();
              const body = new THREE.Mesh(houseGeo, wall);
              body.position.y = 0.16;
              body.castShadow = true;
              const top = new THREE.Mesh(roofGeo, roof);
              top.position.y = 0.42;
              top.scale.set(1.15, 1, 1.35);
              h.add(body, top);
              if (night && r() < 0.6) {
                const w = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), win);
                w.position.set(0, 0.18, 0.201);
                h.add(w);
              }
              h.position.set(cx + (k % 2 ? 0.22 : -0.22), 0, cz + (k < 2 ? 0.2 : -0.2));
              h.rotation.y = (k % 2) * Math.PI;
              scene.add(h);
            }
          }
        // Grill-Point: a red-and-white corner shop with a flame beacon.
        const shop = new THREE.Group();
        const shopBody = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.36, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6 }));
        shopBody.position.y = 0.18;
        const awning = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.2), new THREE.MeshStandardMaterial({ color: 0xe0321b, emissive: 0x401000 }));
        awning.position.set(0, 0.3, 0.3);
        const beacon = new THREE.PointLight(0xff6a2a, 3, 3, 1.5);
        beacon.position.set(0, 0.9, 0);
        const flameGeo = new THREE.ConeGeometry(0.12, 0.36, 16);
        const flame = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xff5a1e }));
        flame.position.y = 0.75;
        shop.add(shopBody, awning, beacon, flame);
        scene.add(shop);

        // The route: out of the shop, along the streets, to the guest's area.
        const a = AREAS.find((x) => x.id === area) ?? AREAS[0];
        const end = new THREE.Vector3(Math.round((a.x * S) / 1.2) * 1.2, 0, Math.round((-a.y * S) / 1.2) * 1.2);
        if (end.length() < 1) end.set(2.4, 0, -1.2);
        const pts = [new THREE.Vector3(0, 0, 0.6), new THREE.Vector3(0, 0, 0), new THREE.Vector3(end.x, 0, 0), new THREE.Vector3(end.x, 0, end.z)];
        const path = new THREE.CurvePath<THREE.Vector3>();
        for (let i = 0; i < pts.length - 1; i++) path.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
        const tube = new THREE.Mesh(new THREE.TubeGeometry(path as unknown as THREE.Curve<THREE.Vector3>, 120, 0.05, 8), new THREE.MeshBasicMaterial({ color: 0xff6a2a, transparent: true, opacity: 0.85 }));
        tube.position.y = 0.02;
        scene.add(tube);
        const home = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24), new THREE.MeshBasicMaterial({ color: 0xffb04a }));
        home.position.copy(end).setY(0.03);
        scene.add(home);
        const homePin = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffb04a, emissive: 0x663300 }));
        homePin.position.copy(end).setY(0.5);
        scene.add(homePin);

        // The scooter: a body, two wheels, the rider with a red box on the back.
        const scooter = new THREE.Group();
        const red = new THREE.MeshStandardMaterial({ color: 0xe0321b, roughness: 0.5 });
        const dark = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 });
        const deck = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.12), red);
        deck.position.y = 0.1;
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), red);
        box.position.set(-0.12, 0.26, 0);
        const rider = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.14, 4, 8), dark);
        rider.position.set(0.02, 0.28, 0);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }));
        head.position.set(0.04, 0.43, 0);
        for (const x of [-0.13, 0.14]) {
          const w = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 8, 16), dark);
          w.position.set(x, 0.06, 0);
          scooter.add(w);
        }
        const lamp = new THREE.SpotLight(0xfff0c0, night ? 2.5 : 0, 2.5, 0.5, 0.6);
        lamp.position.set(0.18, 0.15, 0);
        lamp.target.position.set(1, 0, 0);
        scooter.add(deck, box, rider, head, lamp, lamp.target);
        scooter.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.castShadow = true;
        });
        scene.add(scooter);

        const tag = document.createElement('div');
        tag.textContent = `${courier} · ${tr('onderweg')}`;
        Object.assign(tag.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          pointerEvents: 'none',
          font: '700 12px "Geist", sans-serif',
          color: '#FFF6EC',
          background: '#E0321B',
          padding: '5px 10px',
          borderRadius: '999px',
          whiteSpace: 'nowrap',
          boxShadow: '0 6px 18px rgba(224,50,27,.45)',
        } satisfies Partial<CSSStyleDeclaration>);
        el.appendChild(tag);
        const homeTag = document.createElement('div');
        homeTag.textContent = tr('Thuis');
        Object.assign(homeTag.style, { ...tag.style, background: '#FFB04A', color: '#1C1410', boxShadow: 'none' });
        el.appendChild(homeTag);
        const shopTag = document.createElement('div');
        shopTag.textContent = 'Grill-Point';
        Object.assign(shopTag.style, { ...tag.style, background: '#1C1410', boxShadow: 'none' });
        el.appendChild(shopTag);

        const v = new THREE.Vector3();
        const place = (div: HTMLDivElement, at: THREE.Vector3) => {
          v.copy(at).project(camera);
          div.style.transform = `translate(-50%, -140%) translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight}px)`;
        };
        const camAt = new THREE.Vector3();
        return {
          update: (t) => {
            const k = Math.max(0, Math.min(1, live.current.progress));
            const at = path.getPointAt(k);
            const ahead = path.getPointAt(Math.min(1, k + 0.01));
            scooter.position.copy(at);
            scooter.position.y = Math.abs(Math.sin(t * 14)) * 0.008;
            if (ahead.distanceTo(at) > 1e-4) scooter.rotation.y = Math.atan2(-(ahead.z - at.z), ahead.x - at.x);
            flame.scale.set(1 + Math.sin(t * 9) * 0.06, 1 + Math.sin(t * 7) * 0.1, 1);
            beacon.intensity = 2.6 + Math.sin(t * 8) * 0.4;
            homePin.position.y = 0.5 + Math.sin(t * 2) * 0.06;
            // The camera rides along above, looking at the scooter and the way home.
            const focus = at.clone().lerp(end, 0.35);
            camAt.lerp(focus, 0.05);
            if (camAt.lengthSq() === 0) camAt.copy(focus);
            camera.position.set(camAt.x + 2.2, 4.6, camAt.z + 4.4);
            camera.lookAt(camAt);
            place(tag, at.clone().setY(0.55));
            place(homeTag, end.clone().setY(0.7));
            place(shopTag, new THREE.Vector3(0, 1.0, 0));
          },
          dispose: () => {
            tag.remove();
            homeTag.remove();
            shopTag.remove();
          },
        };
      }}
    />
  );
}
