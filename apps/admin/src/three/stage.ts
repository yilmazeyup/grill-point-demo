import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export type Vec = [number, number, number];

/** What a hover tooltip in a scene shows: a bold first line, a detail line that may contain <br>, and an optional hint. */
export type Tip = { title: string; detail: string; hint?: string };

export type StageOptions = {
  camera: Vec;
  target: Vec;
  /** Where the camera flies in from when the scene mounts. */
  intro: Vec;
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  /** How far the camera may tilt, in radians from straight above. */
  minPolarAngle?: number;
  maxPolarAngle?: number;
  /** How far the camera may turn around the scene, in radians; unlimited when left out. */
  minAzimuthAngle?: number;
  maxAzimuthAngle?: number;
  /** Narrowest width-to-height ratio at which everything still fits; narrower views zoom out. */
  fitAspect?: number;
  /** How far the idle camera sways from side to side, in radians. */
  sway?: number;
};

export type Frame = (time: number, delta: number) => void;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A click, not a drag: the pointer moved less than this many pixels between press and release. */
const CLICK_SLOP = 6;

/** Whether an object and everything above it is shown; hidden figures are not hit by the pointer. */
function shown(object: THREE.Object3D | null): boolean {
  for (let o = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

/**
 * One WebGL view: renderer, camera, studio light, a bloom pass that lets embers and fire glow, HTML labels and a slow
 * camera sway. Scenes add their meshes to `scene` and register per-frame work with `onFrame`. It sleeps while the tab
 * is hidden or the view is scrolled away.
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly labels = new CSS2DRenderer();
  private readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  private readonly frames = new Set<Frame>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly resizeObserver: ResizeObserver;
  private readonly visibility: IntersectionObserver;
  private readonly started = performance.now();
  private last = performance.now();
  private raf = 0;
  private visible = true;

  // Camera choreography: a fly-in, then a gentle sway until someone grabs the view.
  private flight: { from: THREE.Vector3; to: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; start: number; duration: number } | null;
  private readonly sway = { base: new THREE.Spherical(), since: 0, paused: true, resumeAt: 0, amount: 0.2 };
  /** While true the camera stays where it is, e.g. while a card in the scene is being read. */
  private still = false;

  private hoverTargets: THREE.Object3D[] = [];
  private hoverHandler: ((object: THREE.Object3D | null) => void) | null = null;
  private selectHandler: ((object: THREE.Object3D | null) => void) | null = null;
  private clickable: ((object: THREE.Object3D) => boolean) | null = null;
  private hovered: THREE.Object3D | null = null;
  private pointerDirty = false;
  private pointerInside = false;
  private press: { x: number; y: number; at: number } | null = null;

  private readonly fitAspect: number;

  constructor(readonly host: HTMLElement, options: StageOptions) {
    this.fitAspect = options.fitAspect ?? 0;
    this.sway.amount = options.sway ?? 0.2;
    this.camera = new THREE.PerspectiveCamera(options.fov ?? 30, 1, 0.1, 200);
    this.camera.position.set(...options.intro);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.scene.background = new THREE.Color('#110C0A');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.domElement.className = 'scene-canvas';
    host.appendChild(this.renderer.domElement);

    this.labels.domElement.className = 'scene-labels';
    host.appendChild(this.labels.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(...options.target);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;
    this.controls.minDistance = options.minDistance ?? 7;
    this.controls.maxDistance = options.maxDistance ?? 26;
    this.controls.minPolarAngle = options.minPolarAngle ?? 0.3;
    this.controls.maxPolarAngle = options.maxPolarAngle ?? 1.22;
    if (options.minAzimuthAngle !== undefined) this.controls.minAzimuthAngle = options.minAzimuthAngle;
    if (options.maxAzimuthAngle !== undefined) this.controls.maxAzimuthAngle = options.maxAzimuthAngle;
    this.controls.enabled = false;
    this.controls.addEventListener('start', () => {
      this.sway.paused = true;
      this.flight = null;
    });
    this.controls.addEventListener('end', () => {
      this.sway.resumeAt = performance.now() + 6000;
    });

    const to = new THREE.Vector3(...options.camera);
    const target = new THREE.Vector3(...options.target);
    this.flight = this.reducedMotion
      ? null
      : { from: this.camera.position.clone(), to, fromTarget: target.clone(), toTarget: target, start: performance.now(), duration: 1900 };
    if (this.reducedMotion) {
      this.camera.position.copy(to);
      this.finishFlight();
    }

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.visibility = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
    });
    this.visibility.observe(host);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
    this.raf = requestAnimationFrame(this.loop);
  }

  onFrame(frame: Frame): () => void {
    this.frames.add(frame);
    return () => this.frames.delete(frame);
  }

  /** Floating HTML that follows a point in the scene. */
  label(element: HTMLElement, parent: THREE.Object3D, position: Vec): CSS2DObject {
    const object = new CSS2DObject(element);
    object.position.set(...position);
    parent.add(object);
    return object;
  }

  setHoverTargets(targets: THREE.Object3D[], handler: (object: THREE.Object3D | null) => void) {
    this.hoverTargets = targets;
    this.hoverHandler = handler;
    this.pointerDirty = true;
  }

  /**
   * Calls back on a click or tap that is not a drag: the hover target under the pointer when `clickable` says it
   * can be clicked, otherwise null (empty space). Only clickable targets get the hand cursor.
   */
  onSelect(handler: (object: THREE.Object3D | null) => void, clickable: (object: THREE.Object3D) => boolean) {
    this.selectHandler = handler;
    this.clickable = clickable;
  }

  /** Moves the camera and its focus point smoothly, e.g. to zoom in on one client. */
  flyTo(position: Vec, target: Vec, duration = 1400) {
    this.sway.paused = true;
    this.flight = {
      from: this.camera.position.clone(),
      to: new THREE.Vector3(...position),
      fromTarget: this.controls.target.clone(),
      toTarget: new THREE.Vector3(...target),
      start: performance.now(),
      duration: this.reducedMotion ? 1 : duration,
    };
  }

  /** Where the camera is going (or is, when it is not moving) and what it looks at. */
  pose(): { position: Vec; target: Vec } {
    const position = this.flight ? this.flight.to : this.camera.position;
    const target = this.flight ? this.flight.toTarget : this.controls.target;
    return { position: position.toArray() as Vec, target: target.toArray() as Vec };
  }

  /** Keeps the camera still (no idle sway) while something in the scene is being read; false lets it sway again. */
  hold(still: boolean) {
    this.still = still;
    if (still) {
      this.sway.paused = true;
      this.sway.resumeAt = 0;
    } else if (!this.flight && !this.reducedMotion) {
      this.sway.resumeAt = performance.now() + 4000;
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.resizeObserver.disconnect();
    this.visibility.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    this.controls.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments || object instanceof THREE.Sprite) {
        object.geometry.dispose();
        const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial || m instanceof THREE.SpriteMaterial) m.map?.dispose();
          m.dispose();
        });
      }
    });
    this.scene.environment?.dispose();
    this.composer.dispose();
    this.renderer.dispose();
    canvas.remove();
    this.labels.domElement.remove();
  }

  private finishFlight() {
    this.flight = null;
    this.controls.enabled = true;
    this.captureSway();
  }

  private captureSway() {
    this.sway.base.setFromVector3(this.camera.position.clone().sub(this.controls.target));
    this.sway.since = performance.now();
    this.sway.paused = this.reducedMotion || this.still;
  }

  /** Matches the canvas and camera to the host's size; runs on its own when the host resizes. */
  resize() {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    this.labels.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.zoom = this.fitAspect ? Math.min(1, this.camera.aspect / this.fitAspect) : 1;
    this.camera.updateProjectionMatrix();
  }

  private toPointer(event: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private onVisibility = () => {
    this.last = performance.now();
  };

  private onPointerMove = (event: PointerEvent) => {
    this.toPointer(event);
    this.pointerDirty = true;
    this.pointerInside = true;
  };

  private onPointerLeave = () => {
    this.pointerInside = false;
    this.pointerDirty = true;
  };

  private onPointerDown = (event: PointerEvent) => {
    this.press = { x: event.clientX, y: event.clientY, at: performance.now() };
  };

  private onPointerUp = (event: PointerEvent) => {
    const press = this.press;
    this.press = null;
    if (!press || !this.selectHandler) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > CLICK_SLOP || performance.now() - press.at > 700) return;
    this.toPointer(event);
    const object = this.hit();
    this.selectHandler(object && (!this.clickable || this.clickable(object)) ? object : null);
  };

  /** The registered target under the pointer, if any; walks up from the mesh that was hit. */
  private hit(): THREE.Object3D | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const hit of this.raycaster.intersectObjects(this.hoverTargets, true)) {
      if (!shown(hit.object)) continue;
      let object: THREE.Object3D | null = hit.object;
      while (object && !this.hoverTargets.includes(object)) object = object.parent;
      if (object) return object;
    }
    return null;
  }

  private pick() {
    if (this.pointerDirty && this.hoverHandler) {
      this.pointerDirty = false;
      const found = this.pointerInside ? this.hit() : null;
      if (found !== this.hovered) {
        this.hovered = found;
        this.hoverHandler(found);
      }
    }
    // What can be clicked changes with time (a client arrives), so the cursor is checked every frame.
    const cursor = this.hovered && (!this.clickable || this.clickable(this.hovered)) ? 'pointer' : '';
    const style = this.renderer.domElement.style;
    if (style.cursor !== cursor) style.cursor = cursor;
  }

  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden) {
      this.last = now;
      return;
    }
    const delta = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const time = (now - this.started) / 1000;

    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / this.flight.duration);
      const k = easeInOut(t);
      this.camera.position.lerpVectors(this.flight.from, this.flight.to, k);
      this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, k);
      this.camera.lookAt(this.controls.target);
      if (t >= 1) this.finishFlight();
    } else {
      if (this.sway.paused && !this.reducedMotion && !this.still && this.sway.resumeAt && now > this.sway.resumeAt) {
        this.sway.resumeAt = 0;
        this.captureSway();
      }
      if (!this.sway.paused) {
        const s = (now - this.sway.since) / 1000;
        const spherical = this.sway.base.clone();
        spherical.theta += Math.sin(s * 0.11) * this.sway.amount;
        spherical.phi += Math.sin(s * 0.07) * 0.035;
        this.camera.position.setFromSpherical(spherical).add(this.controls.target);
      }
      this.controls.update();
    }

    this.pick();
    for (const frame of this.frames) frame(time, delta);
    this.composer.render(delta);
    this.labels.render(this.scene, this.camera);
  };
}

/** Smoothly moves `current` toward `target`; frame-rate independent. */
export const damp = (current: number, target: number, lambda: number, delta: number) =>
  THREE.MathUtils.damp(current, target, lambda, delta);

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function el(className: string, html = ''): HTMLDivElement {
  const div = document.createElement('div');
  div.className = className;
  div.innerHTML = html;
  return div;
}
