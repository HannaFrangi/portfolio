"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import { textureFor, useQuality } from "@/lib/quality";
import { useTheme } from "@/lib/theme";
import { logoParts } from "../pieces";
import { FinishMaterial, clamp01, easeOutBack, motion, palette, pointer, rng, stainTexture, useSwatch } from "./kit";

export { LOGO_EYE_R, LOGO_EYES, logoParts, useReevuScreen } from "../pieces";

type V3 = [number, number, number];

/** Scale multiplier for a springy entrance `delay` seconds after the canvas starts. */
function pop(time: number, delay?: number) {
  if (delay === undefined || motion.reduced) return 1;
  return Math.max(0, easeOutBack(clamp01((time - delay) / 0.9)));
}

/* ----------------------------------------------------------------- leaves */

/** One ivy leaf: a pointed heart, flat, about 1 unit long. Shared by every leaf. */
let leafGeo: THREE.ShapeGeometry | null = null;
export function leafGeometry() {
  if (leafGeo) return leafGeo;
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.45, 0.1, 0.5, 0.55, 0, 1);
  s.bezierCurveTo(-0.5, 0.55, -0.45, 0.1, 0, 0);
  leafGeo = new THREE.ShapeGeometry(s, 8);
  return leafGeo;
}

function LeafMaterial({ color = palette.moss }: { color?: string }) {
  const c = useSwatch(color);
  return <meshStandardMaterial color={c} roughness={0.7} side={THREE.DoubleSide} />;
}

/** A small sprig: a curved stem with leaves alternating up it. `grow` (0..1) unfurls it. */
export function Sprig({
  leaves = 4,
  length = 1,
  color = palette.moss,
  grow,
  ...props
}: { leaves?: number; length?: number; color?: string; grow?: () => number } & ThreeElements["group"]) {
  const root = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const stem = useSwatch(palette.ivy);
  useFrame((state) => {
    const g = grow ? clamp01(grow()) : 1;
    const t = state.clock.elapsedTime;
    if (root.current) {
      root.current.scale.setScalar(Math.max(0.001, g));
      if (!motion.reduced) root.current.rotation.z = Math.sin(t * 1.3 + length * 3) * 0.06;
    }
    refs.current.forEach((m, i) => {
      if (!m) return;
      // Leaves open one after another as the sprig grows.
      const k = clamp01(g * (leaves + 1) - i);
      m.scale.setScalar(Math.max(0.001, easeOutBack(k)) * (0.22 - i * 0.015) * length);
    });
  });
  return (
    <group {...props}>
      <group ref={root}>
        <mesh position={[0, length / 2, 0]}>
          <cylinderGeometry args={[0.012 * length, 0.022 * length, length, 6]} />
          <meshStandardMaterial color={stem} roughness={0.9} />
        </mesh>
        {Array.from({ length: leaves }, (_, i) => {
          const side = i % 2 ? 1 : -1;
          return (
            <mesh
              key={i}
              ref={(m) => void (refs.current[i] = m)}
              geometry={leafGeometry()}
              position={[0, ((i + 1) / (leaves + 0.5)) * length, 0]}
              rotation={[0.3, side * 0.6, side * -1.05]}
            >
              <LeafMaterial color={color} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ rocks */

/**
 * A chunk of broken concrete: a faceted lump, mossy where it faces up. Faces are flat so
 * it reads as broken stone, not clay. Cached per seed and detail.
 */
const rockCache = new Map<string, THREE.BufferGeometry>();
export function rockGeometry(seed: number, moss = 0.5, detail = 1) {
  const key = `${seed}:${moss}:${detail}`;
  const hit = rockCache.get(key);
  if (hit) return hit;
  const r = rng(seed * 4099 + 11);
  // A slab, not a ball: squashed and stretched per seed.
  const stretch = new THREE.Vector3(1 + r() * 0.5, 0.6 + r() * 0.35, 0.85 + r() * 0.35);
  const cuts = Array.from({ length: 5 }, () => ({
    n: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
    d: 0.55 + r() * 0.3,
  }));
  const base = new THREE.IcosahedronGeometry(1, detail + 1);
  const p = base.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    // Plane cuts give the flat, fractured faces; a little hash noise keeps them uneven.
    for (const c of cuts) {
      const over = v.dot(c.n) - c.d;
      if (over > 0) v.addScaledVector(c.n, -over);
    }
    const h = Math.sin(v.x * 12.9 + v.y * 78.2 + v.z * 37.7 + seed) * 43758.5;
    v.multiplyScalar(1 + (h - Math.floor(h) - 0.5) * 0.08);
    v.multiply(stretch);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  const g = base.toNonIndexed();
  g.computeVertexNormals();
  // Colour per face: moss where the face looks up (and a little on the sides), stone below.
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const stone = new THREE.Color("#8e897b"), dark = new THREE.Color("#5c584f");
  const green = new THREE.Color(palette.moss), lichen = new THREE.Color(palette.lichen);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    const up = n.y;
    const jitter = r();
    if (up > 0.55 - moss * 0.5 + jitter * 0.2) col.copy(green).lerp(lichen, r() * 0.5);
    else col.copy(stone).lerp(dark, jitter * 0.6 + (up < -0.3 ? 0.3 : 0));
    for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (i + k) * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  rockCache.set(key, g);
  return g;
}

/** A floating mossy rock that bobs and turns slowly. Can pop in on load. */
export function Rock({
  seed,
  position,
  scale = 1,
  moss = 0.5,
  speed = 1,
  delay,
  sprig = false,
}: {
  seed: number;
  position: V3;
  scale?: number;
  moss?: number;
  speed?: number;
  delay?: number;
  /** A little plant growing out of the top. */
  sprig?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const low = useQuality() === "low";
  const dark = useTheme() === "dark";
  const geometry = useMemo(() => rockGeometry(seed, moss, low ? 1 : 2), [seed, moss, low]);
  useFrame((state) => {
    const m = g.current;
    if (!m) return;
    const time = state.clock.elapsedTime;
    m.scale.setScalar(Math.max(0.001, scale * pop(time, delay)));
    if (motion.reduced) return;
    const t = time * speed + seed;
    m.position.y = position[1] + Math.sin(t * 0.7) * 0.07;
    m.rotation.set(Math.sin(t * 0.25) * 0.15, t * 0.1, Math.cos(t * 0.2) * 0.1);
  });
  return (
    <group ref={g} position={position} scale={delay === undefined ? scale : 0.001}>
      <mesh geometry={geometry}>
        {/* vertex colours are the stone and moss; dusk darkens them through the colour */}
        <meshStandardMaterial vertexColors color={dark ? "#6f7570" : "#ffffff"} roughness={0.95} flatShading />
      </mesh>
      {sprig && <Sprig position={[0.1, 0.45, 0]} length={0.7} leaves={4} />}
    </group>
  );
}

/* ------------------------------------------------------------------- gear */

const gearCache = new Map<number, THREE.ExtrudeGeometry>();
function gearGeometry(teeth: number) {
  const hit = gearCache.get(teeth);
  if (hit) return hit;
  const s = new THREE.Shape();
  const outer = 1, inner = 0.8;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const step = (Math.PI * 2) / teeth;
    const pts: [number, number][] = [
      [inner, a0],
      [outer, a0 + step * 0.12],
      [outer, a0 + step * 0.45],
      [inner, a0 + step * 0.57],
    ];
    pts.forEach(([rad, a], k) => {
      const x = Math.cos(a) * rad, y = Math.sin(a) * rad;
      if (i === 0 && k === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.28, 0, Math.PI * 2, true);
  s.holes.push(hole);
  // Spokes: three windows cut between hub and rim.
  for (let k = 0; k < 4; k++) {
    const w = new THREE.Path();
    const a = (k / 4) * Math.PI * 2 + 0.3;
    w.absarc(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.14, 0, Math.PI * 2, true);
    s.holes.push(w);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2, curveSegments: 16 });
  g.center();
  gearCache.set(teeth, g);
  return g;
}

/** A rusted gear with moss on its rim, turning slowly as it floats. */
export function Gear({ position, scale = 1, teeth = 12, delay, spin = 0.15 }: { position: V3; scale?: number; teeth?: number; delay?: number; spin?: number }) {
  const g = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => gearGeometry(teeth), [teeth]);
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    if (g.current) {
      g.current.scale.setScalar(Math.max(0.001, scale * pop(time, delay)));
      if (!motion.reduced) g.current.position.y = position[1] + Math.sin(time * 0.6 + 2) * 0.08;
    }
    if (wheel.current && !motion.reduced) wheel.current.rotation.z += delta * spin;
  });
  return (
    <group ref={g} position={position} rotation={[0.25, -0.5, 0.1]} scale={delay === undefined ? scale : 0.001}>
      <mesh ref={wheel} geometry={geometry}>
        <FinishMaterial finish="rust" />
      </mesh>
      {/* moss and a fern caught on the top of the rim */}
      <mesh position={[0.35, 0.82, 0.08]} scale={[0.32, 0.14, 0.2]} geometry={rockGeometry(31, 1, 0)}>
        <FinishMaterial finish="moss" />
      </mesh>
      <mesh position={[-0.6, 0.62, 0.1]} scale={[0.2, 0.1, 0.16]} geometry={rockGeometry(32, 1, 0)}>
        <FinishMaterial finish="moss" color={palette.lichen} />
      </mesh>
      <Sprig position={[0.25, 0.9, 0.1]} rotation-z={-0.3} length={0.55} leaves={3} />
    </group>
  );
}

/* --------------------------------------------------------------- vine ring */

/** In place of the chrome orbit rings: a loop of ivy with leaves along it and a spore riding it. */
export function VineRing({
  radius,
  tilt = [1.2, 0, 0.3],
  position = [0, 0, 0],
  speed = 0.25,
  phase = 0,
  leaves = 22,
}: {
  radius: number;
  tilt?: V3;
  position?: V3;
  speed?: number;
  phase?: number;
  leaves?: number;
}) {
  const rider = useRef<THREE.Group>(null);
  const stem = useSwatch(palette.ivy);
  const spots = useMemo(() => {
    const r = rng(radius * 1000 + leaves);
    return Array.from({ length: leaves }, (_, i) => {
      const a = (i / leaves) * Math.PI * 2 + r() * 0.2;
      return { a, flip: r() > 0.5 ? 1 : -1, s: 0.09 + r() * 0.07, tw: r() * Math.PI };
    });
  }, [radius, leaves]);
  useFrame((state) => {
    if (rider.current) rider.current.rotation.z = motion.reduced ? phase : state.clock.elapsedTime * speed + phase;
  });
  return (
    <group position={position} rotation={tilt}>
      <mesh>
        <torusGeometry args={[radius, 0.016, 8, 160]} />
        <meshStandardMaterial color={stem} roughness={0.9} />
      </mesh>
      {spots.map((l, i) => (
        <mesh
          key={i}
          geometry={leafGeometry()}
          position={[Math.cos(l.a) * radius, Math.sin(l.a) * radius, 0]}
          rotation={[l.tw, 0, l.a + (l.flip > 0 ? 0 : Math.PI)]}
          scale={l.s}
        >
          <LeafMaterial color={i % 3 ? palette.moss : palette.lichen} />
        </mesh>
      ))}
      <group ref={rider}>
        <mesh position={[radius, 0, 0]} scale={0.07}>
          <sphereGeometry args={[1, 16, 12]} />
          <FinishMaterial finish="glow" color={palette.spore} />
        </mesh>
      </group>
    </group>
  );
}

/* ----------------------------------------------------------------- spores */

let sporeSprite: THREE.CanvasTexture | null = null;
function sporeTexture() {
  if (sporeSprite) return sporeSprite;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.65)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  sporeSprite = new THREE.CanvasTexture(c);
  return sporeSprite;
}

/**
 * Drifting motes: golden pollen and dust in the daylight, glowing spores at dusk. They
 * float up slowly, sway, and lean away from the cursor. One draw call per field.
 */
export function Spores({
  count = 80,
  area = [10, 6, 4],
  size = 0.09,
  position = [0, 0, 0],
}: {
  count?: number;
  area?: V3;
  size?: number;
  position?: V3;
}) {
  const dark = useTheme() === "dark";
  const low = useQuality() === "low";
  const n = low ? Math.round(count * 0.5) : count;
  const points = useRef<THREE.Points>(null);
  const seeds = useMemo(() => {
    const r = rng(n * 17 + 3);
    return Array.from({ length: n }, () => ({
      x: (r() - 0.5) * area[0],
      y: (r() - 0.5) * area[1],
      z: (r() - 0.5) * area[2],
      rise: 0.05 + r() * 0.12,
      sway: r() * Math.PI * 2,
    }));
  }, [n, area]);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  useFrame((state) => {
    const pts = points.current;
    if (!pts) return;
    const p = pts.geometry.attributes.position as THREE.BufferAttribute;
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    const px = pointer.sx * area[0] * 0.5, py = pointer.sy * area[1] * 0.5;
    seeds.forEach((s, i) => {
      // Rise and wrap round, swaying side to side.
      let y = s.y + t * s.rise;
      y = ((((y + area[1] / 2) % area[1]) + area[1]) % area[1]) - area[1] / 2;
      let x = s.x + Math.sin(t * 0.5 + s.sway) * 0.25;
      // Lean away from the cursor, like air moving past a hand.
      const dx = x - px, dy = y - py;
      const d2 = dx * dx + dy * dy;
      const push = motion.reduced ? 0 : Math.exp(-d2 * 0.6) * 0.5;
      x += dx * push;
      y += dy * push;
      p.setXYZ(i, x, y, s.z);
    });
    p.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geometry} position={position} frustumCulled={false}>
      <pointsMaterial
        map={typeof document === "undefined" ? null : sporeTexture()}
        color={dark ? palette.spore : palette.gold}
        size={dark ? size * 1.4 : size}
        sizeAttenuation
        transparent
        opacity={dark ? 0.95 : 0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------- bird */

/** A small bird crossing the sky: the only other living thing in town. Wings flap, then glide. */
export function Bird(props: ThreeElements["group"]) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const dark = useTheme() === "dark";
  const color = dark ? "#1b2226" : "#3a3328";
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Bursts of flapping between glides.
    const flap = motion.reduced ? 0 : Math.sin(t * 14) * (Math.sin(t * 0.9) > -0.2 ? 0.7 : 0.08);
    if (left.current) left.current.rotation.x = flap;
    if (right.current) right.current.rotation.x = -flap;
  });
  const wing = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.quadraticCurveTo(0.5, 0.15, 1, -0.05);
    s.quadraticCurveTo(0.5, -0.05, 0, -0.25);
    return new THREE.ShapeGeometry(s, 6);
  }, []);
  return (
    <group {...props}>
      <mesh scale={[0.28, 0.1, 0.1]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <group ref={left} rotation-y={Math.PI / 2}>
        <mesh geometry={wing} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={right} rotation-y={-Math.PI / 2}>
        <mesh geometry={wing} rotation={[Math.PI / 2, 0, 0]}>
          <meshStandardMaterial color={color} roughness={0.8} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

/* ---------------------------------------------------------------- screens */

/** A device screen showing a full-page capture of the real site, scrolled by `scroll()`. */
function ScrollingScreen({
  src,
  texture: given,
  width,
  height,
  scroll,
}: {
  src?: string;
  texture?: THREE.Texture;
  width: number;
  height: number;
  scroll?: () => number;
}) {
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      {given ? (
        <ScreenMaterial texture={given} aspect={width / height} scroll={scroll} />
      ) : (
        <LoadedScreen src={src!} aspect={width / height} scroll={scroll} />
      )}
    </mesh>
  );
}

function LoadedScreen({ src, aspect, scroll }: { src: string; aspect: number; scroll?: () => number }) {
  const quality = useQuality();
  const texture = useTexture(textureFor(src, quality), (t) => {
    const tex = t as THREE.Texture;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  });
  return <ScreenMaterial texture={texture} aspect={aspect} scroll={scroll} />;
}

function ScreenMaterial({ texture, aspect, scroll }: { texture: THREE.Texture; aspect: number; scroll?: () => number }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const map = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    return t;
  }, [texture]);
  useFrame(() => {
    const m = material.current?.map;
    const img = m?.image as { width: number; height: number } | undefined;
    if (!m || !img) return;
    const imgAspect = img.width / img.height;
    if (imgAspect > aspect) {
      m.repeat.set(aspect / imgAspect, 1);
      m.offset.set((1 - m.repeat.x) / 2, 0);
    } else {
      const visible = imgAspect / aspect;
      const s = clamp01(scroll ? scroll() : 0);
      m.repeat.set(1, visible);
      m.offset.set(0, (1 - visible) * (1 - s));
    }
  });
  // Slightly warm and dimmed, like an old screen still running on a scavenged battery.
  return <meshBasicMaterial ref={material} map={map} color="#f3ead8" toneMapped={false} />;
}

/** A strip of duct tape: flat, a little crumpled, slightly see-through at the edges. */
function Tape({ w = 0.5, h = 0.16, ...props }: { w?: number; h?: number } & ThreeElements["mesh"]) {
  const c = useSwatch(palette.tape);
  return (
    <mesh {...props}>
      <boxGeometry args={[w, h, 0.012]} />
      <meshStandardMaterial color={c} roughness={0.55} metalness={0.15} />
    </mesh>
  );
}

type DeviceProps = { src?: string; texture?: THREE.Texture; scroll?: () => number } & ThreeElements["group"];

/** The casing: old paint over metal, chipped and stained. */
function Casing({ color = palette.stone }: { color?: string }) {
  return <FinishMaterial finish="paint" color={color} />;
}

export function Tablet({ src, texture, scroll, ...props }: DeviceProps) {
  const w = 3.2, h = 2.2;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.16]} radius={0.12} smoothness={4}>
        <Casing />
      </RoundedBox>
      <group position={[0, 0, 0.082]}>
        <ScrollingScreen src={src} texture={texture} width={w - 0.24} height={h - 0.24} scroll={scroll} />
      </group>
      {/* taped-up corners from a fall nobody fixed properly */}
      <Tape position={[-w / 2 + 0.12, h / 2 - 0.12, 0.09]} rotation-z={0.78} />
      <Tape position={[w / 2 - 0.15, -h / 2 + 0.1, 0.09]} rotation-z={-0.6} w={0.6} />
      <Sprig position={[w / 2 - 0.2, h / 2 - 0.05, 0.05]} rotation-z={-0.5} length={0.6} leaves={4} />
    </group>
  );
}

export function Phone({ src, scroll, ...props }: DeviceProps) {
  const w = 1.05, h = 2.18;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.13]} radius={0.14} smoothness={4}>
        <Casing color={palette.tin} />
      </RoundedBox>
      <group position={[0, 0, 0.067]}>
        <ScrollingScreen src={src} width={w - 0.12} height={h - 0.12} scroll={scroll} />
      </group>
      <Tape position={[0, h / 2 - 0.3, 0.072]} rotation-z={0.15} w={1.15} h={0.13} />
    </group>
  );
}

export function Laptop({ src, scroll, lean = -0.28, ...props }: DeviceProps & { lean?: number }) {
  const w = 3.3, d = 2.2;
  return (
    <group {...props}>
      <RoundedBox args={[w, 0.12, d]} radius={0.05} smoothness={3} position={[0, 0, d / 2]}>
        <Casing />
      </RoundedBox>
      <mesh position={[0, 0.062, d / 2 + 0.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w * 0.82, d * 0.48]} />
        <meshStandardMaterial color="#2a2722" roughness={0.9} />
      </mesh>
      <group position={[0, 0.05, 0]} rotation-x={lean}>
        <RoundedBox args={[w, d, 0.08]} radius={0.05} smoothness={3} position={[0, d / 2, 0]}>
          <Casing />
        </RoundedBox>
        <group position={[0, d / 2, 0.042]}>
          <mesh>
            <planeGeometry args={[w - 0.12, d - 0.12]} />
            <meshBasicMaterial color="#14130f" />
          </mesh>
          <group position={[0, 0, 0.001]}>
            <ScrollingScreen src={src} width={w - 0.3} height={d - 0.3} scroll={scroll} />
          </group>
        </group>
        <Tape position={[-w / 2 + 0.1, d - 0.1, 0.05]} rotation-z={0.8} />
        <Sprig position={[w / 2 - 0.1, d - 0.05, 0.03]} rotation-z={-0.7} length={0.7} leaves={5} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ robot */

/** Mutable drive for the robot, written by the scene each frame. */
export type RobotDrive = {
  walking: number;
  waving: number;
  lookX?: number;
  lookY?: number;
  /** 0 awake, 1 asleep: head droops, the lamp dims, slow breathing. */
  sleep?: number;
};

/**
 * A little robot built from what was lying around: a tin-can body in chipped teal paint,
 * a rusted dome head with one warm headlamp eye, bolt joints, and a sprout growing where
 * the antenna used to be. Walks and waves on cue.
 */
export function Robot({ drive, ...props }: { drive?: { current: RobotDrive } } & ThreeElements["group"]) {
  const arm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const lamp = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const walking = motion.reduced ? 0 : (drive?.current.walking ?? 0);
    const waving = motion.reduced ? 0 : (drive?.current.waving ?? 1);
    const stride = Math.sin(t * 10) * 0.55 * walking;
    if (legL.current) legL.current.rotation.x = stride;
    if (legR.current) legR.current.rotation.x = -stride;
    const sleep = drive?.current.sleep ?? 0;
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(t * 10)) * 0.06 * walking;
      // A slight list to one side: one leg is a little shorter than the other.
      body.current.rotation.z = 0.03 + Math.sin(t * 10) * 0.03 * walking;
      body.current.scale.y = 1 + Math.sin(t * 1.6) * 0.015 * sleep;
    }
    if (arm.current) arm.current.rotation.z = 0.25 + waving * (2.05 + Math.sin(t * 5) * 0.4) - stride * 0.4 * (1 - waving);
    const h = head.current;
    if (h && !motion.reduced) {
      const d = drive?.current;
      if (d?.lookX !== undefined) {
        h.rotation.y += (d.lookX * 0.7 * (1 - sleep) - h.rotation.y) * 0.12;
        h.rotation.x += ((d.lookY ?? 0) * -0.35 * (1 - sleep) + sleep * 0.45 - h.rotation.x) * 0.12;
      } else {
        h.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - walking);
      }
    }
    // The lamp flickers now and then, like a loose wire.
    if (lamp.current) {
      const flicker = Math.sin(t * 23) > 0.92 && Math.sin(t * 0.7) > 0.6 ? 0.3 : 1;
      lamp.current.emissiveIntensity = 2.2 * flicker * (1 - sleep * 0.9);
    }
  });
  const bolt = <FinishMaterial finish="rust" />;
  return (
    <group {...props}>
      {/* legs: pipe offcuts with tin-can feet */}
      {[-0.3, 0.3].map((x) => (
        <group key={x} ref={x < 0 ? legL : legR} position={[x, 0.72, 0]}>
          <mesh position={[0, -0.62, 0.05]}>
            <cylinderGeometry args={[0.22, 0.24, 0.2, 20]} />
            <FinishMaterial finish="rust" />
          </mesh>
          <mesh position={[0, -0.27, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.55, 12]} />
            <FinishMaterial finish="paint" color={palette.stone} />
          </mesh>
        </group>
      ))}
      <group ref={body}>
        {/* the tin can, with its ribs */}
        <mesh position={[0, 1.3, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 1.1, 32]} />
          <FinishMaterial finish="paint" color={palette.tin} />
        </mesh>
        {[0.95, 1.65].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.6, 0.03, 8, 40]} />
            {bolt}
          </mesh>
        ))}
        {/* a patch riveted over a dent */}
        <mesh position={[0.18, 1.25, 0.6]} rotation={[0, 0.25, 0.2]}>
          <boxGeometry args={[0.36, 0.3, 0.03]} />
          <FinishMaterial finish="rust" />
        </mesh>
        <mesh position={[-0.22, 1.42, 0.59]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          <FinishMaterial finish="glow" color={palette.gold} />
        </mesh>
        <group position={[-0.68, 1.6, 0]} rotation-z={-0.25}>
          <mesh position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <FinishMaterial finish="paint" color={palette.stone} />
          </mesh>
          <mesh position={[0, -0.72, 0]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            {bolt}
          </mesh>
        </group>
        <group ref={arm} position={[0.68, 1.6, 0]} rotation-z={2.3}>
          <mesh position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
            <FinishMaterial finish="paint" color={palette.stone} />
          </mesh>
          <mesh position={[0, -0.72, 0]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            {bolt}
          </mesh>
        </group>
        <group ref={head} position={[0, 2.18, 0]}>
          {/* a pot lid of a head: a rusted dome on a short neck */}
          <mesh scale={[1, 0.8, 1]}>
            <sphereGeometry args={[0.52, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <FinishMaterial finish="rust" />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.53, 0.5, 0.26, 32]} />
            <FinishMaterial finish="paint" color={palette.bone} />
          </mesh>
          {/* one big headlamp eye, glass over a warm bulb */}
          <mesh position={[0.05, 0, 0.48]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.2, 0.22, 0.1, 24]} />
            <FinishMaterial finish="rust" />
          </mesh>
          <mesh position={[0.05, 0, 0.54]}>
            <sphereGeometry args={[0.16, 24, 16]} />
            <meshStandardMaterial ref={lamp} color={palette.gold} emissive={palette.gold} emissiveIntensity={2.2} toneMapped={false} />
          </mesh>
          {/* the small spare eye, long dead */}
          <mesh position={[-0.28, 0.06, 0.42]}>
            <sphereGeometry args={[0.06, 16, 12]} />
            <meshStandardMaterial color="#2a2620" roughness={0.3} />
          </mesh>
          {/* a sprout where the antenna was */}
          <Sprig position={[-0.05, 0.36, 0]} length={0.65} leaves={3} />
        </group>
      </group>
    </group>
  );
}

/* ----------------------------------------------------------- robostars sign */

/**
 * The RoboStars logo as a salvaged sign: the brand's blue and orange, in worn enamel.
 * `assemble()` (0..1) flies the pieces in; once whole, the star turns and ivy grows on it.
 */
export function LogoBadge({ assemble, ...props }: { assemble: () => number } & ThreeElements["group"]) {
  const parts = useMemo(() => logoParts(), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const whole = useRef<THREE.Group>(null);
  useFrame((state) => {
    const a = motion.reduced ? 1 : clamp01(assemble());
    const t = state.clock.elapsedTime;
    parts.forEach((part, i) => {
      const m = refs.current[i];
      if (!m) return;
      const k = Math.max(0, easeOutBack(clamp01(a * 1.6 - i * 0.12)));
      const off = 1 - k;
      m.position.set(part.from[0] * off, part.from[1] * off, part.from[2] * off - 0.035);
      m.rotation.set(part.from[1] * off * 1.5, part.from[0] * off * 2, 0);
      m.visible = a > i * 0.075;
    });
    if (whole.current && !motion.reduced) {
      whole.current.position.y = Math.sin(t * 1.1) * 0.05;
      whole.current.rotation.y = Math.sin(t * 0.6) * 0.3;
    }
  });
  const grown = () => clamp01((assemble() - 0.9) * 10);
  return (
    <group {...props}>
      <group ref={whole}>
        {parts.map((part, i) => (
          <mesh key={i} ref={(m) => void (refs.current[i] = m)} geometry={part.geo}>
            <SignMaterial color={part.color} />
          </mesh>
        ))}
        <Sprig position={[-0.3, 0.18, 0.05]} rotation-z={0.9} length={0.4} leaves={4} grow={grown} />
        <Sprig position={[0.05, -0.45, 0.05]} rotation-z={-2.6} length={0.35} leaves={3} grow={grown} />
      </group>
    </group>
  );
}

/** Old enamel: the brand colour with rust blooming through it. */
export function SignMaterial({ color }: { color: string }) {
  const low = useQuality() === "low";
  const map = useMemo(() => (typeof document === "undefined" ? null : stainTextureFor(color)), [color]);
  if (low) return <meshStandardMaterial map={map} roughness={0.6} metalness={0.2} />;
  return <meshPhysicalMaterial map={map} roughness={0.5} metalness={0.2} clearcoat={0.4} clearcoatRoughness={0.5} />;
}

function stainTextureFor(color: string) {
  // A clone, so the repeat doesn't change the shared tile other materials use.
  const t = stainTexture(color, palette.rust, 13).clone();
  t.repeat.set(3, 3);
  t.needsUpdate = true;
  return t;
}
