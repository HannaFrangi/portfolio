"use client";

import { Suspense, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, useTexture, View } from "@react-three/drei";
import type { Project } from "@/lib/content";
import { Studio, motion, palette, pointer, scrollProgress } from "./kit";
import { Blob, Donut, Laptop, Orbit, Phone, Robot, Sphere, Tablet, useReevuScreen } from "./pieces";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (v: number) => 1 - (1 - v) ** 3;
const damp = (from: number, to: number, dt: number, rate = 5) => from + (to - from) * (1 - Math.exp(-dt * rate));

/* ------------------------------------------------------------------ hero */

function Portrait() {
  const texture = useTexture("/textures/portrait.png", (t) => {
    (t as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });
  const img = texture.image as { width: number; height: number };
  const h = 4.5;
  return (
    <mesh position={[0, -0.95, 0]}>
      <planeGeometry args={[(h * img.width) / img.height, h]} />
      {/* alphaTest so the empty pixels around the cut-out never hide the orbit ring */}
      <meshBasicMaterial map={texture} transparent alphaTest={0.4} toneMapped={false} />
    </mesh>
  );
}

function HeroScene() {
  const back = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    // Hero leaves as the page scrolls one viewport.
    const out = clamp01(window.scrollY / window.innerHeight);
    const intro = motion.reduced ? 1 : easeOut(clamp01(state.clock.elapsedTime / 1.6));
    const layers: [THREE.Group | null, number, number][] = [
      [back.current, 0.12, -0.7],
      [mid.current, 0.05, 0],
      [front.current, 0.3, 2.2],
    ];
    for (const [g, depth, lift] of layers) {
      if (!g) continue;
      const px = motion.reduced ? 0 : pointer.sx * depth;
      const py = motion.reduced ? 0 : pointer.sy * depth * 0.6;
      g.position.x = damp(g.position.x, px, dt);
      g.position.y = damp(g.position.y, py + out * lift - (1 - intro) * (lift + 0.8), dt, 8);
    }
    if (mid.current && !motion.reduced) mid.current.rotation.y = damp(mid.current.rotation.y, pointer.sx * 0.08, dt);
    // Phones get a smaller, centred composition.
    if (root.current) root.current.scale.setScalar(Math.min(1, (size.width / size.height) * 0.9 + 0.2));
  });

  // Blobs keep to the edges so the title band stays clear; the portrait sits low so the
  // italic line runs behind the shoulders.
  return (
    <group ref={root}>
      <group ref={back}>
        <Blob seed={1} position={[-3.35, -0.35, -2.4]} scale={0.72} color={palette.moss} />
        <Blob seed={2} position={[3.45, -0.55, -2.8]} scale={0.85} color={palette.sage} amount={0.28} />
        <Sphere position={[-2.45, -1.75, -1.4]} scale={0.34} color={palette.cream} />
        <Donut position={[-3.5, 1.05, -2.6]} rotation={[1.1, 0.3, 0.4]} scale={0.24} color={palette.sand} />
      </group>
      <group ref={mid}>
        <Suspense fallback={null}>
          <Portrait />
        </Suspense>
        <Orbit radius={1.9} position={[0, 0.35, 0]} tilt={[1.3, 0.06, 0.3]} speed={0.35} />
      </group>
      <group ref={front}>
        {/* covers the photo's own crop on the right arm */}
        <Blob seed={3} position={[1.65, -2.15, 1.2]} scale={0.56} color={palette.sage} />
        <Blob seed={4} position={[-1.5, -2.25, 1.3]} scale={0.38} color={palette.moss} />
        <Sphere position={[-2.95, 0.35, 1.2]} scale={0.17} color={palette.cream} />
        <Sphere position={[2.95, 0.5, 1]} scale={0.15} finish="chrome" />
        <Orbit radius={0.4} position={[-3.15, 1.45, 0.3]} tilt={[1.1, 0.2, -0.4]} planetSize={0.05} speed={0.8} planet={palette.moss} />
        <Sphere position={[-3.15, 1.45, 0.3]} scale={0.16} color={palette.accent} />
      </group>
    </group>
  );
}

/* -------------------------------------------------------------- featured */

function FeaturedScene({ track, screen }: { track: RefObject<HTMLElement | null>; screen: string }) {
  const tablet = useRef<THREE.Group>(null);
  const robot = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const enter = motion.reduced ? 1 : easeOut(clamp01((scrollProgress(track.current) - 0.12) / 0.3));
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    const g = tablet.current;
    if (g) {
      g.rotation.y = damp(g.rotation.y, -0.38 - (1 - enter) * 0.9 + pointer.sx * 0.15, dt);
      g.rotation.x = damp(g.rotation.x, -0.08 - pointer.sy * 0.08, dt);
      g.position.y = damp(g.position.y, 0.25 - (1 - enter) * 1.6 + Math.sin(t * 0.9) * 0.06, dt);
    }
    const r = robot.current;
    if (r) r.position.x = damp(r.position.x, 1.75 + (1 - enter) * 2.5, dt, 4);
  });
  return (
    <>
      <Donut position={[-1.9, 1.3, -1.8]} rotation={[0.9, 0.2, 0]} scale={0.55} color={palette.sand} />
      <Blob seed={7} position={[2.1, 1.25, -2]} scale={0.95} color={palette.sage} />
      <Blob seed={8} position={[-2.1, -1.5, 0.4]} scale={0.45} color={palette.moss} />
      <group ref={tablet} position={[-0.25, 0.25, 0]}>
        <Suspense fallback={null}>
          <Tablet src={screen} />
        </Suspense>
      </group>
      <Orbit radius={2.35} position={[-0.2, 0.2, 0]} tilt={[1.35, 0, -0.25]} speed={0.2} phase={2} />
      <group ref={robot} position={[1.75, -2.05, 0.9]} rotation-y={-0.45} scale={0.62}>
        <Robot />
      </group>
    </>
  );
}

/* --------------------------------------------------------------- devices */

function DeviceScene({ project, track }: { project: Project; track: RefObject<HTMLElement | null> }) {
  const rig = useRef<THREE.Group>(null);
  const reevu = useReevuScreen();
  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    // Hover and entry follow the whole card, not just the 3D box.
    const card = track.current?.closest("article") ?? track.current;
    const hover = !motion.reduced && !!card?.matches(":hover");
    const enter = motion.reduced ? 1 : easeOut(clamp01((scrollProgress(card) - 0.05) / 0.3));
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    g.rotation.y = damp(g.rotation.y, (hover ? pointer.sx * 0.25 : Math.sin(t * 0.4) * 0.08) - (1 - enter) * 0.7, dt);
    g.rotation.x = damp(g.rotation.x, hover ? -pointer.sy * 0.15 : 0, dt);
    g.position.y = damp(g.position.y, (hover ? 0.18 : 0) - (1 - enter) * 1.2, dt);
    const s = hover ? 1.05 : 1;
    g.scale.setScalar(damp(g.scale.x, s, dt));
  });
  return (
    <>
      <Blob seed={project.id.length * 3} position={[1.6, 1, -2]} scale={0.8} color={palette.sage} />
      <Sphere position={[-1.9, -0.9, -1]} scale={0.32} color={palette.sand} />
      <group ref={rig}>
        <Suspense fallback={null}>
          {project.device === "phones" && (
            <>
              <Tablet src="/textures/sms-cleaning-desktop.jpg" position={[-0.55, 0.25, -0.8]} rotation-y={0.35} scale={0.75} />
              <Phone src={project.screen} position={[0.8, -0.1, 0.4]} rotation-y={-0.3} scale={0.95} />
            </>
          )}
          {project.device === "laptop" && <Laptop src={project.screen} position={[0, -0.9, -0.6]} rotation={[0.32, -0.45, 0]} scale={0.95} />}
          {project.device === "tablet" && (
            <Tablet
              src={project.screen === "reevu" ? undefined : project.screen}
              texture={project.screen === "reevu" ? reevu : undefined}
              rotation={[-0.05, -0.3, 0.04]}
              scale={0.9}
            />
          )}
        </Suspense>
      </group>
    </>
  );
}

/* --------------------------------------------------------------- closing */

function ClosingScene() {
  const planet = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!planet.current || motion.reduced) return;
    const dt = Math.min(delta, 1 / 30);
    planet.current.rotation.y += dt * 0.15;
    planet.current.position.x = damp(planet.current.position.x, pointer.sx * 0.2, dt);
  });
  return (
    <group ref={planet}>
      <Blob seed={11} position={[0, 0, 0]} scale={1.15} color={palette.moss} amount={0.1} speed={0.5} />
      <Orbit radius={1.9} tilt={[1.3, 0, 0.25]} speed={0.3} />
      <Orbit radius={2.5} tilt={[1.15, 0.3, -0.35]} speed={-0.18} planet={palette.sand} planetSize={0.16} phase={1.5} />
      <Sphere position={[2.6, 1.2, -1]} scale={0.3} color={palette.cream} />
      <Sphere position={[-2.4, -1, 0.5]} scale={0.18} finish="chrome" />
    </group>
  );
}

/* ----------------------------------------------------------------- spots */

/**
 * A DOM box the shared canvas renders into (drei View). The box keeps its place
 * in the layout; the 3D is painted over it by the fixed canvas.
 */
function Spot({
  className,
  camera = 8,
  fov = 30,
  children,
  spotRef,
}: {
  className: string;
  camera?: number;
  fov?: number;
  children: React.ReactNode;
  spotRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={spotRef} className={className} aria-hidden>
      <View className="absolute inset-0">
        <PerspectiveCamera makeDefault position={[0, 0, camera]} fov={fov} />
        <Studio />
        {children}
      </View>
    </div>
  );
}

export function HeroSpot({ className }: { className: string }) {
  return (
    <Spot className={className} camera={9}>
      <HeroScene />
    </Spot>
  );
}

export function FeaturedSpot({ className, screen }: { className: string; screen: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Spot className={className} spotRef={ref}>
      <FeaturedScene track={ref} screen={screen} />
    </Spot>
  );
}

export function DeviceSpot({ className, project }: { className: string; project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Spot className={className} camera={7} spotRef={ref}>
      <DeviceScene project={project} track={ref} />
    </Spot>
  );
}

export function ClosingSpot({ className }: { className: string }) {
  return (
    <Spot className={className} camera={9}>
      <ClosingScene />
    </Spot>
  );
}
