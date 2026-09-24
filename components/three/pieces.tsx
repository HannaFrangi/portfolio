"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import { FinishMaterial, blobGeometry, clamp01, easeOutBack, motion, palette, type Finish } from "./kit";

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
  const geometry = useMemo(() => blobGeometry(seed, amount), [seed, amount]);
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
  useFrame((state) => {
    if (mesh.current && delay !== undefined) mesh.current.scale.setScalar(scale * pop(state.clock.elapsedTime, delay));
  });
  return (
    <mesh ref={mesh} position={position} scale={delay === undefined ? scale : 0}>
      <sphereGeometry args={[1, 64, 48]} />
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
  const texture = useTexture(src, (t) => {
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
export type RobotDrive = { walking: number; waving: number };

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
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 10)) * 0.06 * walking;
    // Arm swings with the walk, then lifts into a wave.
    if (arm.current) arm.current.rotation.z = 0.25 + waving * (2.05 + Math.sin(t * 5) * 0.4) - stride * 0.4 * (1 - waving);
    if (head.current && !motion.reduced) head.current.rotation.y = Math.sin(t * 0.7) * 0.25 * (1 - walking);
    if (eyes.current) eyes.current.emissiveIntensity = Math.sin(t * 1.3) > 0.97 ? 0.1 : 1.6;
  });
  const shell = <meshPhysicalMaterial color={palette.cream} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} />;
  const trim = <meshPhysicalMaterial color={palette.moss} roughness={0.8} sheen={1} sheenColor="#cfdcb0" />;
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
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.4} />
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
              <meshStandardMaterial ref={x < 0 ? eyes : undefined} color={palette.accent} emissive={palette.accent} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          ))}
          <mesh position={[0, 0.55, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 12]} />
            {chrome}
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <sphereGeometry args={[0.08, 24, 16]} />
            <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.8} />
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
  return useMemo(() => {
    if (typeof document === "undefined") return undefined;
    const W = 1200, H = 2600;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    if (!g) return undefined;
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
  }, []);
}
