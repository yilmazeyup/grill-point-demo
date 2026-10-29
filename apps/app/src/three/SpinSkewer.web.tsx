import { useRef } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { useTheme } from '../state/theme';
import { Canvas3D } from './Canvas3D';
import { faceCamera, flames, skewer } from './kitchen';

/**
 * Draai de spies: a skewer spins on the round table like a bottle, between everyone's plates, and stops pointing at
 * whoever pays. `spin` counts the turns asked for; `onStop` gets the index of the chosen name.
 */
export function SpinSkewer({ names, spin, onStop, style }: { names: string[]; spin: number; onStop: (index: number) => void; style?: StyleProp<ViewStyle> }) {
  const { mode } = useTheme();
  const night = mode === 'night';
  const live = useRef({ spin, onStop, names });
  live.current = { spin, onStop, names };
  return (
    <Canvas3D
      style={style}
      deps={[night, names.join(',')]}
      fov={36}
      setup={({ scene, camera, el, renderer }) => {
        renderer.toneMappingExposure = night ? 1.2 : 1.1;
        scene.add(new THREE.HemisphereLight(night ? 0x8a5a40 : 0xfff3e0, night ? 0x0a0604 : 0x9a8670, night ? 0.6 : 1.3));
        const lamp = new THREE.SpotLight(0xffd2a0, night ? 30 : 18, 8, 0.7, 0.5, 1.6);
        lamp.position.set(0, 4, 0.6);
        lamp.castShadow = true;
        scene.add(lamp);
        const wood = new THREE.MeshStandardMaterial({ color: 0xb98a58, roughness: 0.55 });
        const top = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.08, 72), wood);
        top.receiveShadow = true;
        top.position.y = -0.04;
        scene.add(top);
        const rimGlow = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: 0xff6a2a }));
        rimGlow.rotation.x = Math.PI / 2;
        scene.add(rimGlow);
        const n = Math.max(2, live.current.names.length);
        const plates: THREE.Mesh[] = [];
        const labels: HTMLDivElement[] = [];
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.03, 40), new THREE.MeshStandardMaterial({ color: 0xf6efe6, roughness: 0.35, emissive: 0x000000 }));
          plate.position.set(Math.cos(a) * 1.22, 0.015, Math.sin(a) * 1.22);
          plate.castShadow = true;
          scene.add(plate);
          plates.push(plate);
          const tag = document.createElement('div');
          tag.textContent = live.current.names[i] ?? '';
          Object.assign(tag.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            pointerEvents: 'none',
            font: '800 15px "Big Shoulders Display", Impact, sans-serif',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: '#FFF6EC',
            background: 'rgba(17,12,10,0.7)',
            padding: '5px 12px',
            borderRadius: '999px',
            transition: 'background .3s, transform .1s',
            whiteSpace: 'nowrap',
          } satisfies Partial<CSSStyleDeclaration>);
          el.appendChild(tag);
          labels.push(tag);
        }
        const stick = skewer('kofte', 1.5);
        stick.cook(0.8);
        const spinner = new THREE.Group();
        stick.group.position.set(0.12, 0.06, 0);
        spinner.add(stick.group);
        // A little flame at the tip shows where it points.
        const tip = flames(3, 0.04, 0.04, 0.22);
        tip.group.position.set(0.9, 0.04, 0);
        spinner.add(tip.group);
        scene.add(spinner);

        let angle = 0;
        let speed = 0;
        let asked = live.current.spin;
        let target: number | null = null;
        let winner = -1;
        const v = new THREE.Vector3();
        return {
          update: (t, dt) => {
            tip.update(t, dt);
            if (live.current.spin !== asked) {
              asked = live.current.spin;
              winner = -1;
              // Pick the winner now and spin so it ends there, with a few full turns for drama.
              const pickIndex = Math.floor(Math.random() * n);
              const end = -(pickIndex / n) * Math.PI * 2;
              const turns = 5 + Math.floor(Math.random() * 3);
              target = angle + turns * Math.PI * 2 + (((end - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
              speed = 1;
            }
            if (target !== null) {
              const left = target - angle;
              const step = Math.max(0.002, left * Math.min(1, dt * 1.6));
              angle = left < 0.003 ? target : angle + step;
              if (angle === target) {
                target = null;
                speed = 0;
                const a = ((-angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                winner = Math.round((a / (Math.PI * 2)) * n) % n;
                live.current.onStop(winner);
              }
            } else if (!speed) angle += Math.sin(t * 0.8) * 0.0015;
            spinner.rotation.y = angle;
            plates.forEach((p, i) => {
              const m = p.material as THREE.MeshStandardMaterial;
              m.emissive.setHex(i === winner ? 0xff5a1e : 0x000000);
              m.emissiveIntensity = i === winner ? 0.6 + Math.sin(t * 6) * 0.3 : 0;
            });
            camera.position.set(0, 4.3, 3.1);
            camera.lookAt(0, 0, 0.1);
            faceCamera(scene, camera);
            plates.forEach((p, i) => {
              v.copy(p.position);
              v.y += 0.12;
              v.multiplyScalar(1.02);
              v.project(camera);
              labels[i].style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * el.clientWidth}px, ${((1 - v.y) / 2) * el.clientHeight}px) scale(${i === winner ? 1.25 : 1})`;
              labels[i].style.background = i === winner ? '#E0321B' : 'rgba(17,12,10,0.7)';
            });
          },
          dispose: () => labels.forEach((l) => l.remove()),
        };
      }}
    />
  );
}
