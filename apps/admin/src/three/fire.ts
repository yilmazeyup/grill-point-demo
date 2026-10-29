import * as THREE from 'three';

/**
 * Fire for the kitchen: sparks over the charcoal, flames licking up from the grill and the oven, smoke drawn into the
 * hood. Each is one draw call (points with a small shader), so a few hundred particles cost next to nothing.
 */

export type EmitterOptions = {
  count: number;
  /** Where particles are born: a box around `origin`. */
  origin: THREE.Vector3;
  spread: THREE.Vector3;
  /** Upward speed and sideways drift, in units per second. */
  rise: [number, number];
  drift: number;
  life: [number, number];
  size: [number, number];
  /** Colours from birth to death. */
  from: THREE.Color;
  to: THREE.Color;
  opacity: number;
  additive: boolean;
  /** Soft round puff (smoke) or a hot core (sparks, flames). */
  soft?: boolean;
  /** Growth over a life, 1 keeps the size. */
  grow?: number;
  /** Upward pull towards the top of the hood: particles above this height fade out. */
  ceiling?: number;
};

const VERTEX = /* glsl */ `
  attribute float aAge;
  attribute float aSize;
  uniform float uScale;
  uniform float uGrow;
  varying float vAge;
  void main() {
    vAge = aAge;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * mix(1.0, uGrow, aAge) * uScale / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uFrom;
  uniform vec3 uTo;
  uniform float uOpacity;
  uniform float uSoft;
  varying float vAge;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0;
    if (d > 1.0) discard;
    float core = uSoft > 0.5 ? smoothstep(1.0, 0.0, d) * 0.9 : pow(1.0 - d, 2.2);
    float fade = smoothstep(0.0, 0.12, vAge) * (1.0 - smoothstep(0.55, 1.0, vAge));
    vec3 colour = mix(uFrom, uTo, vAge);
    gl_FragColor = vec4(colour, core * fade * uOpacity);
  }
`;

export class Emitter {
  readonly points: THREE.Points;
  private readonly material: THREE.ShaderMaterial;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly ages: Float32Array;
  private readonly lives: Float32Array;
  private readonly sizes: Float32Array;
  /** 0 stops new particles (the ones in the air finish their life), 1 is full strength. */
  rate = 1;

  constructor(private readonly o: EmitterOptions) {
    const n = o.count;
    this.positions = new Float32Array(n * 3);
    this.velocities = new Float32Array(n * 3);
    this.ages = new Float32Array(n);
    this.lives = new Float32Array(n);
    this.sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      this.spawn(i);
      // Spread the first generation over their lives, so the fire does not start in one puff.
      this.ages[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aAge', new THREE.BufferAttribute(this.ages, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uFrom: { value: o.from.clone() },
        uTo: { value: o.to.clone() },
        uOpacity: { value: o.opacity },
        uSoft: { value: o.soft ? 1 : 0 },
        uScale: { value: 300 },
        uGrow: { value: o.grow ?? 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = o.additive ? 3 : 2;
  }

  private spawn(i: number) {
    const { origin, spread, rise, drift, life, size } = this.o;
    this.positions[i * 3] = origin.x + (Math.random() - 0.5) * spread.x;
    this.positions[i * 3 + 1] = origin.y + (Math.random() - 0.5) * spread.y;
    this.positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * spread.z;
    this.velocities[i * 3] = (Math.random() - 0.5) * drift;
    this.velocities[i * 3 + 1] = rise[0] + Math.random() * (rise[1] - rise[0]);
    this.velocities[i * 3 + 2] = (Math.random() - 0.5) * drift;
    this.lives[i] = life[0] + Math.random() * (life[1] - life[0]);
    this.sizes[i] = size[0] + Math.random() * (size[1] - size[0]);
    this.ages[i] = 0;
  }

  /** The look for day or night: colours and strength. */
  tint(from: THREE.Color, to: THREE.Color, opacity: number) {
    this.material.uniforms.uFrom.value.copy(from);
    this.material.uniforms.uTo.value.copy(to);
    this.material.uniforms.uOpacity.value = opacity;
  }

  /** Pixels per metre at one metre away: sizes are given in metres. */
  setScale(pixels: number) {
    this.material.uniforms.uScale.value = pixels;
  }

  update(delta: number, time: number) {
    const n = this.o.count;
    const ceiling = this.o.ceiling ?? Infinity;
    for (let i = 0; i < n; i++) {
      this.ages[i] += delta / this.lives[i];
      if (this.ages[i] >= 1 || this.positions[i * 3 + 1] > ceiling) {
        if (Math.random() < this.rate) this.spawn(i);
        else {
          this.ages[i] = 1;
          continue;
        }
      }
      // A little turbulence: sparks dance, smoke curls.
      const wobble = Math.sin(time * 3.1 + i * 1.7) * 0.25;
      this.positions[i * 3] += (this.velocities[i * 3] + wobble * this.o.drift) * delta;
      this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * delta;
      this.positions[i * 3 + 2] += (this.velocities[i * 3 + 2] + Math.cos(time * 2.3 + i) * 0.12 * this.o.drift) * delta;
    }
    const geometry = this.points.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAge.needsUpdate = true;
  }
}

let seed = 11;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

/**
 * Glowing charcoal, drawn once: dark lumps with orange cracks. The same canvas lights the coals (emissive map) while the
 * scene breathes its intensity up and down.
 */
export function charcoalTextures(): { map: THREE.CanvasTexture; glow: THREE.CanvasTexture } {
  const w = 512;
  const h = 192;
  const base = document.createElement('canvas');
  base.width = w;
  base.height = h;
  const glow = document.createElement('canvas');
  glow.width = w;
  glow.height = h;
  const b = base.getContext('2d')!;
  const g = glow.getContext('2d')!;
  b.fillStyle = '#16100D';
  b.fillRect(0, 0, w, h);
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 6 + rand() * 16;
    const sides = 5 + Math.floor(rand() * 3);
    const lump = new Path2D();
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2 + rand() * 0.4;
      const rr = r * (0.7 + rand() * 0.4);
      if (k === 0) lump.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      else lump.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    lump.closePath();
    const shade = 18 + Math.floor(rand() * 26);
    b.fillStyle = `rgb(${shade + 6},${shade},${shade - 4})`;
    b.fill(lump);
    // The glowing seam around each lump, hotter in the middle of the bed.
    const heat = 1 - Math.abs(y / h - 0.5) * 1.4;
    g.strokeStyle = `rgba(255,${90 + Math.floor(rand() * 90)},${20 + Math.floor(rand() * 30)},${Math.max(0.15, heat)})`;
    g.lineWidth = 1.5 + rand() * 3;
    g.stroke(lump);
    if (rand() < 0.35 * heat) {
      g.fillStyle = `rgba(255,${120 + Math.floor(rand() * 80)},40,${0.35 + rand() * 0.4})`;
      g.fill(lump);
    }
  }
  const map = new THREE.CanvasTexture(base);
  map.colorSpace = THREE.SRGBColorSpace;
  const glowTexture = new THREE.CanvasTexture(glow);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return { map, glow: glowTexture };
}

/** Meat on the döner spit: browned, with darker grill marks, a little lighter for chicken. */
export function spitTexture(chicken: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, chicken ? '#C98B4A' : '#8A4A26');
  gradient.addColorStop(0.5, chicken ? '#B47436' : '#743A1C');
  gradient.addColorStop(1, chicken ? '#9C5F2C' : '#5E2D16');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const y = rand() * 256;
    ctx.strokeStyle = `rgba(${chicken ? '90,45,15' : '40,15,6'},${0.15 + rand() * 0.35})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(rand() * 256, y);
    ctx.lineTo(rand() * 256, y + (rand() - 0.5) * 6);
    ctx.stroke();
  }
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = `rgba(255,${chicken ? 200 : 150},${chicken ? 120 : 90},${rand() * 0.18})`;
    ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 8, 1 + rand() * 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A flickering light: a few sines out of step, never quite repeating. */
export const flicker = (time: number, phase = 0) =>
  0.78 + Math.sin(time * 7.3 + phase) * 0.08 + Math.sin(time * 13.1 + phase * 2.1) * 0.06 + Math.sin(time * 2.2 + phase * 0.7) * 0.08;
