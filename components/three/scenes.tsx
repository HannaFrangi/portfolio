"use client";

import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
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
import {
  Blob,
  Car,
  Laptop,
  LogoBadge,
  logoParts,
  Orbit,
  Phone,
  Pod,
  Robot,
  Sphere,
  Tablet,
  useReevuScreen,
  type CarDrive,
  type RobotDrive,
} from "./pieces";

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
    <mesh position={[0, -1.5, 0]}>
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
  const car = useRef<THREE.Group>(null);
  const carDrive = useRef<CarDrive>({ speed: 0, lights: 1 });
  const pod = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
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

    // The car rolls in on load, then drives off to the right as the hero scrolls away,
    // passing behind the portrait. Wheel spin follows its actual speed.
    const c = car.current;
    if (c) {
      const arrive = motion.reduced ? 1 : easeOut(clamp01((time - 1.3) / 2));
      const x = lerp(-7.5, -1.3, arrive) + out * 7;
      carDrive.current.speed = dt > 0 ? (x - c.position.x) / dt : 0;
      c.position.x = x;
    }

    // The pod lifts off the horizon behind the portrait and drifts up and out, on a loop.
    const pd = pod.current;
    if (pd) {
      const cycle = motion.reduced ? 0.15 : ((time + 4) % 22) / 22;
      const fly = easeInOut(clamp01(cycle / 0.6));
      pd.position.set(lerp(1.1, 4.8, fly), lerp(-1.25, 1.35, fly) + Math.sin(time * 2) * 0.03, -4.5);
      pd.rotation.set(0.15, time * 0.6, lerp(0, -0.25, fly));
      pd.visible = cycle < 0.62;
    }
    // The blobs lean in toward the camera as the visitor leaves; the portrait holds its
    // size so its faded bottom never crosses the edge of the hero's 3D box.
    if (root.current) root.current.scale.setScalar(Math.min(1, (size.width / size.height) * 0.9 + 0.2));
    for (const g of [back.current, front.current]) if (g) g.position.z = damp(g.position.z, out * 1.6, dt, 8);
  });

  // Distilled: one blob per side, the orbit ring and the car. The portrait sits below the
  // title so the full job title reads; blobs keep clear of the title band and the side cards.
  return (
    <group ref={root}>
      <group ref={back}>
        <Blob seed={1} position={[-3.6, -0.55, -2.4]} scale={0.68} color={palette.moss} delay={0.35} />
        <Blob seed={2} position={[3.7, -0.2, -2.8]} scale={0.72} color={palette.sage} amount={0.28} delay={0.5} />
      </group>
      <group ref={mid}>
        <Suspense fallback={null}>
          <Portrait />
        </Suspense>
        <Orbit radius={1.9} position={[0, -0.3, 0]} tilt={[1.3, 0.06, 0.3]} speed={0.35} delay={0.9} />
      </group>
      <group ref={pod} scale={0.32}>
        <Pod />
      </group>
      <group ref={car} position={[-7.5, -1.75, -0.9]} rotation-y={-0.12} scale={0.6}>
        <Car drive={carDrive} />
      </group>
      <group ref={front}>
        {/* covers the photo's own crop on the right arm */}
        <Blob seed={3} position={[1.65, -2.6, 1.2]} scale={0.56} color={palette.sage} delay={0.55} />
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

    // The view bleeds past its grid column (so props are never sliced mid-page); shift the
    // camera by half the uneven bleed so the composition stays centred on the column.
    const el = spot.current;
    const col = el?.parentElement;
    if (el && col) {
      const a = el.getBoundingClientRect();
      const b = col.getBoundingClientRect();
      const worldPerPx = (2 * 8 * Math.tan(THREE.MathUtils.degToRad(15))) / Math.max(1, a.height);
      state.camera.position.x = ((a.right - b.right - (b.left - a.left)) / 2) * worldPerPx;
    }

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
      r.position.x = lerp(7.5, 1.15, walk);
      r.rotation.y = walk < 1 ? -1.2 : damp(r.rotation.y, -0.45, dt, 4);
    }
    if (orbit.current) orbit.current.scale.setScalar(Math.max(0.001, easeOut(span(p, 0.08, 0.3))));
  });

  const scroll = () => easeInOut(span(progress.current, 0.18, 0.85));

  return (
    <>
      {/* The client's logo assembles itself as the tablet swings round, then floats top-left. */}
      <LogoBadge assemble={() => span(progress.current, 0.03, 0.24)} position={[1.3, 0.85, 0.9]} scale={1.05} />
      <Blob seed={7} position={[2.3, 0.4, -2.4]} scale={0.95} color={palette.sage} />
      <Blob seed={8} position={[-1.7, -1.75, 0.4]} scale={0.42} color={palette.moss} />
      <group ref={tablet}>
        <Suspense fallback={null}>
          <Tablet src={screen} scroll={scroll} />
        </Suspense>
      </group>
      <group ref={orbit}>
        <Orbit radius={2.35} position={[-0.3, 0.25, 0]} tilt={[1.35, 0, -0.25]} speed={0.2} phase={2} />
      </group>
      <group ref={robot} position={[7.5, -2.05, 1]} rotation-y={-1.2} scale={0.56}>
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

/* ------------------------------------------------------- memory card icon */

/**
 * Soft Club works browser: each project's device spins on a pedestal like a PS2
 * memory-card save icon. The selected one grows and spins faster; screens idle-scroll.
 */
function IconScene({ project, selected }: { project: Project; selected: boolean }) {
  const spin = useRef<THREE.Group>(null);
  const reevu = useReevuScreen();
  const idle = useRef(0);
  useFrame((state, delta) => {
    const g = spin.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    // Sway rather than spin, so the live site on each screen stays in view; the
    // selected save swings wider and livelier, like the highlighted PS2 icon.
    const sway = selected ? Math.sin(t * 1.3) * 0.75 : Math.sin(t * 0.7) * 0.35;
    g.rotation.y = damp(g.rotation.y, motion.reduced ? -0.25 : sway, dt, 4);
    g.position.y = damp(g.position.y, (selected ? 0.25 : 0) + Math.sin(t * 1.6) * 0.08, dt, 6);
    g.scale.setScalar(damp(g.scale.x, selected ? 1.08 : 0.84, dt, 6));
    idle.current = motion.reduced ? 0.2 : (Math.sin(t * 0.35) + 1) / 2;
  });
  const scroll = () => idle.current;
  // Tilted toward the camera so the glowing pedestal reads as a disc, not a line.
  return (
    <group rotation-x={0.32} position={[0, 0.2, 0]}>
      {/* pedestal: a glowing jelly disc */}
      <mesh position={[0, -1.55, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[1.5, 64]} />
        <meshBasicMaterial color={selected ? "#bcd2ff" : "#dfe6fb"} transparent opacity={0.85} toneMapped={false} />
      </mesh>
      <Orbit radius={1.55} position={[0, -1.5, 0]} tilt={[Math.PI / 2, 0, 0]} speed={selected ? 1.2 : 0.4} planetSize={0.07} />
      <group ref={spin}>
        <Suspense fallback={null}>
          {project.device === "phones" && <Phone src={project.screen} scroll={scroll} position={[0, -0.15, 0]} scale={0.92} />}
          {project.device === "laptop" && <Laptop src={project.screen} scroll={scroll} position={[0, -1.05, -0.75]} scale={0.95} />}
          {project.device === "tablet" && (
            <Tablet
              src={project.screen === "reevu" ? undefined : project.screen}
              texture={project.screen === "reevu" ? reevu : undefined}
              scroll={scroll}
              scale={0.95}
            />
          )}
        </Suspense>
      </group>
    </group>
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
  const car = useRef<THREE.Group>(null);
  const carDrive = useRef<CarDrive>({ speed: 0, lights: 1 });

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
    // The car from the hero pulls up and parks by the planet; headlights blink once it stops.
    const c = car.current;
    if (c) {
      const x = lerp(-8, -3.1, easeOut(clamp01(gather.current * 1.15)));
      carDrive.current.speed = dt > 0 ? (x - c.position.x) / dt : 0;
      carDrive.current.lights = Math.abs(carDrive.current.speed) < 0.05 ? (Math.sin(t * 3) > 0 ? 1 : 0.2) : 1;
      c.position.x = x;
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
      <group ref={car} position={[-8, -1.45, 0.6]} rotation-y={-0.35} scale={0.6}>
        <Car drive={carDrive} />
      </group>
      {MOONS.map((m, i) => (
        <group key={m.seed} ref={(el) => void (moons.current[i] = el)}>
          <Blob seed={m.seed} position={[0, 0, 0]} scale={m.size} color={m.color} amount={0.18} />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------------ robot buddy */

/**
 * A mini robot that lives in the corner of the screen. It watches the cursor, waves
 * when a new section arrives, hops when you hover a link, and dozes off when idle.
 */
function BuddyScene() {
  const hop = useRef<THREE.Group>(null);
  const drive = useRef<RobotDrive>({ walking: 0, waving: 0, lookX: 0, lookY: 0, sleep: 0 });
  const state = useRef({ section: -1, waveUntil: 0, hopAt: -10, lastActive: 0, frame: 0, show: 0 });

  useEffect(() => {
    const s = state.current;
    const wake = () => (s.lastActive = performance.now());
    const onOver = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest("a, button")) s.hopAt = performance.now();
    };
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerover", onOver, { passive: true });
    wake();
    return () => {
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerover", onOver);
    };
  }, []);

  useFrame((_, delta) => {
    const s = state.current;
    const d = drive.current;
    const now = performance.now();
    const dt = Math.min(delta, 1 / 30);
    if (motion.reduced) {
      if (hop.current) hop.current.position.y = window.scrollY > window.innerHeight * 0.6 ? -1.55 : -6;
      return;
    }

    // Which section holds the middle of the screen? Checked every few frames.
    if (s.frame++ % 6 === 0) {
      const mid = window.innerHeight / 2;
      const sections = document.querySelectorAll("main > section");
      let idx = -1;
      sections.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid && getComputedStyle(el).display !== "none") idx = i;
      });
      if (idx !== s.section) {
        if (s.section !== -1 && idx !== -1) s.waveUntil = now + 1800;
        s.section = idx;
      }
    }

    // It sits bottom-right, so "looking at the cursor" is relative to that corner.
    d.lookX = clamp01((pointer.x + 1) / 2) * 2 - 1.6;
    d.lookY = pointer.y + 0.7;
    d.sleep = damp(d.sleep ?? 0, now - s.lastActive > 9000 ? 1 : 0, dt, 2);
    d.waving = damp(d.waving, now < s.waveUntil ? 1 : 0, dt, 6);
    // Waits below the screen during the hero (so it never covers the call to action),
    // then pops up once the visitor scrolls on.
    // ...and ducks out over the pinned showcase, the works, About and the game, where it
    // would sit on top of text or a second robot.
    const mid = window.innerHeight / 2;
    const busy = ["work", "works", "about", "build"].some((id) => {
      const r = document.getElementById(id)?.getBoundingClientRect();
      return !!r && r.height > 0 && r.top <= mid && r.bottom >= mid;
    });
    // Phones have no free corner, so there it only comes out for the ending.
    const closing = document.getElementById("closing")?.getBoundingClientRect();
    const narrowOk = window.innerWidth >= 768 || (!!closing && closing.top < window.innerHeight * 0.7);
    s.show = damp(s.show, window.scrollY > window.innerHeight * 0.6 && !busy && narrowOk ? 1 : 0, dt, 5);
    const k = (now - s.hopAt) / 450;
    if (hop.current)
      hop.current.position.y = -1.55 - (1 - s.show) * 4 + (k >= 0 && k < 1 ? Math.sin(Math.PI * k) * 0.45 : 0);
  });

  return (
    <group ref={hop} position={[0, -5.5, 0]} rotation-y={-0.35}>
      <Robot drive={drive} />
    </group>
  );
}

/* ------------------------------------------------------ build-a-robot game */

export type BuilderCommand = { type: "scatter" | "build"; n: number };

const SNAP = 0.2; // how close (badge units) a piece must land to click into place

/**
 * The RoboStars logo in pieces on a table. Drag each piece onto its outline; within
 * SNAP it clicks home. All six placed: a victory spin and a sparkle burst.
 */
function BuilderScene({
  command,
  interactive,
  onProgress,
}: {
  command: BuilderCommand;
  interactive: boolean;
  onProgress: (placed: number) => void;
}) {
  const parts = useMemo(() => logoParts(), []);
  const board = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const sparkles = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  const game = useRef({
    pos: parts.map(() => new THREE.Vector3()),
    rot: parts.map(() => 0),
    placed: parts.map(() => false),
    dragging: -1,
    grab: new THREE.Vector3(),
    won: -10,
    reported: -1,
  });
  const scratch = useMemo(() => ({ plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit: new THREE.Vector3() }), []);

  // Scatter across the table, away from the outline in the middle.
  const scatter = () => {
    const g = game.current;
    const half = Math.max(1, (size.width / size.height) * 1.1 - 0.3);
    parts.forEach((_, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      g.pos[i].set(side * (0.6 + Math.random() * (half - 0.6)), (Math.random() - 0.5) * 0.9, 0);
      g.rot[i] = (Math.random() - 0.5) * 1.6;
      g.placed[i] = false;
    });
    g.won = -10;
  };

  useEffect(() => {
    const g = game.current;
    if (command.type === "build") g.placed = g.placed.map(() => true);
    else scatter();
    // `scatter` reads layout at call time; re-running on resize would reshuffle a game in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.n]);

  useFrame((state, delta) => {
    const g = game.current;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    parts.forEach((_, i) => {
      const m = meshes.current[i];
      if (!m) return;
      if (g.placed[i]) {
        // Glide home and square up.
        const k = motion.reduced ? 1 : 1 - Math.exp(-dt * 12);
        g.pos[i].lerp(new THREE.Vector3(), k);
        g.rot[i] += (0 - g.rot[i]) * k;
      }
      const floating = !g.placed[i] && g.dragging !== i && !motion.reduced;
      m.position.set(g.pos[i].x, g.pos[i].y + (floating ? Math.sin(t * 1.5 + i) * 0.02 : 0), g.dragging === i ? 0.25 : 0);
      m.rotation.set(0, 0, g.rot[i]);
      const lift = g.dragging === i ? 1.08 : 1;
      m.scale.setScalar(damp(m.scale.x, lift, dt, 12));
    });

    // Dev-only: where each piece and its home are on screen (NDC), for the drag test harness.
    if (process.env.NODE_ENV !== "production" && board.current) {
      const cam = state.camera;
      const ndc = (v: THREE.Vector3) => board.current!.localToWorld(v.clone()).project(cam);
      // A point guaranteed to be on each piece (centroid of its first front-face triangle),
      // turned by the piece's current rotation. Grab there, drop at the same point minus
      // the piece's offset, and the piece lands home: what a person does by eye.
      const onPiece = (i: number) => {
        const a = parts[i].geo.attributes.position;
        const c = new THREE.Vector3(
          (a.getX(0) + a.getX(1) + a.getX(2)) / 3,
          (a.getY(0) + a.getY(1) + a.getY(2)) / 3,
          0,
        );
        return c.applyAxisAngle(new THREE.Vector3(0, 0, 1), g.rot[i]);
      };
      (window as unknown as { __builder: unknown }).__builder = {
        pieces: g.pos.map((p, i) => ndc(p.clone().add(onPiece(i)))),
        homes: parts.map((_, i) => ndc(onPiece(i))),
        placed: [...g.placed],
      };
    }

    const placed = g.placed.filter(Boolean).length;
    if (placed !== g.reported) {
      g.reported = placed;
      if (placed === parts.length && g.won < 0) g.won = t;
      onProgress(placed);
    }

    // Victory: one full spin with a pop, and sparkles flying out.
    const since = g.won < 0 ? -1 : t - g.won;
    if (board.current) {
      const k = since < 0 || motion.reduced ? 0 : clamp01(since / 1.4);
      board.current.rotation.y = easeInOut(k) * Math.PI * 2;
      board.current.scale.setScalar(1 + Math.sin(Math.PI * k) * 0.12);
    }
    if (sparkles.current) {
      const k = since < 0 ? 1 : clamp01(since / 1.6);
      sparkles.current.visible = since >= 0 && k < 1 && !motion.reduced;
      sparkles.current.children.forEach((c, i) => {
        const a = (i / sparkles.current!.children.length) * Math.PI * 2;
        const r = easeOut(k) * 1.4;
        c.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.3);
        c.scale.setScalar((1 - k) * 0.06);
      });
    }
  });

  // Dragging happens on the z = 0 plane of the board.
  const toBoard = (e: ThreeEvent<PointerEvent>) => {
    if (!e.ray.intersectPlane(scratch.plane, scratch.hit) || !board.current) return null;
    return board.current.worldToLocal(scratch.hit.clone());
  };

  const onDown = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const g = game.current;
    if (!interactive || g.placed[i] || g.dragging !== -1) return;
    e.stopPropagation();
    const p = toBoard(e);
    if (!p) return;
    g.dragging = i;
    g.grab.copy(p).sub(g.pos[i]);
    (e.target as Element).setPointerCapture?.(e.pointerId);
    document.body.style.cursor = "grabbing";
  };
  const onMove = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const g = game.current;
    if (g.dragging !== i) return;
    const p = toBoard(e);
    if (p) g.pos[i].copy(p.sub(g.grab)).setZ(0);
  };
  const onUp = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    const g = game.current;
    if (g.dragging !== i) return;
    g.dragging = -1;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    document.body.style.cursor = "";
    if (g.pos[i].length() < SNAP) g.placed[i] = true;
  };

  return (
    <group ref={board} scale={1.8}>
      {/* the outline to build onto */}
      {parts.map((part, i) => (
        <mesh key={`ghost-${i}`} geometry={part.geo} position={[0, 0, -0.12]} scale={[1, 1, 0.05]}>
          <meshBasicMaterial color={palette.olive} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
      {parts.map((part, i) => (
        <mesh
          key={i}
          ref={(m) => void (meshes.current[i] = m)}
          geometry={part.geo}
          onPointerDown={onDown(i)}
          onPointerMove={onMove(i)}
          onPointerUp={onUp(i)}
          onPointerOver={() => {
            if (!game.current.placed[i] && game.current.dragging === -1) document.body.style.cursor = "grab";
          }}
          onPointerOut={() => {
            if (game.current.dragging === -1) document.body.style.cursor = "";
          }}
        >
          <meshPhysicalMaterial color={part.color} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
      ))}
      <group ref={sparkles} visible={false}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i % 2 ? "#f58220" : "#1791c8"} emissive={i % 2 ? "#f58220" : "#1791c8"} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
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

export function MemoryIcon({ className, project, selected }: { className: string; project: Project; selected: boolean }) {
  return (
    <Spot className={className} camera={6.2}>
      <IconScene project={project} selected={selected} />
    </Spot>
  );
}

export function BuddySpot({ className }: { className: string }) {
  return (
    <Spot className={className} camera={7}>
      <BuddyScene />
    </Spot>
  );
}

export function BuilderSpot({
  className,
  command,
  interactive,
  onProgress,
}: {
  className: string;
  command: BuilderCommand;
  interactive: boolean;
  onProgress: (placed: number) => void;
}) {
  return (
    <Spot className={className} camera={5}>
      <BuilderScene command={command} interactive={interactive} onProgress={onProgress} />
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
