"use client";

import { Suspense, useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera, useTexture, View } from "@react-three/drei";
import type { Project } from "@/lib/content";
import {
  Studio,
  clamp01,
  easeInOut,
  easeOut,
  motion,
  palette,
  pinsActive,
  pointer,
  scrollProgress,
  sectionProgress,
} from "./kit";
import { Blob, Donut, Laptop, Orbit, Phone, Robot, Sphere, Tablet, useReevuScreen, type RobotDrive } from "./pieces";

const damp = (from: number, to: number, dt: number, rate = 5) => from + (to - from) * (1 - Math.exp(-dt * rate));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Local 0..1 for the slice [a, b] of a larger timeline. */
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

/* ------------------------------------------------------------------ hero */

/** Vertical fade for the bottom of the portrait (alphaMap reads the green channel). */
const portraitFade = (() => {
  if (typeof document === "undefined") return null;
  const data = new Uint8Array(4 * 64);
  for (let i = 0; i < 64; i++) {
    const v = Math.round(255 * Math.min(1, Math.max(0, (i / 63 - 0.1) / 0.28)));
    data.set([v, v, v, 255], i * 4);
  }
  const t = new THREE.DataTexture(data, 1, 64);
  // DataTextures default to nearest sampling, which shows as bands in a gradient.
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();

function Portrait() {
  const texture = useTexture("/textures/portrait.png", (t) => {
    (t as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });
  const img = texture.image as { width: number; height: number };
  const h = 4.5;
  return (
    <mesh position={[0, -0.95, 0]}>
      <planeGeometry args={[(h * img.width) / img.height, h]} />
      {/* The bottom fades into the page like the landscape behind it, instead of ending
          in a hard line where the hero's 3D box is clipped. A low alphaTest still drops
          the empty pixels around the cut-out so they never hide the orbit ring. */}
      <meshBasicMaterial map={texture} alphaMap={portraitFade} transparent alphaTest={0.02} toneMapped={false} />
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
    // The hero leaves over one viewport of scroll.
    const out = motion.reduced ? 0 : clamp01(window.scrollY / window.innerHeight);
    const intro = motion.reduced ? 1 : easeOut(clamp01(state.clock.elapsedTime / 1.4));
    // depth: pointer parallax strength; lift: scroll speed; spread: how far the layer scatters outward
    const layers: [THREE.Group | null, number, number, number][] = [
      [back.current, 0.12, -0.7, 0.35],
      [mid.current, 0.05, 0, 0],
      [front.current, 0.3, 2.2, 0.8],
    ];
    // On phones the portrait sits lower so the photo's bottom edge falls below the fold.
    const narrowDrop = size.width / size.height < 0.8 ? -0.75 : 0;
    for (const [g, depth, lift, spread] of layers) {
      if (!g) continue;
      const px = motion.reduced ? 0 : pointer.sx * depth;
      const py = motion.reduced ? 0 : pointer.sy * depth * 0.6;
      const base = g === mid.current ? narrowDrop : 0;
      g.position.x = damp(g.position.x, px, dt);
      g.position.y = damp(g.position.y, base + py + out * lift - (1 - intro) * lift * 0.4, dt, 8);
      const s = 1 + out * spread;
      g.scale.set(damp(g.scale.x, s, dt, 8), damp(g.scale.y, s, dt, 8), 1);
    }
    if (mid.current && !motion.reduced) mid.current.rotation.y = damp(mid.current.rotation.y, pointer.sx * 0.08, dt);
    // The blobs lean in toward the camera as the visitor leaves; the portrait holds its
    // size so its faded bottom never crosses the edge of the hero's 3D box.
    if (root.current) root.current.scale.setScalar(Math.min(1, (size.width / size.height) * 0.9 + 0.2));
    for (const g of [back.current, front.current]) if (g) g.position.z = damp(g.position.z, out * 1.6, dt, 8);
  });

  // Blobs keep to the edges so the title band stays clear; the portrait sits low so the
  // italic line runs behind the shoulders. `delay` staggers the pop-in on load.
  return (
    <group ref={root}>
      <group ref={back}>
        <Blob seed={1} position={[-3.35, -0.35, -2.4]} scale={0.72} color={palette.moss} delay={0.35} />
        <Blob seed={2} position={[3.45, -0.55, -2.8]} scale={0.85} color={palette.sage} amount={0.28} delay={0.5} />
        <Sphere position={[-2.45, -1.75, -1.4]} scale={0.34} color={palette.cream} delay={0.7} />
        <Donut position={[-3.5, 1.05, -2.6]} rotation={[1.1, 0.3, 0.4]} scale={0.24} color={palette.sand} delay={0.8} />
      </group>
      <group ref={mid}>
        <Suspense fallback={null}>
          <Portrait />
        </Suspense>
        <Orbit radius={1.9} position={[0, 0.35, 0]} tilt={[1.3, 0.06, 0.3]} speed={0.35} delay={0.9} />
      </group>
      <group ref={front}>
        {/* covers the photo's own crop on the right arm */}
        <Blob seed={3} position={[1.65, -2.15, 1.2]} scale={0.56} color={palette.sage} delay={0.55} />
        <Blob seed={4} position={[-1.5, -2.25, 1.3]} scale={0.38} color={palette.moss} delay={0.65} />
        <Sphere position={[-2.95, 0.35, 1.2]} scale={0.17} color={palette.cream} delay={1} />
        <Sphere position={[2.95, 0.5, 1]} scale={0.15} finish="chrome" delay={1.1} />
        <Orbit radius={0.4} position={[-3.15, 1.45, 0.3]} tilt={[1.1, 0.2, -0.4]} planetSize={0.05} speed={0.8} planet={palette.moss} delay={1.2} />
        <Sphere position={[-3.15, 1.45, 0.3]} scale={0.16} color={palette.accent} delay={1.15} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------ featured (peak) */

/**
 * The pinned RoboStars showcase, one timeline driven by scroll:
 *   0.00-0.18  the tablet swings from edge-on to face the visitor
 *   0.18-0.85  its screen scrolls the real robostarslb.com top to bottom
 *   0.30-0.55  the robot walks in from the right
 *   0.55-1.00  the robot waves; the tablet settles toward the camera
 */
function FeaturedScene({ spot, screen }: { spot: RefObject<HTMLElement | null>; screen: string }) {
  const tablet = useRef<THREE.Group>(null);
  const robot = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const drive = useRef<RobotDrive>({ walking: 0, waving: 0 });
  const progress = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const section = spot.current?.closest("[data-progress]") ?? null;
    const target = motion.reduced ? 0.6 : sectionProgress(section);
    // Smooth the timeline itself so wheel steps glide.
    progress.current = damp(progress.current, target, dt, 7);
    const p = progress.current;
    const t = motion.reduced ? 0 : state.clock.elapsedTime;

    const turn = easeOut(span(p, 0, 0.18));
    const settle = easeInOut(span(p, 0.85, 1));
    const g = tablet.current;
    if (g) {
      g.rotation.y = lerp(-1.45, -0.32, turn) + settle * 0.2 + pointer.sx * 0.12;
      g.rotation.x = -0.08 - pointer.sy * 0.06;
      g.position.set(lerp(-0.7, -0.45, turn), lerp(-1.3, 0.35, turn) + Math.sin(t * 0.9) * 0.05, settle * 0.6);
      g.scale.setScalar(lerp(0.7, 0.86, turn));
    }

    const walk = span(p, 0.3, 0.55);
    drive.current.walking = walk > 0 && walk < 1 ? 1 : 0;
    drive.current.waving = easeOut(span(p, 0.55, 0.65));
    const r = robot.current;
    if (r) {
      r.position.x = lerp(4.6, 1.15, walk);
      r.rotation.y = walk < 1 ? -1.2 : damp(r.rotation.y, -0.45, dt, 4);
    }
    if (orbit.current) orbit.current.scale.setScalar(Math.max(0.001, easeOut(span(p, 0.08, 0.3))));
  });

  const scroll = () => easeInOut(span(progress.current, 0.18, 0.85));

  return (
    <>
      <Donut position={[-2.1, 1.4, -1.8]} rotation={[0.9, 0.2, 0]} scale={0.55} color={palette.sand} />
      <Blob seed={7} position={[2.2, 1.35, -2]} scale={0.95} color={palette.sage} />
      <Blob seed={8} position={[-2.3, -1.6, 0.4]} scale={0.45} color={palette.moss} />
      <group ref={tablet}>
        <Suspense fallback={null}>
          <Tablet src={screen} scroll={scroll} />
        </Suspense>
      </group>
      <group ref={orbit}>
        <Orbit radius={2.35} position={[-0.3, 0.25, 0]} tilt={[1.35, 0, -0.25]} speed={0.2} phase={2} />
      </group>
      <group ref={robot} position={[4.6, -2.05, 1]} rotation-y={-1.2} scale={0.56}>
        <Robot drive={drive} />
      </group>
    </>
  );
}

/* --------------------------------------------------------------- devices */

/**
 * Where a work card is on its own timeline. On desktop the cards ride a sideways
 * rail, so their horizontal position drives entry and screen scroll; phones use
 * ordinary vertical scroll.
 */
function cardTimeline(card: Element | null) {
  if (!card) return { enter: 0, scroll: 0 };
  const r = card.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const vertical = clamp01((vh - r.top) / (r.height * 0.6));
  if (pinsActive()) {
    const horizontal = clamp01((vw - r.left) / (r.width * 0.7));
    return { enter: Math.min(vertical, horizontal), scroll: clamp01((vw - (r.left + r.width * 0.4)) / vw) };
  }
  return { enter: vertical, scroll: scrollProgress(card) };
}

function DeviceScene({ project, spot }: { project: Project; spot: RefObject<HTMLElement | null> }) {
  const rig = useRef<THREE.Group>(null);
  const screenScroll = useRef(0);
  const reevu = useReevuScreen();

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    // Hover and entry follow the whole card, not just the 3D box.
    const card = spot.current?.closest("article") ?? null;
    const hover = !motion.reduced && !!card?.matches(":hover");
    const { enter, scroll } = motion.reduced ? { enter: 1, scroll: 0.3 } : cardTimeline(card);
    screenScroll.current = damp(screenScroll.current, scroll, dt, 6);
    const e = easeOut(enter);
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    // Devices spin in once as they arrive, then idle-sway; hover hands control to the cursor.
    g.rotation.y = damp(g.rotation.y, (hover ? pointer.sx * 0.3 : Math.sin(t * 0.4) * 0.08) - (1 - e) * 2.4, dt, 6);
    g.rotation.x = damp(g.rotation.x, hover ? -pointer.sy * 0.15 : 0, dt);
    g.position.y = damp(g.position.y, (hover ? 0.18 : 0) - (1 - e) * 1.2, dt);
    g.scale.setScalar(damp(g.scale.x, (hover ? 1.06 : 1) * lerp(0.6, 1, e), dt));
  });

  const scroll = () => screenScroll.current;
  return (
    <>
      <Blob seed={project.id.length * 3} position={[1.6, 1, -2]} scale={0.8} color={palette.sage} />
      <Sphere position={[-1.9, -0.9, -1]} scale={0.32} color={palette.sand} />
      <group ref={rig}>
        <Suspense fallback={null}>
          {project.device === "phones" && (
            <>
              <Tablet src="/textures/sms-cleaning-site.jpg" scroll={scroll} position={[-0.55, 0.25, -0.8]} rotation-y={0.35} scale={0.75} />
              <Phone src={project.screen} scroll={scroll} position={[0.8, -0.1, 0.4]} rotation-y={-0.3} scale={0.95} />
            </>
          )}
          {project.device === "laptop" && (
            <Laptop src={project.screen} scroll={scroll} position={[0, -0.9, -0.6]} rotation={[0.32, -0.45, 0]} scale={0.95} />
          )}
          {project.device === "tablet" && (
            <Tablet
              src={project.screen === "reevu" ? undefined : project.screen}
              texture={project.screen === "reevu" ? reevu : undefined}
              scroll={scroll}
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

const MOONS = [
  { seed: 21, color: palette.sage, size: 0.22, from: [-6, 3, -2] },
  { seed: 22, color: palette.sand, size: 0.16, from: [6, 2.5, 1] },
  { seed: 23, color: palette.cream, size: 0.14, from: [-5, -3, 2] },
  { seed: 24, color: palette.moss, size: 0.2, from: [5.5, -2.5, -1] },
  { seed: 25, color: palette.accent, size: 0.12, from: [0, 4.5, 0] },
  { seed: 26, color: palette.sage, size: 0.15, from: [-6.5, 0, 1] },
  { seed: 27, color: palette.cream, size: 0.18, from: [6.5, 0.5, -2] },
] as const;

/** The resolve: loose blobs fly in from off-screen and fall into orbit around the planet, then hold. */
function ClosingScene({ spot }: { spot: RefObject<HTMLElement | null> }) {
  const planet = useRef<THREE.Group>(null);
  const moons = useRef<(THREE.Group | null)[]>([]);
  const gather = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const section = spot.current?.closest("section") ?? null;
    let target = 1;
    if (!motion.reduced && section) {
      const r = section.getBoundingClientRect();
      target = clamp01((window.innerHeight - r.top) / (r.height * 0.85));
    }
    gather.current = damp(gather.current, target, dt, 4);
    const g = easeInOut(gather.current);
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    if (planet.current) {
      planet.current.rotation.y = t * 0.15;
      planet.current.position.x = damp(planet.current.position.x, motion.reduced ? 0 : pointer.sx * 0.2, dt);
    }
    MOONS.forEach((m, i) => {
      const moon = moons.current[i];
      if (!moon) return;
      const a = (i / MOONS.length) * Math.PI * 2 + t * 0.35 * g;
      const radius = 2.1 + (i % 3) * 0.3;
      // A tilted orbital plane, like the chrome rings.
      const ox = Math.cos(a) * radius, oz = Math.sin(a) * radius;
      const oy = oz * 0.28;
      moon.position.set(lerp(m.from[0], ox, g), lerp(m.from[1], oy, g), lerp(m.from[2], oz * 0.6, g));
    });
  });

  return (
    <>
      <group ref={planet}>
        <Blob seed={11} position={[0, 0, 0]} scale={1.1} color={palette.moss} amount={0.1} speed={0.5} />
        <Orbit radius={1.85} tilt={[1.3, 0, 0.25]} speed={0.3} />
      </group>
      {MOONS.map((m, i) => (
        <group key={m.seed} ref={(el) => void (moons.current[i] = el)}>
          <Blob seed={m.seed} position={[0, 0, 0]} scale={m.size} color={m.color} amount={0.18} />
        </group>
      ))}
    </>
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
      <FeaturedScene spot={ref} screen={screen} />
    </Spot>
  );
}

export function DeviceSpot({ className, project }: { className: string; project: Project }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Spot className={className} camera={7} spotRef={ref}>
      <DeviceScene project={project} spot={ref} />
    </Spot>
  );
}

export function ClosingSpot({ className }: { className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Spot className={className} camera={9} spotRef={ref}>
      <ClosingScene spot={ref} />
    </Spot>
  );
}
