import type { StyleProp, ViewStyle } from 'react-native';
import * as THREE from 'three';

import { useTheme } from '../state/theme';
import { Canvas3D } from './Canvas3D';
import { faceCamera, grill, skewer, type SkewerKind } from './kitchen';

/**
 * The opening scene of the home screen: the charcoal grill seen from low and close, four skewers searing over glowing
 * coals, sparks and smoke rising. The camera drifts slowly and leans toward the finger or the mouse.
 */
export function HeroGrill({ style }: { style?: StyleProp<ViewStyle> }) {
  const { mode } = useTheme();
  const night = mode === 'night';
  return (
    <Canvas3D
      style={style}
      deps={[night]}
      fov={34}
      setup={({ scene, camera, el, renderer }) => {
        renderer.toneMappingExposure = night ? 1.1 : 1.0;
        scene.fog = new THREE.Fog(night ? 0x110c0a : 0xf4ece0, 3.2, 7.5);
        scene.add(new THREE.HemisphereLight(night ? 0x6a4030 : 0xfff3e2, night ? 0x080504 : 0xb8a48e, night ? 0.35 : 1.4));
        const key = new THREE.DirectionalLight(night ? 0xffb080 : 0xfff6ea, night ? 0.35 : 1.5);
        key.position.set(-2, 3, 2);
        key.castShadow = true;
        scene.add(key);
        const g = grill(2.0, 0.7);
        scene.add(g.group);
        const kinds: SkewerKind[] = ['adana', 'sis', 'kofte', 'adana', 'vleugel'];
        const sticks = kinds.map((k, i) => {
          const s = skewer(k, 1.5);
          s.group.position.copy(g.slots[i]).add(new THREE.Vector3(0.05, 0.03, 0.05));
          s.cook(0.55 + i * 0.08);
          g.group.add(s.group);
          return s;
        });
        const target = new THREE.Vector3(0, -0.02, 0.05);
        const lean = { x: 0, y: 0 };
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          lean.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
          lean.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        };
        window.addEventListener('pointermove', onMove);
        return {
          update: (t, dt) => {
            g.update(t, dt);
            sticks.forEach((s, i) => {
              s.group.rotation.x = Math.sin(t * 0.6 + i) * 0.25;
            });
            const a = Math.sin(t * 0.12) * 0.35 + lean.x * 0.18;
            camera.position.set(Math.sin(a) * 1.75, 1.55 - lean.y * 0.12, Math.cos(a) * 1.75);
            camera.lookAt(target);
            faceCamera(scene, camera);
          },
          dispose: () => window.removeEventListener('pointermove', onMove),
        };
      }}
    />
  );
}
