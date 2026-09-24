"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeElements } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import { FinishMaterial, blobGeometry, motion, palette, type Finish } from "./kit";

type V3 = [number, number, number];

/** A floating organic lump. Bobs and turns slowly on its own clock. */
export function Blob({
  seed,
  position,
  scale = 1,
  color = palette.sage,
  finish = "flock",
  amount = 0.22,
  speed = 1,
}: {
  seed: number;
  position: V3;
  scale?: number | V3;
  color?: string;
  finish?: Finish;
  amount?: number;
  speed?: number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => blobGeometry(seed, amount), [seed, amount]);
  useFrame((state) => {
    const m = mesh.current;
    if (!m || motion.reduced) return;
    const t = state.clock.elapsedTime * speed + seed;
    m.position.y = position[1] + Math.sin(t * 0.8) * 0.08;
    m.rotation.set(Math.sin(t * 0.3) * 0.25, t * 0.15, Math.cos(t * 0.25) * 0.2);
  });
  return (
    <mesh ref={mesh} geometry={geometry} position={position} scale={scale}>
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

export function Sphere({ position, scale = 1, color = palette.cream, finish = "clay" }: { position: V3; scale?: number; color?: string; finish?: Finish }) {
  return (
    <mesh position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 48]} />
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

export function Donut({ position, rotation = [0, 0, 0], scale = 1, color = palette.sand, finish = "clay" }: { position: V3; rotation?: V3; scale?: number; color?: string; finish?: Finish }) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <torusGeometry args={[1, 0.42, 48, 96]} />
      <FinishMaterial finish={finish} color={color} />
    </mesh>
  );
}

/** Retro-futurist orbit: a thin chrome ring with a small planet riding it. */
export function Orbit({
  radius,
  tilt = [1.2, 0, 0.3],
  position = [0, 0, 0],
  speed = 0.25,
  planet = palette.accent,
  planetSize = 0.12,
  phase = 0,
}: {
  radius: number;
  tilt?: V3;
  position?: V3;
  speed?: number;
  planet?: string;
  planetSize?: number;
  phase?: number;
}) {
  const rider = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!rider.current) return;
    const t = motion.reduced ? phase : state.clock.elapsedTime * speed + phase;
    rider.current.rotation.z = t;
  });
  return (
    <group position={position} rotation={tilt}>
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
  );
}

/** Fit a texture to a screen like CSS object-fit: cover, anchored to the top. */
function coverTop(texture: THREE.Texture, screenAspect: number) {
  const img = texture.image as { width: number; height: number } | undefined;
  if (!img) return;
  const imgAspect = img.width / img.height;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (imgAspect > screenAspect) {
    texture.repeat.set(screenAspect / imgAspect, 1);
    texture.offset.set((1 - texture.repeat.x) / 2, 0);
  } else {
    texture.repeat.set(1, imgAspect / screenAspect);
    texture.offset.set(0, 1 - texture.repeat.y);
  }
}

function Screen({ src, width, height, texture }: { src?: string; width: number; height: number; texture?: THREE.Texture }) {
  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <ScreenImage src={src!} aspect={width / height} />
      )}
    </mesh>
  );
}

function ScreenImage({ src, aspect }: { src: string; aspect: number }) {
  const texture = useTexture(src, (t) => coverTop(t as THREE.Texture, aspect));
  return <meshBasicMaterial map={texture} toneMapped={false} />;
}

const BEZEL = "#20241a";

export function Tablet({ src, texture, ...props }: { src?: string; texture?: THREE.Texture } & ThreeElements["group"]) {
  const w = 3.2, h = 2.2;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.14]} radius={0.14} smoothness={6}>
        <meshPhysicalMaterial color={BEZEL} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
      </RoundedBox>
      <group position={[0, 0, 0.072]}>
        <Screen src={src} texture={texture} width={w - 0.2} height={h - 0.2} />
      </group>
    </group>
  );
}

export function Phone({ src, ...props }: { src: string } & ThreeElements["group"]) {
  const w = 1.05, h = 2.18;
  return (
    <group {...props}>
      <RoundedBox args={[w, h, 0.11]} radius={0.16} smoothness={6}>
        <meshPhysicalMaterial color={BEZEL} roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
      </RoundedBox>
      <group position={[0, 0, 0.057]}>
        <Screen src={src} width={w - 0.09} height={h - 0.09} />
      </group>
    </group>
  );
}

export function Laptop({ src, lean = -0.28, ...props }: { src: string; lean?: number } & ThreeElements["group"]) {
  const w = 3.3, d = 2.2;
  return (
    <group {...props}>
      {/* base */}
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
            <Screen src={src} width={w - 0.3} height={d - 0.3} />
          </group>
        </group>
      </group>
    </group>
  );
}

/** A 1970s toy robot: cream shell, visor, orange eyes, chrome antenna, one arm waving. */
export function Robot(props: ThreeElements["group"]) {
  const arm = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (arm.current) arm.current.rotation.z = motion.reduced ? 2.3 : 2.3 + Math.sin(t * 4) * 0.35;
    if (head.current && !motion.reduced) head.current.rotation.y = Math.sin(t * 0.7) * 0.25;
    // Blink every few seconds.
    if (eyes.current) eyes.current.emissiveIntensity = Math.sin(t * 1.3) > 0.97 ? 0.1 : 1.6;
  });
  const shell = <meshPhysicalMaterial color={palette.cream} roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} />;
  const trim = <meshPhysicalMaterial color={palette.moss} roughness={0.8} sheen={1} sheenColor="#cfdcb0" />;
  const chrome = <meshStandardMaterial color={palette.chrome} metalness={1} roughness={0.15} />;
  return (
    <group {...props}>
      {/* feet and legs */}
      {[-0.3, 0.3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <RoundedBox args={[0.42, 0.18, 0.55]} radius={0.08} position={[0, 0.09, 0.05]}>{trim}</RoundedBox>
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.55, 24]} />
            {chrome}
          </mesh>
        </group>
      ))}
      {/* body */}
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
      {/* arms: left hangs, right waves */}
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
      {/* head */}
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
  );
}

/**
 * Reevu has no public site and no screenshot yet, so its screen is drawn:
 * a review dashboard in the site palette, with shapes rather than invented numbers.
 */
export function useReevuScreen() {
  return useMemo(() => {
    if (typeof document === "undefined") return undefined;
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 800;
    const g = c.getContext("2d");
    if (!g) return undefined;
    const round = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
      g.fillStyle = fill;
      g.beginPath();
      g.roundRect(x, y, w, h, r);
      g.fill();
    };
    g.fillStyle = "#F4F1E8";
    g.fillRect(0, 0, 1200, 800);
    // sidebar
    round(0, 0, 230, 800, 0, "#595F3E");
    g.fillStyle = "#EDE8DC";
    g.font = "700 40px system-ui, sans-serif";
    g.fillText("Reevu", 40, 80);
    for (let i = 0; i < 6; i++) round(40, 150 + i * 62, i === 1 ? 150 : 120, 22, 11, i === 1 ? "#E0703A" : "rgba(237,232,220,0.35)");
    // header
    g.fillStyle = "#13180A";
    g.font = "600 34px system-ui, sans-serif";
    g.fillText("Business panel", 280, 80);
    round(900, 50, 250, 44, 22, "#DBDFD9");
    // stat cards with stars
    for (let i = 0; i < 3; i++) {
      round(280 + i * 300, 130, 270, 150, 20, "#FFFFFF");
      round(305 + i * 300, 160, 110, 16, 8, "#C2B396");
      for (let s = 0; s < 5; s++) {
        const cx = 320 + i * 300 + s * 40, cy = 230;
        g.fillStyle = s < 4 - (i % 2) ? "#E0703A" : "#DBDFD9";
        g.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = (k * Math.PI) / 5 - Math.PI / 2;
          const rad = k % 2 ? 7 : 16;
          g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        }
        g.fill();
      }
    }
    // chart
    round(280, 310, 570, 440, 20, "#FFFFFF");
    const bars = [0.35, 0.5, 0.42, 0.66, 0.58, 0.8, 0.72, 0.9];
    bars.forEach((b, i) => round(320 + i * 62, 700 - b * 320, 38, b * 320, 10, i === bars.length - 1 ? "#738B54" : "#959D69"));
    // review list
    round(880, 310, 270, 440, 20, "#FFFFFF");
    for (let i = 0; i < 5; i++) {
      round(905, 340 + i * 82, 44, 44, 22, i % 2 ? "#C2B396" : "#959D69");
      round(965, 346 + i * 82, 150, 12, 6, "#595F3E");
      round(965, 368 + i * 82, 110, 10, 5, "#DBDFD9");
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
}
