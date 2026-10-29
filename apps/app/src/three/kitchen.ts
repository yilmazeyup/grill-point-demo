import * as THREE from 'three';

/**
 * Grill-Point's kitchen in code: a charcoal grill with skewers, a döner spit turning before its burner, the pizza oven,
 * the plancha with smash burgers, and the fire itself (glowing coals, flames, sparks, smoke). Everything is drawn from
 * shapes and shaders made here; no models or textures are downloaded.
 */

export type Updater = (t: number, dt: number) => void;

// ---------------------------------------------------------------------------------------------------------- textures

function canvasTexture(size: number, paint: (ctx: CanvasRenderingContext2D, s: number) => void, repeat = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  paint(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Seared meat: browns and dark crust with fat streaks and char lines. */
export function meatTexture(base: [number, number, number] = [138, 68, 38], char = 0.6, lines = true) {
  return canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = `rgb(${base.join(',')})`;
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2600; i++) {
        const v = Math.random();
        const k = 0.55 + v * 0.7;
        ctx.fillStyle = `rgba(${Math.round(base[0] * k)},${Math.round(base[1] * k)},${Math.round(base[2] * k)},0.55)`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 6, 1 + Math.random() * 3);
      }
      for (let i = 0; i < 220; i++) {
        ctx.fillStyle = `rgba(30,12,6,${0.25 * char + Math.random() * 0.3 * char})`;
        ctx.beginPath();
        ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (lines) {
        ctx.strokeStyle = `rgba(22,9,4,${0.75 * char})`;
        ctx.lineWidth = 7;
        for (let x = -s; x < s * 2; x += 44) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x + s * 0.5, s);
          ctx.stroke();
        }
      }
    },
    true,
  );
}

/** Layers of döner meat on the spit: thin bands of brown, crust and a little fat. */
function spitTexture(chicken: boolean) {
  return canvasTexture(
    512,
    (ctx, s) => {
      const base = chicken ? [196, 132, 70] : [126, 60, 34];
      for (let y = 0; y < s; y += 3) {
        const k = 0.75 + Math.random() * 0.5;
        ctx.fillStyle = `rgb(${Math.round(base[0] * k)},${Math.round(base[1] * k)},${Math.round(base[2] * k)})`;
        ctx.fillRect(0, y, s, 3);
      }
      for (let i = 0; i < 900; i++) {
        const dark = Math.random() < 0.6;
        ctx.fillStyle = dark ? `rgba(40,16,6,${0.35 + Math.random() * 0.4})` : `rgba(240,200,150,${0.2 + Math.random() * 0.25})`;
        ctx.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 14, 1 + Math.random() * 3);
      }
      // A freshly cut, lighter strip on one side.
      const g = ctx.createLinearGradient(0, 0, s, 0);
      g.addColorStop(0.0, 'rgba(255,220,180,0)');
      g.addColorStop(0.08, 'rgba(255,220,180,0.25)');
      g.addColorStop(0.22, 'rgba(255,220,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    true,
  );
}

/** A soft puff for smoke sprites: one round, feathered cloud, so it never shows edges. */
function puffTexture() {
  return canvasTexture(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

/** Pizza: tomato, mozzarella, toppings and a crust that browns at the rim. */
export function pizzaTexture(toppings: 'margherita' | 'sucuk' | 'doner' | 'pepperoni' = 'sucuk') {
  return canvasTexture(512, (ctx, s) => {
    const c = s / 2;
    ctx.fillStyle = '#C98B4A';
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    const crust = ctx.createRadialGradient(c, c, c * 0.82, c, c, c);
    crust.addColorStop(0, '#D9A05A');
    crust.addColorStop(0.6, '#B8742F');
    crust.addColorStop(1, '#6B3A16');
    ctx.fillStyle = crust;
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B5281A';
    ctx.beginPath();
    ctx.arc(c, c, c * 0.84, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * c * 0.72;
      ctx.fillStyle = `rgba(250,236,200,${0.75 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(c + Math.cos(a) * r, c + Math.sin(a) * r, 18 + Math.random() * 26, 14 + Math.random() * 20, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const dots = toppings === 'margherita' ? 0 : 16;
    for (let i = 0; i < dots; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * c * 0.68;
      const x = c + Math.cos(a) * r;
      const y = c + Math.sin(a) * r;
      if (toppings === 'doner') {
        ctx.fillStyle = '#7A3B1C';
        ctx.fillRect(x - 14, y - 5, 28, 10);
      } else {
        ctx.fillStyle = toppings === 'sucuk' ? '#8E2318' : '#A82A1B';
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(60,10,5,0.35)';
        ctx.beginPath();
        ctx.arc(x + 3, y + 3, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = 'rgba(60,110,40,0.8)';
      ctx.fillRect(c + (Math.random() - 0.5) * c * 1.4, c + (Math.random() - 0.5) * c * 1.4, 3, 3);
    }
  });
}

// ---------------------------------------------------------------------------------------------------------- shaders

const NOISE = /* glsl */ `
float hash(vec3 p){p=fract(p*0.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.0;float a=0.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=0.5;}return v;}
`;

/** Charcoal that glows from inside where the noise says so, breathing slowly. */
function coalMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos; varying vec3 vNormal; varying float vSeed;
      void main(){
        vec4 world = modelMatrix * instanceMatrix * vec4(position,1.0);
        vPos = world.xyz; vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vSeed = instanceMatrix[3].x * 7.1 + instanceMatrix[3].z * 3.3;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uHeat;
      varying vec3 vPos; varying vec3 vNormal; varying float vSeed;
      ${NOISE}
      void main(){
        float n = fbm(vPos*9.0 + vec3(0.0, uTime*0.35, vSeed));
        float cracks = smoothstep(0.42, 0.7, n);
        float breathe = 0.65 + 0.35*sin(uTime*1.3 + vSeed);
        float glow = cracks * breathe * uHeat;
        float light = clamp(dot(vNormal, normalize(vec3(0.3,1.0,0.4)))*0.5+0.5, 0.0, 1.0);
        vec3 coal = vec3(0.055,0.045,0.04) * (0.5+light*0.7);
        vec3 ash = vec3(0.32,0.30,0.29) * smoothstep(0.62,0.9, noise(vPos*24.0)) * (1.0-cracks);
        vec3 ember = mix(vec3(0.85,0.12,0.02), vec3(1.0,0.62,0.18), cracks*breathe);
        vec3 col = coal + ash*0.6 + ember*glow*2.2;
        gl_FragColor = vec4(col,1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/** A flame as a billboard: rising noise, white-gold at the root, red at the tips. */
function flameMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSeed: { value: Math.random() * 10 }, uPower: { value: 1 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uSeed; uniform float uPower; varying vec2 vUv;
      ${NOISE}
      void main(){
        vec2 uv = vUv; uv.x -= 0.5;
        float n = fbm(vec3(uv.x*3.0, uv.y*2.2 - uTime*2.4, uSeed + uTime*0.4));
        float width = (1.0 - uv.y) * 0.42 + 0.02;
        float shape = smoothstep(width, width*0.25, abs(uv.x + (n-0.5)*0.35*uv.y));
        float body = shape * smoothstep(1.0, 0.15, uv.y + n*0.35) * smoothstep(0.0, 0.08, uv.y);
        vec3 col = mix(vec3(1.0,0.86,0.5), vec3(1.0,0.35,0.06), smoothstep(0.1,0.55,uv.y));
        col = mix(col, vec3(0.75,0.08,0.02), smoothstep(0.5,0.95,uv.y));
        gl_FragColor = vec4(col * body * 1.4 * uPower, body * uPower);
      }`,
  });
}

// ---------------------------------------------------------------------------------------------------------- pieces

/** A bed of glowing charcoal in a box of `w` × `d`. */
export function coals(w: number, d: number, count = 140): { mesh: THREE.InstancedMesh; update: Updater; heat: (v: number) => void } {
  // A lumpy chunk: each corner pushed in or out by a value that depends only on where it is, so the faces that share
  // it stay joined.
  const geo = new THREE.IcosahedronGeometry(0.06, 1);
  const pos = geo.attributes.position;
  const bump = (x: number, y: number, z: number) => {
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return 0.78 + (h - Math.floor(h)) * 0.42;
  };
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    v.multiplyScalar(bump(Math.round(v.x * 1000), Math.round(v.y * 1000), Math.round(v.z * 1000)));
    pos.setXYZ(i, v.x * 1.15, v.y * 0.62, v.z);
  }
  geo.computeVertexNormals();
  const mat = coalMaterial();
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < count; i++) {
    q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
    const s = 0.7 + Math.random() * 0.6;
    m.compose(new THREE.Vector3((Math.random() - 0.5) * w, Math.random() * 0.05, (Math.random() - 0.5) * d), q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
  }
  return {
    mesh,
    update: (t) => {
      mat.uniforms.uTime.value = t;
    },
    heat: (v) => {
      mat.uniforms.uHeat.value = v;
    },
  };
}

/** Rising sparks: additive points that drift up from `origin` over an area. */
export function sparks(count: number, origin: THREE.Vector3, spread: THREE.Vector3, height = 1.2): { points: THREE.Points; update: Updater } {
  const geo = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * spread.x;
    p[i * 3 + 1] = Math.random();
    p[i * 3 + 2] = (Math.random() - 0.5) * spread.z;
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeight: { value: height }, uSize: { value: 26 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uHeight; uniform float uSize; attribute float seed; varying float vLife;
      void main(){
        float life = fract(position.y + uTime*(0.18 + seed*0.25));
        vLife = life;
        vec3 p = position;
        p.y = life*uHeight;
        p.x += sin(uTime*2.0 + seed*20.0)*0.05*life + sin(life*6.0+seed*9.0)*0.06;
        p.z += cos(uTime*1.7 + seed*13.0)*0.04*life;
        vec4 mv = modelViewMatrix * vec4(p,1.0);
        gl_PointSize = uSize * (0.4+seed*0.8) * (1.0-life) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main(){
        float d = length(gl_PointCoord-0.5);
        float a = smoothstep(0.5,0.0,d) * (1.0-vLife);
        vec3 col = mix(vec3(1.0,0.85,0.45), vec3(1.0,0.3,0.05), vLife);
        gl_FragColor = vec4(col*a*1.6, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.position.copy(origin);
  points.frustumCulled = false;
  return {
    points,
    update: (t) => {
      mat.uniforms.uTime.value = t;
    },
  };
}

/** Flames licking up between the grate bars. */
export function flames(n: number, w: number, d: number, h = 0.32): { group: THREE.Group; update: Updater; power: (v: number) => void } {
  const group = new THREE.Group();
  const mats: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < n; i++) {
    const mat = flameMaterial();
    mats.push(mat);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.16 + Math.random() * 0.12, h * (0.6 + Math.random() * 0.8)), mat);
    plane.position.set((Math.random() - 0.5) * w, 0, (Math.random() - 0.5) * d);
    plane.geometry.translate(0, (plane.geometry.parameters.height as number) / 2, 0);
    plane.userData.billboard = true;
    group.add(plane);
  }
  let pw = 1;
  return {
    group,
    update: (t) => {
      for (const m of mats) {
        m.uniforms.uTime.value = t;
        m.uniforms.uPower.value = pw;
      }
    },
    power: (v) => {
      pw = v;
    },
  };
}

/** Turns billboards in `root` to face the camera around the vertical axis. */
export function faceCamera(root: THREE.Object3D, camera: THREE.Camera) {
  const p = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.userData.billboard) return;
    o.getWorldPosition(p);
    o.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  });
}

/** Smoke puffs that rise, widen and fade. */
export function smoke(count: number, origin: THREE.Vector3, spread = 0.6, tint = 0x8a7f78, rise = 1.4): { group: THREE.Group; update: Updater } {
  const tex = puffTexture();
  const group = new THREE.Group();
  group.position.copy(origin);
  const items: { s: THREE.Sprite; seed: number }[] = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, color: tint, transparent: true, depthWrite: false, opacity: 0 });
    const s = new THREE.Sprite(mat);
    group.add(s);
    items.push({ s, seed: Math.random() });
  }
  return {
    group,
    update: (t) => {
      for (const { s, seed } of items) {
        const life = (t * 0.09 + seed) % 1;
        s.position.set(Math.sin(seed * 40 + t * 0.3) * spread * 0.5 + (seed - 0.5) * spread, life * rise, Math.cos(seed * 17) * spread * 0.3 - life * 0.3);
        const size = 0.3 + life * 1.1;
        s.scale.set(size, size, 1);
        (s.material as THREE.SpriteMaterial).opacity = Math.sin(life * Math.PI) * 0.16;
        (s.material as THREE.SpriteMaterial).rotation = seed * 6 + t * 0.1;
      }
    },
  };
}

const steel = () => new THREE.MeshStandardMaterial({ color: 0x8c8f93, metalness: 0.9, roughness: 0.32 });
const darkSteel = () => new THREE.MeshStandardMaterial({ color: 0x2b2a2a, metalness: 0.75, roughness: 0.5 });

export type SkewerKind = 'adana' | 'sis' | 'kofte' | 'vleugel' | 'pirzola';

/** One flat skewer with meat on it. `cook` (0..1) browns it. */
export function skewer(kind: SkewerKind, length = 0.9): { group: THREE.Group; cook: (v: number) => void; meat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(length, 0.006, 0.022), steel());
  group.add(blade);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), darkSteel());
  handle.position.x = -length / 2 - 0.04;
  group.add(handle);
  const raw = kind === 'sis' || kind === 'vleugel' ? new THREE.Color(0xe8b48a) : new THREE.Color(0xa8443a);
  const done = kind === 'sis' || kind === 'vleugel' ? new THREE.Color(0xb86a2c) : new THREE.Color(0x5b2814);
  const meat = new THREE.MeshStandardMaterial({ map: meatTexture(kind === 'sis' || kind === 'vleugel' ? [214, 150, 92] : [150, 70, 44], 0.7), color: raw.clone(), roughness: 0.62, metalness: 0 });
  const mL = length * 0.78;
  if (kind === 'adana') {
    const g = new THREE.CapsuleGeometry(0.034, mL, 6, 14);
    g.rotateZ(Math.PI / 2);
    // The ridges a chef presses in with the fingers.
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const k = 1 + Math.sin(x * 70) * 0.07;
      pos.setY(i, pos.getY(i) * k * 0.82);
      pos.setZ(i, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, meat);
    m.castShadow = true;
    group.add(m);
  } else if (kind === 'kofte') {
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), meat);
      m.scale.set(1.25, 0.7, 1);
      m.position.x = -mL / 2 + (i + 0.5) * (mL / 5);
      m.castShadow = true;
      group.add(m);
    }
  } else if (kind === 'sis') {
    const pepper = new THREE.MeshStandardMaterial({ color: 0x3f8a2a, roughness: 0.5 });
    const onion = new THREE.MeshStandardMaterial({ color: 0xc9a0b0, roughness: 0.5 });
    for (let i = 0; i < 9; i++) {
      const veg = i % 3 === 2;
      const geo = veg ? new THREE.BoxGeometry(0.025, 0.06, 0.07) : new THREE.BoxGeometry(0.06, 0.055, 0.065, 2, 2, 2);
      if (!veg) {
        const pos = geo.attributes.position;
        for (let j = 0; j < pos.count; j++) pos.setXYZ(j, pos.getX(j) * (0.9 + Math.random() * 0.2), pos.getY(j) * (0.9 + Math.random() * 0.2), pos.getZ(j) * (0.9 + Math.random() * 0.2));
        geo.computeVertexNormals();
      }
      const m = new THREE.Mesh(geo, veg ? (i % 2 ? pepper : onion) : meat);
      m.position.x = -mL / 2 + (i + 0.5) * (mL / 9);
      m.rotation.x = Math.random() * 0.4;
      m.castShadow = true;
      group.add(m);
    }
  } else if (kind === 'vleugel') {
    for (let i = 0; i < 4; i++) {
      const g = new THREE.CapsuleGeometry(0.028, 0.07, 4, 10);
      const m = new THREE.Mesh(g, meat);
      m.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
      m.rotation.y = 0.5;
      m.position.x = -mL / 2 + (i + 0.5) * (mL / 4);
      m.castShadow = true;
      group.add(m);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.bezierCurveTo(0.06, -0.02, 0.1, 0.03, 0.09, 0.07);
      shape.bezierCurveTo(0.07, 0.1, 0.02, 0.09, 0, 0.05);
      shape.lineTo(-0.08, 0.035);
      shape.lineTo(-0.08, 0.02);
      shape.lineTo(0, 0);
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 });
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, meat);
      m.position.set(-mL / 2 + (i + 0.5) * (mL / 3), 0, 0.04);
      m.castShadow = true;
      group.add(m);
    }
  }
  return {
    group,
    meat,
    cook: (v) => {
      meat.color.copy(raw).lerp(done, Math.max(0, Math.min(1, v)));
    },
  };
}

/** The charcoal grill: a steel trough with coals, a grate, flames, sparks and smoke. */
export function grill(width = 1.6, depth = 0.6): { group: THREE.Group; update: Updater; slots: THREE.Vector3[]; heat: (v: number) => void } {
  const group = new THREE.Group();
  const body = darkSteel();
  const wall = 0.025;
  const h = 0.32;
  const parts: [number, number, number, number, number, number][] = [
    [width, wall, depth, 0, -h / 2, 0],
    [width, h, wall, 0, 0, depth / 2],
    [width, h, wall, 0, 0, -depth / 2],
    [wall, h, depth, width / 2, 0, 0],
    [wall, h, depth, -width / 2, 0, 0],
  ];
  for (const [w, hh, d, x, y, z] of parts) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), body);
    m.position.set(x, y, z);
    m.receiveShadow = true;
    group.add(m);
  }
  const legGeo = new THREE.BoxGeometry(0.04, 0.7, 0.04);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(legGeo, body);
    leg.position.set((x * width) / 2.1, -0.5, (z * depth) / 2.2);
    group.add(leg);
  }
  // The lumps stay clear of the walls and the floor, so none pokes through the steel.
  const bed = coals(width - 0.24, depth - 0.24, Math.round(width * depth * 300));
  bed.mesh.position.y = -h / 2 + 0.085;
  group.add(bed.mesh);
  // Grate: thin bars across the width.
  const bar = steel();
  for (let i = 0; i < 16; i++) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, depth, 6), bar);
    r.rotation.x = Math.PI / 2;
    r.position.set(-width / 2 + 0.05 + (i * (width - 0.1)) / 15, h / 2 - 0.04, 0);
    group.add(r);
  }
  const fire = flames(Math.round(width * 9), width - 0.2, depth - 0.2, 0.3);
  fire.group.position.y = -h / 2 + 0.06;
  group.add(fire.group);
  const sp = sparks(140, new THREE.Vector3(0, -0.05, 0), new THREE.Vector3(width, 0, depth), 1.4);
  group.add(sp.points);
  const sm = smoke(12, new THREE.Vector3(0, 0.15, 0), width * 0.6);
  group.add(sm.group);
  const glow = new THREE.PointLight(0xff6a2a, 3.2, 3.2, 1.6);
  glow.position.set(0, 0.05, 0);
  group.add(glow);
  const slots = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(0, h / 2 - 0.01, -depth / 2 + 0.08 + (i * (depth - 0.16)) / 5));
  let heat = 1;
  return {
    group,
    slots,
    heat: (v) => {
      heat = v;
      bed.heat(v);
      fire.power(v);
    },
    update: (t, dt) => {
      bed.update(t, dt);
      fire.update(t, dt);
      sp.update(t, dt);
      sm.update(t, dt);
      glow.intensity = (2.6 + Math.sin(t * 9.0) * 0.35 + Math.sin(t * 23.0) * 0.2) * heat;
    },
  };
}

/** A vertical döner spit turning in front of its burner, with a slicing knife now and then. */
export function spit(chicken = false): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group();
  const profile: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const y = i / 20;
    const r = 0.11 + Math.sin(y * Math.PI) * 0.06 + (1 - y) * 0.05;
    profile.push(new THREE.Vector2(r, y * 0.75));
  }
  const tex = spitTexture(chicken);
  tex.repeat.set(3, 1);
  const cone = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, color: 0xffffff }));
  cone.castShadow = true;
  group.add(cone);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.05, 8), steel());
  rod.position.y = 0.4;
  group.add(rod);
  const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.03, 32), steel());
  tray.position.y = -0.03;
  group.add(tray);
  // The burner behind: a panel of glowing ceramic.
  const burnerMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; ${NOISE}
      void main(){ vec2 g = fract(vUv*vec2(6.0,14.0)); float cell = smoothstep(0.0,0.12,g.x)*smoothstep(0.0,0.12,g.y)*smoothstep(1.0,0.88,g.x)*smoothstep(1.0,0.88,g.y);
        float n = noise(vec3(vUv*8.0, uTime*0.6)); vec3 hot = mix(vec3(0.9,0.18,0.03), vec3(1.0,0.55,0.15), n);
        gl_FragColor = vec4(mix(vec3(0.08,0.05,0.04), hot*1.6, cell*(0.75+0.25*sin(uTime*3.0+vUv.y*9.0))),1.0);
        #include <colorspace_fragment>
      }`,
  });
  const burner = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.8), burnerMat);
  burner.position.set(0, 0.38, -0.3);
  group.add(burner);
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.92, 0.06), darkSteel());
  housing.position.set(0, 0.38, -0.34);
  group.add(housing);
  const light = new THREE.PointLight(0xff5a1e, 1.6, 1.4, 1.5);
  light.position.set(0, 0.4, -0.18);
  group.add(light);
  const knife = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.22, 0.05), steel());
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 }));
  grip.position.y = 0.16;
  knife.add(blade, grip);
  knife.position.set(0.2, 0.4, 0.12);
  group.add(knife);
  return {
    group,
    update: (t) => {
      cone.rotation.y = t * 0.35;
      burnerMat.uniforms.uTime.value = t;
      light.intensity = 1.5 + Math.sin(t * 6) * 0.15;
      const cut = (t % 6) / 6;
      const active = cut < 0.4;
      knife.visible = active;
      if (active) knife.position.y = 0.62 - (cut / 0.4) * 0.45;
    },
  };
}

/** The pizza oven: a domed oven with fire inside and a pizza on the peel sliding in and out. */
export function oven(): { group: THREE.Group; update: Updater; pizza: THREE.Mesh } {
  const group = new THREE.Group();
  const brick = new THREE.MeshStandardMaterial({ color: 0x7a3a24, roughness: 0.9 });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), brick);
  dome.scale.set(1, 0.72, 1);
  group.add(dome);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.7, 0.4, 40), new THREE.MeshStandardMaterial({ color: 0x2a201c, roughness: 0.85 }));
  base.position.y = -0.2;
  group.add(base);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.22, 32, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x150805 }));
  mouth.position.set(0, 0.0, 0.615);
  group.add(mouth);
  const fire = flames(7, 0.28, 0.1, 0.24);
  fire.group.position.set(-0.05, 0.0, 0.5);
  group.add(fire.group);
  const glow = new THREE.PointLight(0xff7a2a, 2.4, 2.2, 1.6);
  glow.position.set(0, 0.12, 0.75);
  group.add(glow);
  const pizza = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.015, 40), [
    new THREE.MeshStandardMaterial({ color: 0xc58a4a, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ map: pizzaTexture('sucuk'), roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xc58a4a, roughness: 0.8 }),
  ]);
  const peel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.008, 0.36), new THREE.MeshStandardMaterial({ color: 0xb08860, roughness: 0.7 }));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.7 }));
  stick.rotation.x = Math.PI / 2;
  stick.position.z = 0.6;
  const peelGroup = new THREE.Group();
  peelGroup.add(peel, stick, pizza);
  pizza.position.y = 0.012;
  group.add(peelGroup);
  return {
    group,
    pizza,
    update: (t, dt) => {
      fire.update(t, dt);
      glow.intensity = 2.2 + Math.sin(t * 8) * 0.3;
      const c = (t % 10) / 10;
      const z = c < 0.2 ? 1.05 - c * 2.4 : c < 0.6 ? 0.57 : c < 0.8 ? 0.57 + (c - 0.6) * 2.4 : 1.05;
      peelGroup.position.set(0, -0.02, z);
    },
  };
}

/** The plancha with smash burgers that get pressed, flipped and topped with cheese. */
export function plancha(): { group: THREE.Group; update: Updater } {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a3836, metalness: 0.85, roughness: 0.35 }));
  group.add(plate);
  const patties: THREE.Mesh[] = [];
  const cheese: THREE.Mesh[] = [];
  const meat = new THREE.MeshStandardMaterial({ map: meatTexture([84, 40, 24], 1, false), roughness: 0.55 });
  const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xf0a02a, roughness: 0.3, emissive: 0x2a1000, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.025, 24), meat);
    p.position.set(-0.3 + i * 0.2, 0.035, (i % 2) * 0.12 - 0.06);
    p.castShadow = true;
    group.add(p);
    patties.push(p);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.008, 6), cheeseMat);
    c.position.copy(p.position).add(new THREE.Vector3(0, 0.017, 0));
    c.rotation.y = 0.6;
    group.add(c);
    cheese.push(c);
  }
  const sm = smoke(8, new THREE.Vector3(0, 0.05, 0), 0.6, 0xb0a8a0);
  group.add(sm.group);
  return {
    group,
    update: (t, dt) => {
      sm.update(t, dt);
      patties.forEach((p, i) => {
        const phase = (t * 0.2 + i * 0.25) % 1;
        p.scale.y = phase < 0.1 ? 1.6 - phase * 6 : 1;
        cheese[i].visible = phase > 0.55;
        cheese[i].scale.y = 1;
      });
    },
  };
}

/** A warm, dark kitchen backdrop: tiled wall, stainless counter and soft lights. */
export function kitchenRoom(night: boolean): THREE.Group {
  const room = new THREE.Group();
  const tile = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = night ? '#2a201c' : '#e9e1d6';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = night ? 'rgba(0,0,0,0.55)' : 'rgba(120,100,90,0.35)';
      ctx.lineWidth = 3;
      for (let y = 0; y <= s; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(s, y);
        ctx.stroke();
      }
      for (let y = 0; y < s; y += 32)
        for (let x = (y / 32) % 2 ? 0 : 32; x <= s; x += 64) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 32);
          ctx.stroke();
        }
    },
    true,
  );
  tile.repeat.set(6, 3);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.8 }));
  wall.position.set(0, 1.2, -1.2);
  room.add(wall);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 2.4), new THREE.MeshStandardMaterial({ color: night ? 0x5a5653 : 0xb8b4ae, metalness: 0.7, roughness: 0.35 }));
  counter.position.set(0, -0.9, 0);
  counter.receiveShadow = true;
  room.add(counter);
  room.add(new THREE.HemisphereLight(night ? 0x7a5040 : 0xfff1e0, night ? 0x140a06 : 0x8a7a6a, night ? 0.85 : 1.3));
  const key = new THREE.DirectionalLight(night ? 0xffc8a0 : 0xfff6ea, night ? 0.9 : 1.6);
  key.position.set(1.5, 3, 2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  room.add(key);
  return room;
}
