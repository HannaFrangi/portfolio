"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import { textureFor, useQuality } from "@/lib/quality";
import { FinishMaterial, blobGeometry, clamp01, easeOutBack, grainTexture, motion, palette, useDetail, useSwatch, type Finish } from "./kit";

type V3 = [number, number, number];

/** Scale multiplier for a springy entrance `delay` seconds after the canvas starts. */
function pop(time: number, delay?: number) {
  if (delay === undefined || motion.reduced) return 1;
  return Math.max(0, easeOutBack(clamp01((time - delay) / 0.9)));
}

/** A floating organic lump. Bobs and turns slowly on its own clock; can pop in on load. */
export function Blob({
  seed,
  position,
  scale = 1,
  color = palette.sage,
  finish = "flock",
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
  color = palette.cream,
  finish = "clay",
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
    if (mesh.current && delay !== undefined) mesh.current.scale.setScalar(scale * pop(state.clock.elapsedTime, delay));
  });
  return (
    <mesh ref={mesh} position={position} scale={delay === undefined ? scale : 0}>
      <sphereGeometry args={[1, detail.sphere, Math.round(detail.sphere * 0.75)]} />
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

export function Donut({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  color = palette.sand,
  finish = "clay",
  delay,
}: {
  position: V3;
  rotation?: V3;
  scale?: number;
  color?: string;
  finish?: Finish;
  delay?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    const m = mesh.current;
    if (!m) return;
    if (delay !== undefined) m.scale.setScalar(scale * pop(state.clock.elapsedTime, delay));
    if (!motion.reduced) m.rotation.z += delta * 0.3;
  });
  return (
    <mesh ref={mesh} position={position} rotation={rotation} scale={delay === undefined ? scale : 0}>
      <torusGeometry args={[1, 0.42, 48, 96]} />
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

/* -------------------------------------------------------------- planets */

/** Deterministic 0..1 noise for the band textures. */
function bandRng(seed: number) {
  let t = seed * 9301 + 49297;
  return () => ((t = (t * 9301 + 49297) % 233280) / 233280);
}

const bandCache = new Map<string, THREE.CanvasTexture>();
/**
 * Soft latitude bands, like a gas giant drawn in the site palette: the base colour
 * with lighter and darker stripes of uneven width.
 */
function bandTexture(base: string, stripe: string, seed: number) {
  const key = `${base}|${stripe}|${seed}`;
  const hit = bandCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 256;
  const g = c.getContext("2d")!;
  const r = bandRng(seed);
  const a = new THREE.Color(base), b = new THREE.Color(stripe);
  for (let y = 0; y < 256; y++) {
    // A few broad bands plus fine wobble, softened so the flocked sheen still reads.
    const band = Math.sin(y * 0.09 + seed) * 0.5 + Math.sin(y * 0.23 + seed * 2) * 0.3 + (r() - 0.5) * 0.15;
    g.fillStyle = `#${a.clone().lerp(b, clamp01(0.5 + band * 0.6)).getHexString()}`;
    g.fillRect(0, y, 8, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  bandCache.set(key, t);
  return t;
}

const ringCache = new Map<string, THREE.CanvasTexture>();
/** A 1D ring texture read by radius: bands of the ring colour with transparent gaps. */
function ringTexture(color: string) {
  const hit = ringCache.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 4;
  const g = c.getContext("2d")!;
  const col = new THREE.Color(color);
  const [cr, cg, cb] = [col.r, col.g, col.b].map((v) => Math.round(v * 255));
  for (let x = 0; x < 256; x++) {
    const u = x / 255;
    const edge = Math.min(u / 0.08, (1 - u) / 0.08, 1);
    const gap = u > 0.58 && u < 0.64 ? 0.15 : 1; // a Cassini-style gap
    const alpha = edge * gap * (0.55 + Math.sin(u * 40) * 0.2 + Math.sin(u * 13) * 0.15);
    g.fillStyle = `rgba(${cr},${cg},${cb},${clamp01(alpha).toFixed(3)})`;
    g.fillRect(x, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  ringCache.set(color, t);
  return t;
}

/** A flat ring whose UVs run inner edge to outer edge, so ringTexture reads by radius. */
function ringGeometry(inner: number, outer: number) {
  const geo = new THREE.RingGeometry(inner, outer, 128, 1);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - inner) / (outer - inner), 0.5);
  }
  return geo;
}

/**
 * A soft banded planet in the flocked studio finish, optionally with a ring and a
 * small moon. Spins slowly on a tilted axis, bobs, and can pop in on load.
 */
export function Planet({
  position,
  scale = 1,
  color = palette.sage,
  stripe = palette.cream,
  seed = 1,
  ring,
  moon,
  tilt = 0.4,
  delay,
}: {
  position: V3;
  scale?: number;
  color?: string;
  stripe?: string;
  seed?: number;
  /** Ring colour; omit for no ring. */
  ring?: string;
  /** Moon colour; omit for no moon. */
  moon?: string;
  tilt?: number;
  delay?: number;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const moonRig = useRef<THREE.Group>(null);
  const detail = useDetail();
  const low = useQuality() === "low";
  const base = useSwatch(color);
  const band = useSwatch(stripe);
  const ringColor = useSwatch(ring ?? palette.sand);
  const map = useMemo(() => (typeof document === "undefined" ? null : bandTexture(base, band, seed)), [base, band, seed]);
  const ringMap = useMemo(() => (ring && typeof document !== "undefined" ? ringTexture(ringColor) : null), [ring, ringColor]);
  const ringGeo = useMemo(() => (ring ? ringGeometry(1.35, 2.15) : null), [ring]);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const g = root.current;
    if (!g) return;
    g.scale.setScalar(Math.max(0.001, scale * pop(time, delay)));
    if (motion.reduced) return;
    g.position.y = position[1] + Math.sin(time * 0.7 + seed) * 0.08;
    if (body.current) body.current.rotation.y += delta * 0.18;
    if (moonRig.current) moonRig.current.rotation.y = time * 0.6 + seed;
  });

  return (
    <group ref={root} position={position} scale={delay === undefined ? scale : 0.001}>
      <group rotation={[0.25, 0, tilt]}>
        <mesh ref={body}>
          <sphereGeometry args={[1, detail.sphere, Math.round(detail.sphere * 0.75)]} />
          {low ? (
            <meshStandardMaterial map={map} roughness={0.9} />
          ) : (
            <meshPhysicalMaterial
              map={map}
              roughness={0.95}
              sheen={1}
              sheenRoughness={0.55}
              sheenColor={new THREE.Color(base).lerp(new THREE.Color("#ffffff"), 0.45)}
              normalMap={grainTexture()}
              normalScale={new THREE.Vector2(0.3, 0.3)}
            />
          )}
        </mesh>
        {ringGeo && ringMap && (
          <mesh geometry={ringGeo} rotation-x={-Math.PI / 2 + 0.12}>
            <meshStandardMaterial map={ringMap} transparent depthWrite={false} side={THREE.DoubleSide} roughness={0.6} metalness={0.2} />
          </mesh>
        )}
      </group>
      {moon && (
        <group ref={moonRig} rotation-z={0.35}>
          <mesh position={[1.45, 0, 0]} scale={0.2}>
            <sphereGeometry args={[1, 24, 18]} />
            <FinishMaterial finish="clay" color={moon} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Retro-futurist orbit: a thin chrome ring with a small planet riding it. Can spin in on load. */
export function Orbit({
  radius,
  tilt = [1.2, 0, 0.3],
  position = [0, 0, 0],
  speed = 0.25,
  planet = palette.accent,
  planetSize = 0.12,
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
          <torusGeometry args={[radius, 0.012, 12, 200]} />
          <FinishMaterial finish="chrome" color={palette.chrome} />
        </mesh>
        <group ref={rider}>
          <mesh position={[radius, 0, 0]} scale={planetSize}>
            <sphereGeometry args={[1, 32, 24]} />
            <FinishMaterial finish="glow" color={planet} />
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

function ScreenMaterial({ texture, aspect, scroll }: { texture: THREE.Texture; aspect: number; scroll?: () => number }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  // Each screen gets its own clone, so two screens can show one image at different scroll points.
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
  return <meshBasicMaterial ref={material} map={map} toneMapped={false} />;
}

const BEZEL = "#20241a";

type DeviceProps = { src?: string; texture?: THREE.Texture; scroll?: () => number } & ThreeElements["group"];

export function Tablet({ src, texture, scroll, ...props }: DeviceProps) {
  const w = 3.2, h = 2.2;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.14]} radius={0.14} smoothness={6}>
        <meshPhysicalMaterial color={BEZEL} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
      </RoundedBox>
      <group position={[0, 0, 0.072]}>
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
        <meshPhysicalMaterial color={BEZEL} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
      </RoundedBox>
      <group position={[0, 0, 0.057]}>
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
        <meshStandardMaterial color="#d7d9d2" metalness={0.6} roughness={0.35} />
      </RoundedBox>
      <mesh position={[0, 0.052, d / 2 + 0.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[w * 0.82, d * 0.48]} />
        <meshStandardMaterial color="#b9bcb2" roughness={0.6} />
      </mesh>
      {/* lid, hinged at the back edge */}
      <group position={[0, 0.05, 0]} rotation-x={lean}>
        <RoundedBox args={[w, d, 0.07]} radius={0.05} smoothness={4} position={[0, d / 2, 0]}>
          <meshStandardMaterial color="#d7d9d2" metalness={0.6} roughness={0.35} />
        </RoundedBox>
        <group position={[0, d / 2, 0.037]}>
          <mesh>
            <planeGeometry args={[w - 0.12, d - 0.12]} />
            <meshBasicMaterial color={BEZEL} />
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
};

/** A 1970s toy robot: cream shell, visor, orange eyes, chrome antenna. Walks and waves on cue. */
export function Robot({ drive, ...props }: { drive?: { current: RobotDrive } } & ThreeElements["group"]) {
  const arm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.MeshStandardMaterial>(null);
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
      body.current.scale.y = 1 + Math.sin(t * 1.6) * 0.015 * sleep;
    }
    // Arm swings with the walk, then lifts into a wave.
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
    if (eyes.current) eyes.current.emissiveIntensity = (Math.sin(t * 1.3) > 0.97 ? 0.1 : 1.6) * (1 - sleep * 0.92);
  });
  const cream = palette.cream;
  const accent = palette.accent;
  const shell = <meshPhysicalMaterial color={cream} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} />;
  const trim = <FinishMaterial finish="flock" color={palette.moss} />;
  const chrome = <meshStandardMaterial color={palette.chrome} metalness={1} roughness={0.15} />;
  return (
    <group {...props}>
      {/* legs pivot at the hip */}
      {[-0.3, 0.3].map((x) => (
        <group key={x} ref={x < 0 ? legL : legR} position={[x, 0.72, 0]}>
          <RoundedBox args={[0.42, 0.18, 0.55]} radius={0.08} position={[0, -0.63, 0.05]}>{trim}</RoundedBox>
          <mesh position={[0, -0.27, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.55, 24]} />
            {chrome}
          </mesh>
        </group>
      ))}
      <group ref={body}>
        <RoundedBox args={[1.25, 1.1, 0.8]} radius={0.22} smoothness={6} position={[0, 1.3, 0]}>{shell}</RoundedBox>
        <RoundedBox args={[0.7, 0.5, 0.05]} radius={0.06} position={[0, 1.33, 0.41]}>{trim}</RoundedBox>
        <mesh position={[0.18, 1.33, 0.44]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 24]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[-0.15, 1.33, 0.44]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 24]} />
          {chrome}
        </mesh>
        <group position={[-0.72, 1.6, 0]} rotation-z={-0.25}>
          <mesh position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.12, 0.5, 8, 16]} />
            {trim}
          </mesh>
        </group>
        <group ref={arm} position={[0.72, 1.6, 0]} rotation-z={2.3}>
          <mesh position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.12, 0.5, 8, 16]} />
            {trim}
          </mesh>
          <mesh position={[0, -0.72, 0]}>
            <sphereGeometry args={[0.14, 24, 16]} />
            {chrome}
          </mesh>
        </group>
        <group ref={head} position={[0, 2.25, 0]}>
          <RoundedBox args={[1, 0.72, 0.78]} radius={0.24} smoothness={6}>{shell}</RoundedBox>
          <RoundedBox args={[0.78, 0.36, 0.05]} radius={0.12} position={[0, 0.02, 0.38]}>
            <meshPhysicalMaterial color="#1c2116" roughness={0.1} clearcoat={1} />
          </RoundedBox>
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.42]}>
              <sphereGeometry args={[0.07, 24, 16]} />
              <meshStandardMaterial ref={x < 0 ? eyes : undefined} color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 12]} />
            {chrome}
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <sphereGeometry args={[0.08, 24, 16]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
          </mesh>
          {[-0.53, 0.53].map((x) => (
            <mesh key={x} position={[x, 0, 0]} rotation-z={Math.PI / 2}>
              <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
              {chrome}
            </mesh>
          ))}
        </group>
      </group>
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
      g.fillStyle = on ? "#E0703A" : "#DBDFD9";
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 - Math.PI / 2;
        const rad = k % 2 ? 7 : 16;
        g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      g.fill();
    };
    const lines = (x: number, y: number, widths: number[], color = "#DBDFD9") =>
      widths.forEach((w, i) => round(x, y + i * 24, w, 12, 6, color));

    g.fillStyle = "#F4F1E8";
    g.fillRect(0, 0, W, H);
    round(0, 0, 230, H, 0, "#595F3E");
    g.fillStyle = "#EDE8DC";
    g.font = "700 40px system-ui, sans-serif";
    g.fillText("Reevu", 40, 80);
    for (let i = 0; i < 7; i++) round(40, 150 + i * 62, i === 1 ? 150 : 120, 22, 11, i === 1 ? "#E0703A" : "rgba(237,232,220,0.35)");

    g.fillStyle = "#13180A";
    g.font = "600 34px system-ui, sans-serif";
    g.fillText("Business panel", 280, 80);
    round(900, 50, 250, 44, 22, "#DBDFD9");

    // rating cards
    for (let i = 0; i < 3; i++) {
      round(280 + i * 300, 130, 270, 150, 20, "#FFFFFF");
      round(305 + i * 300, 160, 110, 16, 8, "#C2B396");
      for (let s = 0; s < 5; s++) star(320 + i * 300 + s * 40, 230, s < 4 - (i % 2));
    }
    // trend chart
    round(280, 310, 570, 440, 20, "#FFFFFF");
    const bars = [0.35, 0.5, 0.42, 0.66, 0.58, 0.8, 0.72, 0.9];
    bars.forEach((b, i) => round(320 + i * 62, 700 - b * 320, 38, b * 320, 10, i === bars.length - 1 ? "#738B54" : "#959D69"));
    round(880, 310, 270, 440, 20, "#FFFFFF");
    for (let i = 0; i < 5; i++) {
      round(905, 340 + i * 82, 44, 44, 22, i % 2 ? "#C2B396" : "#959D69");
      lines(965, 346 + i * 82, [150, 110], "#595F3E");
    }

    // recent reviews
    g.fillStyle = "#13180A";
    g.font = "600 30px system-ui, sans-serif";
    g.fillText("Recent reviews", 280, 820);
    for (let i = 0; i < 6; i++) {
      const y = 860 + i * 170;
      round(280, y, 870, 150, 20, "#FFFFFF");
      round(305, y + 25, 56, 56, 28, i % 2 ? "#C2B396" : "#959D69");
      lines(380, y + 30, [180, 120], "#595F3E");
      for (let s = 0; s < 5; s++) star(1000 + s * 30, y + 45, s < 5 - (i % 3));
      lines(305, y + 100, [760, 540]);
    }

    // moderation queue (super admin)
    g.fillStyle = "#13180A";
    g.fillText("Moderation queue", 280, 1920);
    for (let i = 0; i < 4; i++) {
      const y = 1960 + i * 150;
      round(280, y, 870, 130, 20, "#FFFFFF");
      lines(305, y + 30, [420, 300]);
      round(900, y + 40, 100, 44, 22, "#738B54");
      round(1015, y + 40, 110, 44, 22, "#EDE8DC");
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [k]);
}

/* ---------------------------------------------------------------- pod */

/** The Futuro pod from the hero photo: a white saucer with a window band, legs and a soft glow. */
export function Pod(props: ThreeElements["group"]) {
  const white = palette.cream;
  const glow = palette.accent;
  return (
    <group {...props}>
      <mesh scale={[1, 0.42, 1]}>
        <sphereGeometry args={[0.6, 48, 24]} />
        <meshPhysicalMaterial color={white} roughness={0.3} clearcoat={0.9} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[0.56, 0.05, 12, 48]} />
        <meshPhysicalMaterial color="#27304a" roughness={0.1} clearcoat={1} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.38, -0.36, Math.sin(a) * 0.38]} rotation={[Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <FinishMaterial finish="chrome" color={palette.chrome} />
          </mesh>
        );
      })}
      <mesh position={[0, -0.24, 0]} scale={[1, 0.3, 1]}>
        <sphereGeometry args={[0.16, 20, 12]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  );
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

/** The two eye sockets in the head, in logo units, and their radius. */
export const LOGO_EYES = [px(291, 313), px(433, 313)];
export const LOGO_EYE_R = 31 / LOGO_H;

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
  // The same outline as one flat sheet, for the build game's target outline: one layer
  // everywhere (overlaps merged), so it draws as a clean silhouette.
  const flat = (shapes: THREE.Shape | THREE.Shape[]) => new THREE.ShapeGeometry(shapes, 24);
  const extrude = (shapes: THREE.Shape | THREE.Shape[]) =>
    new THREE.ExtrudeGeometry(shapes, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.01, bevelSegments: 3, curveSegments: 24 });
  // Each part flies in from its own direction, like a robot being assembled.
  return [
    { geo: extrude(antenna), flat: flat(antenna), color: LOGO_BLUE, from: [0, 1.2, 0.3] },
    { geo: extrude(head), flat: flat(head), color: LOGO_BLUE, from: [0, 0.8, -0.6] },
    { geo: extrude(leftArm), flat: flat(leftArm), color: LOGO_BLUE, from: [-1.1, 0.1, 0.2] },
    { geo: extrude(rightArm), flat: flat(rightArm), color: LOGO_BLUE, from: [1.1, 0.1, 0.2] },
    { geo: extrude(star), flat: flat(star), color: LOGO_ORANGE, from: [0, -0.2, 1.2], star: true },
    { geo: extrude(point), flat: flat(point), color: LOGO_BLUE, from: [0, -1.1, 0] },
  ] as { geo: THREE.ExtrudeGeometry; flat: THREE.BufferGeometry; color: string; from: V3; star?: boolean }[];
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
