"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import { textureFor, useQuality } from "@/lib/quality";
import {
  FinishMaterial,
  blobGeometry,
  bubbleMaterial,
  clamp01,
  easeOutBack,
  makeLiquidChrome,
  motion,
  type LiquidUniforms,
  palette,
  pointer,
  useDetail,
  type Finish,
} from "./kit";

type V3 = [number, number, number];

/** Scale multiplier for a springy entrance `delay` seconds after the canvas starts. */
function pop(time: number, delay?: number) {
  if (delay === undefined || motion.reduced) return 1;
  return Math.max(0, easeOutBack(clamp01((time - delay) / 0.9)));
}

/** A floating lump of chrome (or glass, or jelly). Bobs and turns slowly on its own clock. */
export function Blob({
  seed,
  position,
  scale = 1,
  color,
  finish = "chrome",
  amount = 0.22,
  speed = 1,
  delay,
}: {
  seed: number;
  position: V3;
  scale?: number;
  color?: string;
  finish?: Finish;
  amount?: number;
  speed?: number;
  delay?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const detail = useDetail();
  const geometry = useMemo(() => blobGeometry(seed, amount, detail.blob), [seed, amount, detail.blob]);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const time = state.clock.elapsedTime;
    m.scale.setScalar(scale * pop(time, delay));
    if (motion.reduced) return;
    const t = time * speed + seed;
    m.position.y = position[1] + Math.sin(t * 0.8) * 0.08;
    m.rotation.set(Math.sin(t * 0.3) * 0.25, t * 0.15, Math.cos(t * 0.25) * 0.2);
  });
  return (
    <mesh ref={mesh} geometry={geometry} position={position} scale={delay === undefined ? scale : 0}>
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

export function Sphere({
  position,
  scale = 1,
  color,
  finish = "chrome",
  delay,
}: {
  position: V3;
  scale?: number;
  color?: string;
  finish?: Finish;
  delay?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const detail = useDetail();
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    if (delay !== undefined) m.scale.setScalar(scale * pop(state.clock.elapsedTime, delay));
    if (!motion.reduced) m.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.9 + position[0]) * 0.06;
  });
  return (
    <mesh ref={mesh} position={position} scale={delay === undefined ? scale : 0}>
      <sphereGeometry args={[1, detail.sphere, Math.round(detail.sphere * 0.75)]} />
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

/* -------------------------------------------------------------- liquid chrome */

/**
 * Signature hero piece: a drop of liquid metal. Its surface churns on its own, reaches
 * toward the cursor, and ripples harder the faster the cursor moves. `excite()` (0..1)
 * lets a scene stir it from outside (scroll speed, a click).
 */
export function LiquidChrome({
  position,
  scale = 1,
  reach = 0.35,
  calm = 0.1,
  delay,
  excite,
  tint,
}: {
  position: V3;
  scale?: number;
  /** How far the surface stretches toward the cursor. */
  reach?: number;
  /** Resting churn. */
  calm?: number;
  delay?: number;
  excite?: () => number;
  tint?: string;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const detail = useDetail();
  const low = useQuality() === "low";
  const material = useMemo(() => makeLiquidChrome(low, tint).material, [low, tint]);
  useEffect(() => () => material.dispose(), [material]);
  const track = useRef({ px: 0, py: 0, energy: 0, dir: new THREE.Vector3(), q: new THREE.Quaternion(), wp: new THREE.Vector3() });

  useFrame((frame, delta) => {
    const m = mesh.current;
    if (!m) return;
    const uniforms = (m.material as THREE.Material).userData.uniforms as LiquidUniforms;
    const state = track.current;
    const dt = Math.min(delta, 1 / 30);
    const time = frame.clock.elapsedTime;
    m.scale.setScalar(Math.max(0.001, scale * pop(time, delay)));
    if (motion.reduced) {
      uniforms.uAmp.value = calm;
      return;
    }
    uniforms.uTime.value += dt;
    // Cursor speed stirs the surface; it settles back over about a second.
    const speed = Math.hypot(pointer.x - state.px, pointer.y - state.py) / Math.max(dt, 1e-3);
    state.px = pointer.x;
    state.py = pointer.y;
    state.energy = Math.max(state.energy * Math.exp(-dt * 1.6), Math.min(1, speed * 0.12), excite?.() ?? 0);
    uniforms.uAmp.value = calm + state.energy * 0.12;
    // Reach toward the cursor: a world direction from the blob to where the cursor points,
    // turned into the mesh's own space because the mesh keeps rotating.
    m.getWorldPosition(state.wp);
    state.dir.set(pointer.sx * 4 - state.wp.x, pointer.sy * 2.5 - state.wp.y, 3).normalize();
    m.getWorldQuaternion(state.q);
    state.dir.applyQuaternion(state.q.invert());
    uniforms.uPull.value.lerp(state.dir, 1 - Math.exp(-dt * 4)).normalize();
    uniforms.uPullAmt.value = reach * (0.55 + Math.min(1, Math.hypot(pointer.sx, pointer.sy)) * 0.45);
    m.rotation.y += dt * 0.12;
    m.rotation.x = Math.sin(time * 0.2) * 0.2;
    m.position.y = position[1] + Math.sin(time * 0.7 + position[0]) * 0.07;
  });

  return (
    <mesh ref={mesh} position={position} scale={delay === undefined ? scale : 0.001} material={material}>
      <sphereGeometry args={[1, detail.liquid, Math.round(detail.liquid * 0.66)]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ bubbles */

// Seeded so every visitor sees the same field.
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/**
 * A drifting field of soap bubbles in one draw call. They rise slowly through `box`,
 * wobble, and wrap from top to bottom; the cursor nudges the nearest ones aside.
 */
export function Bubbles({
  count = 18,
  box = [8, 5, 3],
  center = [0, 0, 0],
  size = [0.06, 0.28],
  seed = 1,
  rise = 0.18,
  delay,
}: {
  count?: number;
  box?: V3;
  center?: V3;
  size?: [number, number];
  seed?: number;
  rise?: number;
  delay?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const low = useQuality() === "low";
  const n = low ? Math.ceil(count * 0.6) : count;
  const bubbles = useMemo(() => {
    const r = seeded(seed * 7919 + 3);
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * box[0],
      y: (r() - 0.5) * box[1],
      z: (r() - 0.5) * box[2],
      s: size[0] + r() ** 2 * (size[1] - size[0]),
      phase: r() * Math.PI * 2,
      speed: 0.6 + r() * 0.8,
    }));
  }, [count, box, size, seed]);
  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const v = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);

  useFrame((state) => {
    const im = mesh.current;
    if (!im) return;
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    const grow = pop(state.clock.elapsedTime, delay);
    for (let i = 0; i < n; i++) {
      const b = bubbles[i];
      const h = box[1];
      // Rise and wrap: each bubble climbs through the box and re-enters at the bottom.
      const y = ((((b.y + h / 2 + t * rise * b.speed) % h) + h) % h) - h / 2;
      // Fade in size near the wrap so bubbles appear and vanish instead of jumping.
      const edge = Math.min(1, (y + h / 2) / (h * 0.12), (h / 2 - y) / (h * 0.12));
      const px = center[0] + b.x + Math.sin(t * 0.8 * b.speed + b.phase) * 0.12 - pointer.sx * 0.25 * (b.z + box[2]) * 0.2;
      v.p.set(px, center[1] + y, center[2] + b.z);
      const wobble = 1 + Math.sin(t * 3 + b.phase) * 0.04;
      v.s.set(b.s * wobble, b.s / wobble, b.s).multiplyScalar(Math.max(0.001, edge * grow));
      im.setMatrixAt(i, m4.compose(v.p, v.q, v.s));
    }
    im.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, n]} frustumCulled={false} material={bubbleMaterial(low)}>
      <sphereGeometry args={[1, 32, 24]} />
    </instancedMesh>
  );
}

/** Retro-futurist orbit: a thin chrome ring with a lime spark riding it. Can spin in on load. */
export function Orbit({
  radius,
  tilt = [1.2, 0, 0.3],
  position = [0, 0, 0],
  speed = 0.25,
  planet = palette.lime,
  planetSize = 0.1,
  phase = 0,
  delay,
}: {
  radius: number;
  tilt?: V3;
  position?: V3;
  speed?: number;
  planet?: string;
  planetSize?: number;
  phase?: number;
  delay?: number;
}) {
  const rider = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (rider.current) rider.current.rotation.z = motion.reduced ? phase : time * speed + phase;
    if (ring.current && delay !== undefined) {
      const e = pop(time, delay);
      ring.current.scale.setScalar(Math.max(0.001, e));
      ring.current.rotation.z = (1 - Math.min(1, e)) * 2.5;
    }
  });
  return (
    <group position={position} rotation={tilt}>
      <group ref={ring} scale={delay === undefined ? 1 : 0.001}>
        <mesh>
          <torusGeometry args={[radius, 0.013, 16, 220]} />
          <FinishMaterial finish="chrome" />
        </mesh>
        <group ref={rider}>
          <mesh position={[radius, 0, 0]} scale={planetSize}>
            <sphereGeometry args={[1, 32, 24]} />
            <FinishMaterial finish="plastic" color={planet} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------ screens */

/**
 * Signature move: a device screen showing a full-page capture of the real site,
 * scrolled by `scroll()` (0 = top of the site, 1 = bottom) every frame.
 */
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

/**
 * Holographic glass over every screen: a thin-film rainbow band sweeps diagonally across
 * on a loop, and the cursor drags it, like tilting a foil card under a lamp.
 */
function holoShader(this: THREE.Material, shader: { uniforms: Record<string, unknown>; vertexShader: string; fragmentShader: string }) {
  // The sweep uniform lives on the material, so the frame loop can move it.
  shader.uniforms.uSweep = this.userData.uSweep ??= { value: -1 };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vHoloUv;")
    .replace("#include <uv_vertex>", "#include <uv_vertex>\nvHoloUv = uv;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec2 vHoloUv;\nuniform float uSweep;")
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      float hd = vHoloUv.x * 0.8 + vHoloUv.y * 0.45 - uSweep;
      float band = exp(-hd * hd * 70.0);
      vec3 film = 0.5 + 0.5 * cos(6.2832 * (vHoloUv.x * 1.3 - vHoloUv.y * 0.7 + uSweep * 1.5 + vec3(0.0, 0.33, 0.67)));
      diffuseColor.rgb += band * (film * 0.32 + 0.16) + film * 0.035;`,
    );
}

function ScreenMaterial({ texture, aspect, scroll }: { texture: THREE.Texture; aspect: number; scroll?: () => number }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  // Each screen gets its own clone, so two screens can show one image at different scroll points.
  const map = useMemo(() => {
    const t = texture.clone();
    t.needsUpdate = true;
    return t;
  }, [texture]);
  // Each screen starts its sweep at a different point, so neighbours never flash in sync.
  const id = useId();
  const seed = useMemo(() => Array.from(id).reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) / 97, [id]);
  useFrame((state) => {
    const t = motion.reduced ? 0.15 : state.clock.elapsedTime;
    const sweep = material.current?.userData.uSweep as { value: number } | undefined;
    if (sweep) sweep.value = (((t * 0.16 + seed) % 1) * 2.4 - 0.5) + pointer.sx * 0.25;
    const m = material.current?.map;
    const img = m?.image as { width: number; height: number } | undefined;
    if (!m || !img) return;
    const imgAspect = img.width / img.height;
    if (imgAspect > aspect) {
      // Wider than the screen: fit height, centre horizontally.
      m.repeat.set(aspect / imgAspect, 1);
      m.offset.set((1 - m.repeat.x) / 2, 0);
    } else {
      // Taller than the screen (full-page capture): fit width, scroll vertically.
      const visible = imgAspect / aspect;
      const s = clamp01(scroll ? scroll() : 0);
      m.repeat.set(1, visible);
      m.offset.set(0, (1 - visible) * (1 - s));
    }
  });
  return <meshBasicMaterial ref={material} map={map} toneMapped={false} onBeforeCompile={holoShader} />;
}

/** Black glass around the screen, glossy enough to catch the sky. */
const GLASS = "#0b1020";

type DeviceProps = { src?: string; texture?: THREE.Texture; scroll?: () => number } & ThreeElements["group"];

function GlassFront({ w, h, z, r }: { w: number; h: number; z: number; r: number }) {
  return (
    <RoundedBox args={[w, h, 0.02]} radius={Math.min(r, 0.01)} smoothness={4} position={[0, 0, z]}>
      <meshPhysicalMaterial color={GLASS} roughness={0.05} metalness={0.2} clearcoat={1} clearcoatRoughness={0.02} />
    </RoundedBox>
  );
}

export function Tablet({ src, texture, scroll, ...props }: DeviceProps) {
  const w = 3.2, h = 2.2;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.14]} radius={0.14} smoothness={6}>
        <FinishMaterial finish="chrome" />
      </RoundedBox>
      <GlassFront w={w - 0.06} h={h - 0.06} z={0.064} r={0.12} />
      <group position={[0, 0, 0.076]}>
        <ScrollingScreen src={src} texture={texture} width={w - 0.2} height={h - 0.2} scroll={scroll} />
      </group>
    </group>
  );
}

export function Phone({ src, scroll, ...props }: DeviceProps) {
  const w = 1.05, h = 2.18;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.11]} radius={0.16} smoothness={6}>
        <FinishMaterial finish="chrome" />
      </RoundedBox>
      <GlassFront w={w - 0.05} h={h - 0.05} z={0.05} r={0.14} />
      <group position={[0, 0, 0.062]}>
        <ScrollingScreen src={src} width={w - 0.09} height={h - 0.09} scroll={scroll} />
      </group>
    </group>
  );
}

export function Laptop({ src, scroll, lean = -0.28, ...props }: DeviceProps & { lean?: number }) {
  const w = 3.3, d = 2.2;
  return (
    <group {...props}>
      <RoundedBox args={[w, 0.1, d]} radius={0.05} smoothness={4} position={[0, 0, d / 2]}>
        <FinishMaterial finish="chrome" />
      </RoundedBox>
      <mesh position={[0, 0.052, d / 2 + 0.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w * 0.82, d * 0.48]} />
        <meshPhysicalMaterial color={GLASS} roughness={0.3} clearcoat={0.6} />
      </mesh>
      {/* lid, hinged at the back edge */}
      <group position={[0, 0.05, 0]} rotation-x={lean}>
        <RoundedBox args={[w, d, 0.07]} radius={0.05} smoothness={4} position={[0, d / 2, 0]}>
          <FinishMaterial finish="chrome" />
        </RoundedBox>
        <group position={[0, d / 2, 0.037]}>
          <mesh>
            <planeGeometry args={[w - 0.12, d - 0.12]} />
            <meshPhysicalMaterial color={GLASS} roughness={0.05} clearcoat={1} />
          </mesh>
          <group position={[0, 0, 0.001]}>
            <ScrollingScreen src={src} width={w - 0.3} height={d - 0.3} scroll={scroll} />
          </group>
        </group>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------- robot */

/** Mutable drive for the robot, written by the scene each frame. */
export type RobotDrive = {
  walking: number;
  waving: number;
  /** Optional gaze (-1..1); when set, the head tracks it instead of idling. */
  lookX?: number;
  lookY?: number;
  /** 0 awake, 1 asleep: head droops, eyes dim, slow breathing. */
  sleep?: number;
  /** 0 switched off (eyes dark, gears still), 1 running. Defaults to 1. */
  power?: number;
  /** 0..1: both arms thrown up. */
  cheer?: number;
};

export const ROBOT_PARTS = ["head", "body", "left arm", "right arm", "left leg", "right leg"] as const;

/** Where each part sits in the built robot, in robot units (feet at y = 0, about 3.6 tall). */
export const ROBOT_HOME: V3[] = [
  [0, 2.6, 0],
  [0, 1.5, 0],
  [-0.76, 1.86, 0],
  [0.76, 1.86, 0],
  [-0.3, 0.86, 0],
  [0.3, 0.86, 0],
];

/** A chunky toy gear: teeth around a rim with a hub hole. Cached by size. */
const gearCache = new Map<string, THREE.ExtrudeGeometry>();
function gearGeometry(radius: number, teeth: number) {
  const key = `${radius}:${teeth}`;
  const hit = gearCache.get(key);
  if (hit) return hit;
  const shape = new THREE.Shape();
  const inner = radius * 0.8;
  for (let i = 0; i < teeth * 4; i++) {
    const a = (i / (teeth * 4)) * Math.PI * 2;
    const r = i % 4 < 2 ? radius : inner;
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.28, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 16 });
  geo.center();
  gearCache.set(key, geo);
  return geo;
}

/** The visor: a band cut from a slightly larger sphere than the dome, across its face. */
let visorGeo: THREE.SphereGeometry | null = null;
const visorGeometry = () => (visorGeo ??= new THREE.SphereGeometry(0.645, 48, 24, Math.PI / 2 - 0.88, 1.76, Math.PI / 2 - 0.42, 0.78));

type RobotMaterials = Record<"chrome" | "jelly" | "aqua" | "visor" | "eye" | "lime", THREE.Material>;

function useRobotMaterials(ghost: boolean): RobotMaterials {
  const low = useQuality() === "low";
  const materials = useMemo<RobotMaterials>(() => {
    if (ghost) {
      // The outline to build onto: one faint aqua glass, everything else hidden by it.
      const g = new THREE.MeshBasicMaterial({ color: palette.aqua, transparent: true, opacity: 0.16, depthWrite: false });
      return { chrome: g, jelly: g, aqua: g, visor: g, eye: g, lime: g };
    }
    const physical = !low;
    const chrome = physical
      ? new THREE.MeshPhysicalMaterial({ color: palette.chrome, metalness: 1, roughness: 0.06, envMapIntensity: 1.3, iridescence: 0.2 })
      : new THREE.MeshStandardMaterial({ color: palette.chrome, metalness: 1, roughness: 0.08, envMapIntensity: 1.3 });
    const jelly = physical
      ? new THREE.MeshPhysicalMaterial({ color: palette.lilac, roughness: 0.08, transparent: true, opacity: 0.62, clearcoat: 1, clearcoatRoughness: 0.03, iridescence: 0.6, iridescenceIOR: 1.3, envMapIntensity: 1.4 })
      : new THREE.MeshStandardMaterial({ color: palette.lilac, roughness: 0.12, transparent: true, opacity: 0.7, envMapIntensity: 1.2 });
    const aqua = physical
      ? new THREE.MeshPhysicalMaterial({ color: palette.aqua, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1 })
      : new THREE.MeshStandardMaterial({ color: palette.aqua, roughness: 0.25 });
    const visor = physical
      ? new THREE.MeshPhysicalMaterial({ color: "#070b18", roughness: 0.04, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 })
      : new THREE.MeshStandardMaterial({ color: "#070b18", roughness: 0.08, metalness: 0.4, envMapIntensity: 1.4 });
    const eye = new THREE.MeshStandardMaterial({ color: palette.aqua, emissive: palette.aqua, emissiveIntensity: 2.4, toneMapped: false });
    const lime = new THREE.MeshStandardMaterial({ color: palette.lime, emissive: palette.lime, emissiveIntensity: 1.2, roughness: 0.2, toneMapped: false });
    return { chrome, jelly, aqua, visor, eye, lime };
  }, [ghost, low]);
  useEffect(() => () => new Set(Object.values(materials)).forEach((m) => m.dispose()), [materials]);
  return materials;
}

type PartHandlers = Partial<{
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}>;

/**
 * The neo-Y2K toy robot from the concept art: a mirror-chrome dome with a black glass visor
 * and glowing aqua eyes, a see-through lilac jelly body with chrome gears turning inside,
 * aqua arms, chrome boots, and a lime bulb on its antenna.
 *
 * It is six separate parts (ROBOT_PARTS), each a top-level group at its ROBOT_HOME, so the
 * build-a-bot game can pull them apart and the robot can be put back together. Animation
 * runs on groups inside each part and never fights whoever positions the parts.
 */
export function Robot({
  drive,
  ghost = false,
  partRef,
  partHandlers,
  ...props
}: {
  drive?: { current: RobotDrive };
  /** Draw the robot as a faint outline instead (the build-a-bot target). */
  ghost?: boolean;
  partRef?: (i: number, el: THREE.Group | null) => void;
  partHandlers?: (i: number) => PartHandlers;
} & ThreeElements["group"]) {
  const mat = useRobotMaterials(ghost);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const bob = useRef<(THREE.Group | null)[]>([]);
  const gears = useRef<(THREE.Mesh | null)[]>([]);
  const eye = useRef<THREE.Mesh>(null);
  const bulb = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (ghost) return;
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 1 / 30);
    const d = drive?.current;
    const walking = motion.reduced ? 0 : (d?.walking ?? 0);
    const waving = motion.reduced ? 0 : (d?.waving ?? 1);
    const cheer = motion.reduced ? 0 : (d?.cheer ?? 0);
    const sleep = d?.sleep ?? 0;
    const power = d?.power ?? 1;
    const stride = Math.sin(t * 10) * 0.55 * walking;
    if (legL.current) legL.current.rotation.x = stride;
    if (legR.current) legR.current.rotation.x = -stride;
    // Upper body bounces with the walk and breathes while asleep.
    const lift = Math.abs(Math.sin(t * 10)) * 0.06 * walking + Math.sin(t * 1.6) * 0.02 * sleep;
    for (let i = 0; i < 4; i++) if (bob.current[i]) bob.current[i]!.position.y = lift;
    // Arms swing with the walk; the right one lifts into a wave, both go up for a cheer.
    const swing = stride * 0.4 * (1 - waving);
    if (armL.current) armL.current.rotation.z = -0.22 - cheer * 2.5 + swing - Math.sin(t * 9) * 0.25 * cheer;
    if (armR.current) armR.current.rotation.z = 0.22 + Math.max(waving * (2.05 + Math.sin(t * 5) * 0.4), cheer * (2.5 + Math.sin(t * 9) * 0.25)) - swing;
    const h = head.current;
    if (h && !motion.reduced) {
      if (d?.lookX !== undefined) {
        h.rotation.y += (d.lookX * 0.7 * (1 - sleep) - h.rotation.y) * 0.12;
        h.rotation.x += ((d.lookY ?? 0) * -0.35 * (1 - sleep) + sleep * 0.45 - h.rotation.x) * 0.12;
      } else {
        h.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - walking);
      }
      h.rotation.z = Math.sin(t * 9) * 0.08 * cheer;
    }
    // Gears turn while powered; neighbours turn opposite ways.
    if (!motion.reduced) gears.current.forEach((g, i) => g && (g.rotation.z += dt * power * (i % 2 ? -2.2 : 1.6)));
    // Eyes: blink now and then; while powering up they flicker before holding steady.
    const flicker = power > 0 && power < 1 ? (Math.sin(t * 47) > 0.2 ? 1 : 0.15) : 1;
    const blink = Math.sin(t * 1.3) > 0.97 ? 0.08 : 1;
    // Both eyes share one material, so setting it through either eye lights both.
    const eyes = eye.current?.material as THREE.MeshStandardMaterial | undefined;
    if (eyes) eyes.emissiveIntensity = 2.4 * power * flicker * blink * (1 - sleep * 0.92);
    const lime = bulb.current?.material as THREE.MeshStandardMaterial | undefined;
    if (lime) lime.emissiveIntensity = (0.25 + (0.5 + 0.5 * Math.sin(t * 3)) * 1.1) * Math.max(0.15, power);
  });

  const part = (i: number, children: React.ReactNode) => (
    <group key={i} ref={(el) => partRef?.(i, el)} position={ROBOT_HOME[i]} {...partHandlers?.(i)}>
      <group ref={(el) => void (bob.current[i] = el)}>{children}</group>
    </group>
  );

  return (
    <group {...props}>
      {part(
        0,
        <group ref={head}>
          <mesh scale={[1.08, 0.94, 1]} material={mat.chrome}>
            <sphereGeometry args={[0.62, 48, 32]} />
          </mesh>
          <mesh geometry={visorGeometry()} scale={[1.08, 0.94, 1]} material={mat.visor} />
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} ref={x < 0 ? eye : undefined} position={[x, 0.02, 0.6]} material={mat.eye}>
              <capsuleGeometry args={[0.065, 0.1, 8, 16]} />
            </mesh>
          ))}
          {[-0.67, 0.67].map((x) => (
            <group key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
              <mesh material={mat.chrome}>
                <cylinderGeometry args={[0.16, 0.16, 0.1, 32]} />
              </mesh>
              <mesh position={[0, x > 0 ? -0.05 : 0.05, 0]} material={mat.aqua}>
                <cylinderGeometry args={[0.1, 0.1, 0.04, 32]} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 0.72, 0]} material={mat.chrome}>
            <cylinderGeometry args={[0.025, 0.025, 0.32, 12]} />
          </mesh>
          <mesh ref={bulb} position={[0, 0.92, 0]} material={mat.lime}>
            <sphereGeometry args={[0.095, 24, 16]} />
          </mesh>
          <mesh position={[0, -0.62, 0]} material={mat.jelly}>
            <cylinderGeometry args={[0.22, 0.26, 0.18, 32]} />
          </mesh>
        </group>,
      )}
      {part(
        1,
        <>
          {/* gears first, so the jelly shell draws over them */}
          {(
            [
              [0.2, 12, -0.13, 0.12, 0],
              [0.15, 10, 0.17, -0.06, 0.06],
              [0.12, 8, -0.02, -0.28, -0.06],
            ] as const
          ).map(([r, teeth, x, y, z], i) => (
            <mesh key={i} ref={(el) => void (gears.current[i] = el)} geometry={gearGeometry(r, teeth)} position={[x, y, z]} material={mat.chrome} />
          ))}
          <mesh material={mat.chrome} position={[0, -0.45, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.46, 0.055, 16, 48]} />
          </mesh>
          <mesh position={[0, 0.2, 0.47]} scale={[1, 1, 0.4]} material={mat.chrome}>
            <octahedronGeometry args={[0.12, 0]} />
          </mesh>
          <mesh scale={[1.12, 1, 0.88]} material={mat.jelly}>
            <capsuleGeometry args={[0.52, 0.12, 16, 32]} />
          </mesh>
        </>,
      )}
      {[2, 3].map((i) =>
        part(
          i,
          <group ref={i === 2 ? armL : armR} rotation-z={i === 2 ? -0.22 : 0.22}>
            <mesh material={mat.chrome}>
              <sphereGeometry args={[0.17, 32, 24]} />
            </mesh>
            <mesh position={[0, -0.36, 0]} material={mat.aqua}>
              <capsuleGeometry args={[0.13, 0.3, 8, 24]} />
            </mesh>
            <mesh position={[0, -0.6, 0]} rotation-x={Math.PI / 2} material={mat.chrome}>
              <torusGeometry args={[0.13, 0.03, 12, 32]} />
            </mesh>
            <mesh position={[0, -0.78, 0]} scale={[1, 1.15, 0.8]} material={mat.aqua}>
              <sphereGeometry args={[0.16, 32, 24]} />
            </mesh>
            <mesh position={[i === 2 ? 0.13 : -0.13, -0.72, 0.04]} material={mat.aqua}>
              <sphereGeometry args={[0.07, 20, 16]} />
            </mesh>
          </group>,
        ),
      )}
      {[4, 5].map((i) =>
        part(
          i,
          <group ref={i === 4 ? legL : legR}>
            <mesh material={mat.chrome}>
              <sphereGeometry args={[0.13, 24, 16]} />
            </mesh>
            <mesh position={[0, -0.3, 0]} material={mat.chrome}>
              <cylinderGeometry args={[0.05, 0.05, 0.42, 16]} />
            </mesh>
            <mesh position={[0, -0.3, 0]} material={mat.jelly}>
              <cylinderGeometry args={[0.14, 0.14, 0.4, 32]} />
            </mesh>
            <RoundedBox args={[0.42, 0.3, 0.58]} radius={0.12} smoothness={4} position={[0, -0.64, 0.05]} material={mat.chrome} />
            <RoundedBox args={[0.44, 0.08, 0.6]} radius={0.035} smoothness={3} position={[0, -0.8, 0.05]} material={mat.aqua} />
          </group>,
        ),
      )}
    </group>
  );
}

/* -------------------------------------------------------------- reevu */

/**
 * Reevu has no public site and no screenshot yet, so its screen is drawn:
 * a tall review dashboard in the site palette (shapes, not invented numbers),
 * tall enough to scroll like the real captures.
 */
export function useReevuScreen() {
  // Drawn at half resolution on the low tier, like the photographed screens.
  const k = useQuality() === "low" ? 0.5 : 1;
  return useMemo(() => {
    if (typeof document === "undefined") return undefined;
    const W = 1200, H = 2600;
    const c = document.createElement("canvas");
    c.width = W * k;
    c.height = H * k;
    const g = c.getContext("2d");
    if (!g) return undefined;
    g.scale(k, k);
    const round = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      g.fillStyle = fill;
      g.beginPath();
      g.roundRect(x, y, w, h, r);
      g.fill();
    };
    const star = (cx: number, cy: number, on: boolean) => {
      g.fillStyle = on ? "#7B5CFF" : "#DCE6F7";
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const rad = k % 2 ? 7 : 16;
        g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      g.fill();
    };
    const lines = (x: number, y: number, widths: number[], color = "#DCE6F7") =>
      widths.forEach((w, i) => round(x, y + i * 24, w, 12, 6, color));

    g.fillStyle = "#F6F8FF";
    g.fillRect(0, 0, W, H);
    round(0, 0, 230, H, 0, "#22307A");
    g.fillStyle = "#EEF2FF";
    g.font = "700 40px system-ui, sans-serif";
    g.fillText("Reevu", 40, 80);
    for (let i = 0; i < 7; i++) round(40, 150 + i * 62, i === 1 ? 150 : 120, 22, 11, i === 1 ? "#7B5CFF" : "rgba(238,242,255,0.35)");

    g.fillStyle = "#0B1433";
    g.font = "600 34px system-ui, sans-serif";
    g.fillText("Business panel", 280, 80);
    round(900, 50, 250, 44, 22, "#DCE6F7");

    // rating cards
    for (let i = 0; i < 3; i++) {
      round(280 + i * 300, 130, 270, 150, 20, "#FFFFFF");
      round(305 + i * 300, 160, 110, 16, 8, "#B9A6FF");
      for (let s = 0; s < 5; s++) star(320 + i * 300 + s * 40, 230, s < 4 - (i % 2));
    }
    // trend chart
    round(280, 310, 570, 440, 20, "#FFFFFF");
    const bars = [0.35, 0.5, 0.42, 0.66, 0.58, 0.8, 0.72, 0.9];
    bars.forEach((b, i) => round(320 + i * 62, 700 - b * 320, 38, b * 320, 10, i === bars.length - 1 ? "#3B5BFF" : "#5CE1E6"));
    round(880, 310, 270, 440, 20, "#FFFFFF");
    for (let i = 0; i < 5; i++) {
      round(905, 340 + i * 82, 44, 44, 22, i % 2 ? "#B9A6FF" : "#5CE1E6");
      lines(965, 346 + i * 82, [150, 110], "#22307A");
    }

    // recent reviews
    g.fillStyle = "#0B1433";
    g.font = "600 30px system-ui, sans-serif";
    g.fillText("Recent reviews", 280, 820);
    for (let i = 0; i < 6; i++) {
      const y = 860 + i * 170;
      round(280, y, 870, 150, 20, "#FFFFFF");
      round(305, y + 25, 56, 56, 28, i % 2 ? "#B9A6FF" : "#5CE1E6");
      lines(380, y + 30, [180, 120], "#22307A");
      for (let s = 0; s < 5; s++) star(1000 + s * 30, y + 45, s < 5 - (i % 3));
      lines(305, y + 100, [760, 540]);
    }

    // moderation queue (super admin)
    g.fillStyle = "#0B1433";
    g.fillText("Moderation queue", 280, 1920);
    for (let i = 0; i < 4; i++) {
      const y = 1960 + i * 150;
      round(280, y, 870, 130, 20, "#FFFFFF");
      lines(305, y + 30, [420, 300]);
      round(900, y + 40, 100, 44, 22, "#3B5BFF");
      round(1015, y + 40, 110, 44, 22, "#EEF2FF");
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [k]);
}

/* ---------------------------------------------------------- robostars logo */

// Traced from the client's logo (722 x 1134 px). Coordinates in source pixels, y down.
const LOGO_W = 722, LOGO_H = 1134;
const LOGO_BLUE = "#1791c8";
const LOGO_ORANGE = "#f58220";

const px = (x: number, y: number) => new THREE.Vector2((x - LOGO_W / 2) / LOGO_H, -(y - LOGO_H / 2) / LOGO_H);

function polygon(points: [number, number][]) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], i) => {
    const p = px(x, y);
    if (i === 0) shape.moveTo(p.x, p.y);
    else shape.lineTo(p.x, p.y);
  });
  shape.closePath();
  return shape;
}

function circle(cx: number, cy: number, r: number) {
  const c = px(cx, cy);
  const s = new THREE.Shape();
  s.absarc(c.x, c.y, r / LOGO_H, 0, Math.PI * 2, false);
  return s;
}

/** One shared set of logo geometries for the badge and the build-a-robot game. */
let logoCache: ReturnType<typeof buildLogoParts> | null = null;
export function logoParts() {
  return (logoCache ??= buildLogoParts());
}

function buildLogoParts() {
  const head = polygon([[73, 208], [643, 208], [515, 438], [200, 438]]);
  for (const [cx, cy] of [[291, 313], [433, 313]]) {
    const hole = new THREE.Path();
    const c = px(cx, cy);
    hole.absarc(c.x, c.y, 31 / LOGO_H, 0, Math.PI * 2, true);
    head.holes.push(hole);
  }
  const antenna = [polygon([[340, 60], [378, 60], [378, 212], [340, 212]]), circle(358, 40, 40)];
  const leftArm = polygon([[0, 312], [97, 312], [182, 466], [312, 466], [259, 598], [163, 598]]);
  const rightArm = polygon([[722, 312], [623, 312], [538, 466], [408, 466], [461, 598], [557, 598]]);
  const star = polygon([
    [357, 488], [402, 627], [550, 629], [433, 715], [476, 855],
    [358, 770], [240, 855], [283, 715], [167, 629], [313, 628],
  ]);
  const point = polygon([[358, 828], [457, 906], [357, 1128], [257, 897]]);
  const extrude = (shapes: THREE.Shape | THREE.Shape[]) =>
    new THREE.ExtrudeGeometry(shapes, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.01, bevelSegments: 3, curveSegments: 24 });
  // Each part flies in from its own direction, like a robot being assembled.
  return [
    { geo: extrude(antenna), color: LOGO_BLUE, from: [0, 1.2, 0.3] },
    { geo: extrude(head), color: LOGO_BLUE, from: [0, 0.8, -0.6] },
    { geo: extrude(leftArm), color: LOGO_BLUE, from: [-1.1, 0.1, 0.2] },
    { geo: extrude(rightArm), color: LOGO_BLUE, from: [1.1, 0.1, 0.2] },
    { geo: extrude(star), color: LOGO_ORANGE, from: [0, -0.2, 1.2], star: true },
    { geo: extrude(point), color: LOGO_BLUE, from: [0, -1.1, 0] },
  ] as { geo: THREE.ExtrudeGeometry; color: string; from: V3; star?: boolean }[];
}

/**
 * The RoboStars logo as a glossy 3D badge. `assemble()` (0..1) flies the pieces in and
 * clicks them together; once built, the star spins on its own axis and the badge floats.
 */
export function LogoBadge({ assemble, ...props }: { assemble: () => number } & ThreeElements["group"]) {
  const parts = useMemo(() => logoParts(), []);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const whole = useRef<THREE.Group>(null);
  // Star pivots around its own centre, not the badge origin.
  const starCentre = useMemo(() => px(358, 690), []);
  useFrame((state) => {
    const a = motion.reduced ? 1 : clamp01(assemble());
    const t = state.clock.elapsedTime;
    parts.forEach((part, i) => {
      const m = refs.current[i];
      if (!m) return;
      // Stagger: antenna first, point last; each snaps in with a little overshoot.
      const k = Math.max(0, easeOutBack(clamp01(a * 1.6 - i * 0.12)));
      const off = 1 - k;
      m.position.set(part.from[0] * off, part.from[1] * off, part.from[2] * off);
      m.rotation.set(part.from[1] * off * 1.5, part.from[0] * off * 2, 0);
      if (part.star && a >= 1 && !motion.reduced) {
        m.rotation.y = t * 1.4;
        m.position.x = starCentre.x - starCentre.x * Math.cos(t * 1.4);
        m.position.z = starCentre.x * Math.sin(t * 1.4);
      }
      m.visible = a > i * 0.075;
    });
    if (whole.current && !motion.reduced) {
      whole.current.position.y = Math.sin(t * 1.1) * 0.05;
      whole.current.rotation.y = Math.sin(t * 0.6) * 0.35;
    }
  });
  return (
    <group {...props}>
      <group ref={whole}>
        {parts.map((part, i) => (
          <mesh key={i} ref={(m) => void (refs.current[i] = m)} geometry={part.geo} position={[0, 0, -0.035]}>
            <meshPhysicalMaterial color={part.color} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
