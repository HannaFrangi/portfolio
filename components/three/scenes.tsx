"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useQuality } from "@/lib/quality";
import { useFlavor, useTheme } from "@/lib/theme";
import { PerspectiveCamera, useTexture, View } from "@react-three/drei";
import type { Project } from "@/lib/content";
import {
  FinishMaterial,
  Studio,
  clamp01,
  easeInOut,
  easeOut,
  motion,
  palette,
  pinsActive,
  pointer,
  sectionProgress,
  useFlavorColors,
} from './kit';
import {
  Bubbles,
  Laptop,
  LiquidChrome,
  LogoBadge,
  logoParts,
  Orbit,
  Phone,
  Robot,
  Sphere,
  Tablet,
  useReevuScreen,
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

/** Sharpens the cut-out's soft edge so the faint light fringe from the original photo drops out. */
const tightenMatte = (shader: { fragmentShader: string }) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <map_fragment>",
    "#include <map_fragment>\n  diffuseColor.a = smoothstep(0.35, 0.8, diffuseColor.a);",
  );
};

/** Top of the head in the portrait's own space: the plane spans -3.75..0.75 and the
 *  photo has ~9% of headroom above the hair. */
const HEAD_TOP = 0.33;

function Portrait() {
  const texture = useTexture("/textures/portrait.png", (t) => {
    (t as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
  });
  // The static portrait in the page shows until this 3D one exists, then steps aside.
  useEffect(() => {
    document.documentElement.dataset.portrait = "3d";
  }, []);
  // Night shift: cooled to the night sky, a touch dimmer than the screens.
  const dark = useTheme() === "dark";
  const aqua = useFlavor() === "aqua";
  const img = texture.image as { width: number; height: number };
  const h = 4.5;
  return (
    <mesh position={[0, -1.5, 0]}>
      <planeGeometry args={[(h * img.width) / img.height, h]} />
      {/* The bottom fades into the page like the landscape behind it, instead of ending
          in a hard line where the hero's 3D box is clipped. A low alphaTest still drops
          the empty pixels around the cut-out so they never hide the orbit ring. */}
      <meshBasicMaterial
        map={texture}
        color={dark ? (aqua ? "#cdd6f2" : "#d0e8d6") : "#ffffff"}
        alphaMap={portraitFade}
        transparent
        alphaTest={0.02}
        toneMapped={false}
        onBeforeCompile={tightenMatte}
      />
    </mesh>
  );
}

function HeroScene() {
  const back = useRef<THREE.Group>(null);
  const mid = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const root = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  // Highest the top of the head may sit (world y, before the root scale) without covering
  // the "See my work" button. Short phone screens (Safari with its toolbars) need it.
  const headCeiling = useRef<number | null>(null);

  useEffect(() => {
    const measure = () => {
      const hero = document.getElementById("top");
      const cta = hero?.querySelector<HTMLElement>('a[href="#work"]');
      if (!hero || !cta) return;
      // offsetTop, not getBoundingClientRect: the button rises in on load, and the
      // transform would put it higher than where it comes to rest.
      let bottom = cta.offsetHeight;
      for (let el: HTMLElement | null = cta; el && el !== hero; el = el.offsetParent as HTMLElement | null) {
        bottom += el.offsetTop;
      }
      const halfHeight = 9 * Math.tan(Math.PI / 12); // camera 9, fov 30, at the portrait's depth
      headCeiling.current = halfHeight * (1 - (2 * (bottom + 16)) / hero.offsetHeight);
    };
    measure();
    // Re-measure whenever the hero copy reflows: web fonts swapping in push the button down.
    const copy = document.querySelector('#top a[href="#work"]')?.parentElement?.parentElement;
    const observer = new ResizeObserver(measure);
    if (copy) observer.observe(copy);
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const rootScale = Math.min(1, (size.width / size.height) * 0.9 + 0.2);
    // The hero leaves over one viewport of scroll.
    const out = motion.reduced ? 0 : clamp01(window.scrollY / window.innerHeight);
    const intro = motion.reduced ? 1 : easeOut(clamp01(state.clock.elapsedTime / 1.4));
    // depth: pointer parallax strength; lift: scroll speed; spread: how far the layer scatters outward
    const layers: [THREE.Group | null, number, number, number][] = [
      [back.current, 0.12, -0.7, 0.35],
      [mid.current, 0.05, 0, 0],
      [front.current, 0.3, 2.2, 0.8],
    ];
    // On phones the portrait sits lower so the photo's bottom edge falls below the fold,
    // and lower still if the head would otherwise cover the button.
    let portraitY = size.width / size.height < 0.8 ? -0.75 : 0;
    if (headCeiling.current !== null) portraitY = Math.min(portraitY, headCeiling.current / rootScale - HEAD_TOP);
    for (const [g, depth, lift, spread] of layers) {
      if (!g) continue;
      const px = motion.reduced ? 0 : pointer.sx * depth;
      const py = motion.reduced ? 0 : pointer.sy * depth * 0.6;
      const base = g === mid.current ? portraitY : 0;
      g.position.x = damp(g.position.x, px, dt);
      g.position.y = damp(g.position.y, base + py + out * lift - (1 - intro) * lift * 0.4, dt, 8);
      const s = 1 + out * spread;
      g.scale.set(damp(g.scale.x, s, dt, 8), damp(g.scale.y, s, dt, 8), 1);
    }
    if (mid.current && !motion.reduced) mid.current.rotation.y = damp(mid.current.rotation.y, pointer.sx * 0.08, dt);

    // The blobs lean in toward the camera as the visitor leaves; the portrait holds its
    // size so its faded bottom never crosses the edge of the hero's 3D box.
    if (root.current) root.current.scale.setScalar(rootScale);
    for (const g of [back.current, front.current]) if (g) g.position.z = damp(g.position.z, out * 1.6, dt, 8);
  });

  // Four planes: far bubbles and the big drop of liquid chrome, the portrait inside its
  // chrome orbit, then a smaller chrome drop and a few bubbles in front of everything.
  // The pieces keep clear of the title band and the pitch card.
  return (
    <group ref={root}>
      <group ref={back}>
        {/* The canvas paints over the page, so bubbles stay below the title and button. */}
        <Bubbles count={16} box={[11, 3.6, 2]} center={[0, -1.5, -3.4]} size={[0.07, 0.3]} seed={2} delay={0.6} />
        <LiquidChrome position={[3.55, 0.15, -2.6]} scale={0.92} delay={0.45} />
        <Sphere position={[-3.55, -0.55, -2.2]} scale={0.62} finish="glass" delay={0.35} />
        <Sphere position={[-2.85, 0.65, -2.8]} scale={0.17} delay={0.55} />
        <Sphere position={[-2.6, -1.45, -1.6]} scale={0.13} finish="plastic" color={palette.lime} delay={0.7} />
      </group>
      <group ref={mid}>
        <Suspense fallback={null}>
          <Portrait />
        </Suspense>
        <Orbit radius={1.9} position={[0, -0.3, 0]} tilt={[1.3, 0.06, 0.3]} speed={0.35} delay={0.9} />
      </group>
      <group ref={front}>
        {/* covers the photo's own crop on the right arm */}
        <LiquidChrome position={[1.65, -2.6, 1.2]} scale={0.5} reach={0.22} calm={0.12} delay={0.55} />
        <Bubbles count={6} box={[8, 2.2, 1]} center={[0, -1.7, 2.2]} size={[0.05, 0.13]} seed={5} rise={0.26} delay={0.9} />
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

    // The view bleeds past its grid column (right and down) so props are never sliced
    // mid-page. Re-frame so the composition keeps the scale and centre it has on the column:
    // widen the vertical FOV for the extra height, and shift the camera by half each bleed.
    const el = spot.current;
    const col = el?.parentElement;
    const cam = state.camera as THREE.PerspectiveCamera;
    if (el && col && cam.isPerspectiveCamera) {
      const a = el.getBoundingClientRect();
      const b = col.getBoundingClientRect();
      const half = Math.tan(THREE.MathUtils.degToRad(15)); // base fov 30 over the column height
      const fov = THREE.MathUtils.radToDeg(2 * Math.atan((half * a.height) / Math.max(1, b.height)));
      if (Math.abs(cam.fov - fov) > 0.01) {
        cam.fov = fov;
        cam.updateProjectionMatrix();
      }
      const worldPerPx = (2 * 8 * half) / Math.max(1, b.height);
      cam.position.x = ((a.right - b.right - (b.left - a.left)) / 2) * worldPerPx;
      cam.position.y = -((a.bottom - b.bottom - (b.top - a.top)) / 2) * worldPerPx;
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
      <LiquidChrome position={[2.3, 0.4, -2.4]} scale={0.8} reach={0.25} />
      <Sphere position={[-1.7, -1.5, 0.4]} scale={0.42} finish="glass" />
      <Bubbles count={8} box={[7, 4.5, 2]} center={[0.5, 0, -1.2]} size={[0.05, 0.18]} seed={7} />
      <group ref={tablet}>
        <Suspense fallback={null}>
          <Tablet src={screen} scroll={scroll} />
        </Suspense>
      </group>
      <group ref={orbit}>
        <Orbit radius={2.35} position={[-0.3, 0.25, 0]} tilt={[1.35, 0, -0.25]} speed={0.2} phase={2} />
      </group>
      <group ref={robot} position={[7.5, -1.85, 1]} rotation-y={-1.2} scale={0.5}>
        <Robot drive={drive} />
      </group>
    </>
  );
}

/* --------------------------------------------------------------- devices */

/**
 * Where a work card is on its own timeline. On desktop the cards ride a sideways
 * rail, so their horizontal position drives entry and screen scroll; phones use
 * ordinary vertical scroll. The screen sits at the top of the site while its card
 * arrives and reaches the bottom as the card leaves, so nobody lands mid-page.
 */
function cardTimeline(card: Element | null, box: Element | null) {
  if (!card) return { enter: 0, scroll: 0 };
  const r = card.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const vertical = clamp01((vh - r.top) / (r.height * 0.6));
  if (pinsActive()) {
    const horizontal = clamp01((vw - r.left) / (r.width * 0.7));
    const rail = card.closest<HTMLElement>('[data-rail]');
    const frame = rail?.parentElement;
    if (!rail || !frame)
      return { enter: Math.min(vertical, horizontal), scroll: 0 };
    // The card's right edge before the rail moved, and where the rail's full travel leaves it.
    const rest =
      r.right -
      (rail.getBoundingClientRect().left - frame.getBoundingClientRect().left);
    const travel = Math.max(0, rail.scrollWidth - rail.clientWidth);
    // Top once the card is fully in view (or from the start, if it begins in view);
    // bottom once it reaches the left edge or the rail runs out.
    const start = Math.min(vw, rest);
    const end = Math.max(r.width, rest - travel);
    const scroll =
      start - end > 1 ? clamp01((start - r.right) / (start - end)) : 0;
    return { enter: Math.min(vertical, horizontal), scroll };
  }
  // Phones: cards are nearly a screen tall, so time it off the device box: top once the
  // whole box is on screen, bottom as it slides under the header.
  const b = (box ?? card).getBoundingClientRect();
  const start = Math.max(vh - b.height, vh * 0.35);
  const end = 80;
  return { enter: vertical, scroll: clamp01((start - b.top) / (start - end)) };
}

/** Rough width x height of each device arrangement at scale 1, for framing. */
const FOOTPRINT = { tablet: [2.9, 2.0], phones: [3.05, 2.1], phonesTall: [2.5, 2.85], laptop: [3.4, 3.0] } as const;

function DeviceScene({ project, spot }: { project: Project; spot: RefObject<HTMLElement | null> }) {
  const rig = useRef<THREE.Group>(null);
  const screenScroll = useRef(0);
  const reevu = useReevuScreen();
  const size = useThree((s) => s.size);
  // Tall panes (the split feature cards) stack the phone in front of the tablet instead of beside it.
  const tall = size.width / size.height < 0.9;

  useFrame((state, delta) => {
    const g = rig.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    // Hover and entry follow the whole card, not just the 3D box.
    const card = spot.current?.closest("article") ?? null;
    const hover = !motion.reduced && !!card?.matches(":hover");
    const { enter, scroll } = motion.reduced ? { enter: 1, scroll: 0.3 } : cardTimeline(card, spot.current);
    screenScroll.current = damp(screenScroll.current, scroll, dt, 6);
    const e = easeOut(enter);
    const t = motion.reduced ? 0 : state.clock.elapsedTime;
    // Devices spin in once as they arrive, then idle-sway; hover hands control to the cursor.
    g.rotation.y = damp(g.rotation.y, (hover ? pointer.sx * 0.3 : Math.sin(t * 0.4) * 0.08) - (1 - e) * 2.4, dt, 6);
    g.rotation.x = damp(g.rotation.x, hover ? -pointer.sy * 0.15 : 0, dt);
    g.position.y = damp(g.position.y, (hover ? 0.18 : 0) - (1 - e) * 1.2, dt);
    // Frame the device to fill the pane (camera 7, fov 30) without touching its edges.
    const visH = 2 * 7 * Math.tan((15 * Math.PI) / 180);
    const visW = visH * (state.size.width / state.size.height);
    const [fw, fh] = FOOTPRINT[project.device === "phones" && tall ? "phonesTall" : project.device];
    const fit = Math.min(1.1, (0.86 * visW) / fw, (0.8 * visH) / fh);
    g.scale.setScalar(damp(g.scale.x, (hover ? 1.06 : 1) * lerp(0.6, 1, e) * fit, dt));
  });

  const scroll = () => screenScroll.current;
  return (
    <>
      <Sphere position={[1.6, 1, -2.6]} scale={0.6} finish="glass" />
      <Sphere position={[-1.9, -0.9, -1.6]} scale={0.22} />
      <Sphere position={[1.9, -1.1, -1]} scale={0.1} finish="plastic" color={palette.lime} />
      <group ref={rig}>
        <Suspense fallback={null}>
          {project.device === "phones" && (
            <>
              {project.backScreen && (
                <Tablet
                  src={project.backScreen}
                  scroll={scroll}
                  position={tall ? [-0.25, 0.5, -0.8] : [-0.55, 0.25, -0.8]}
                  rotation-y={0.35}
                  scale={0.75}
                />
              )}
              <Phone
                src={project.screen}
                scroll={scroll}
                position={tall ? [0.55, -0.45, 0.4] : [0.8, -0.1, 0.4]}
                rotation-y={-0.3}
                scale={0.95}
              />
            </>
          )}
          {project.device === "laptop" && (
            <Laptop src={project.screen} scroll={scroll} position={[0, -1.0, -0.6]} rotation={[0.32, -0.45, 0]} scale={0.95} />
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
  { finish: "glass", color: undefined, size: 0.26, from: [-6, 3, -2] },
  { finish: "chrome", color: undefined, size: 0.14, from: [6, 2.5, 1] },
  { finish: "jelly", color: "flavor", size: 0.16, from: [-5, -3, 2] },
  { finish: "glass", color: undefined, size: 0.2, from: [5.5, -2.5, -1] },
  { finish: "plastic", color: palette.lime, size: 0.1, from: [0, 4.5, 0] },
  { finish: "jelly", color: palette.aqua, size: 0.15, from: [-6.5, 0, 1] },
  { finish: "chrome", color: undefined, size: 0.18, from: [6.5, 0.5, -2] },
] as const;

/** What the closing robot does when clicked; `n` changes on every poke so the scene notices. */
type Poke = { n: number; kind: "hop" | "spin" | "sleep" | "wake" };

/**
 * The resolve: loose blobs fly in from off-screen and fall into orbit around the planet,
 * and a robot walks in on the right to wave the visitor off. Clicking the robot is an easter egg.
 */
function ClosingScene({
  spot,
  pokeRef,
  onPoke,
  bubbleRef,
}: {
  spot: RefObject<HTMLElement | null>;
  pokeRef: RefObject<Poke>;
  onPoke: () => void;
  bubbleRef: RefObject<HTMLDivElement | null>;
}) {
  const planet = useRef<THREE.Group>(null);
  const moons = useRef<(THREE.Group | null)[]>([]);
  const { jelly } = useFlavorColors();
  const gather = useRef(0);
  const robot = useRef<THREE.Group>(null);
  const robotDrive = useRef<RobotDrive>({
    walking: 0,
    waving: 0,
    lookX: 0,
    lookY: 0,
    sleep: 0,
  });
  // The click reaction plays on an inner group, so it never fights the walk-in.
  const hop = useRef<THREE.Group>(null);
  const reaction = useRef({
    seen: 0,
    kind: 'hop' as Poke['kind'],
    start: -10,
    asleep: false,
  });
  const head = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    // Half the visible width at the planet's depth: keeps the robot on narrow screens.
    const halfW =
      9 *
      Math.tan((15 * Math.PI) / 180) *
      (state.size.width / state.size.height);
    const section = spot.current?.closest('section') ?? null;
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
      planet.current.position.x = damp(
        planet.current.position.x,
        motion.reduced ? 0 : pointer.sx * 0.2,
        dt,
      );
    }
    // Walks in once the planet has mostly gathered, turns to the visitor and waves.
    const r = robot.current;
    if (r) {
      const walk = motion.reduced ? 1 : clamp01((gather.current - 0.45) / 0.45);
      const d = robotDrive.current;
      const re = reaction.current;
      if (pokeRef.current.n !== re.seen) {
        re.seen = pokeRef.current.n;
        re.kind = pokeRef.current.kind;
        re.start = state.clock.elapsedTime;
        if (re.kind === 'sleep') re.asleep = true;
        if (re.kind === 'wake') re.asleep = false;
      }
      d.walking = walk > 0 && walk < 1 ? 1 : 0;
      d.waving = damp(d.waving, walk >= 1 && !re.asleep ? 1 : 0, dt, 4);
      d.sleep = damp(d.sleep ?? 0, re.asleep ? 1 : 0, dt, 3);
      d.lookX = pointer.sx * 0.6;
      d.lookY = pointer.sy * 0.4;
      r.position.x = lerp(
        halfW + 1.5,
        // 1.3 in from the edge leaves room for the waving arm on narrow screens.
        Math.min(3.1, halfW - 1.3),
        easeOut(walk),
      );
      r.rotation.y = walk < 1 ? -1.2 : damp(r.rotation.y, -0.4, dt, 4);

      // Hop on a click; the fifth click is a full spin; waking up is a startled hop.
      const h = hop.current;
      if (h) {
        const u =
          (state.clock.elapsedTime - re.start) /
          (re.kind === 'spin' ? 0.9 : 0.45);
        const active =
          !motion.reduced && u >= 0 && u < 1 && re.kind !== 'sleep';
        h.position.y = active
          ? Math.sin(Math.PI * u) * (re.kind === 'spin' ? 0.9 : 0.5)
          : 0;
        h.rotation.y =
          active && re.kind === 'spin' ? easeInOut(u) * Math.PI * 2 : 0;

        // Pin the speech bubble just above the robot's head.
        const b = bubbleRef.current;
        const box = spot.current?.getBoundingClientRect();
        if (b && box) {
          h.localToWorld(head.set(0, 3.6, 0)).project(state.camera);
          b.style.transform = `translate(${((head.x + 1) / 2) * box.width}px, ${((1 - head.y) / 2) * box.height}px)`;
        }
      }
    }
    MOONS.forEach((m, i) => {
      const moon = moons.current[i];
      if (!moon) return;
      const a = (i / MOONS.length) * Math.PI * 2 + t * 0.35 * g;
      const radius = 2.1 + (i % 3) * 0.3;
      // A tilted orbital plane, like the chrome rings.
      const ox = Math.cos(a) * radius,
        oz = Math.sin(a) * radius;
      const oy = oz * 0.28;
      moon.position.set(
        lerp(m.from[0], ox, g),
        lerp(m.from[1], oy, g),
        lerp(m.from[2], oz * 0.6, g),
      );
      moon.scale.setScalar(
        Math.max(0.001, easeOut(clamp01(gather.current * 1.4))),
      );
    });
  });

  return (
    <>
      <group ref={planet}>
        <LiquidChrome position={[0, 0, 0]} scale={1.05} reach={0.3} calm={0.12} />
        <Orbit radius={1.85} tilt={[1.3, 0, 0.25]} speed={0.3} />
      </group>
      <group
        ref={robot}
        position={[8, -1.5, 0.6]}
        rotation-y={-1.2}
        scale={0.5}>
        <group
          ref={hop}
          onClick={(e) => {
            e.stopPropagation();
            onPoke();
          }}
          onPointerOver={() => void (document.body.style.cursor = 'pointer')}
          onPointerOut={() => void (document.body.style.cursor = '')}>
          <Robot drive={robotDrive} />
        </group>
      </group>
      {MOONS.map((m, i) => (
        <group key={i} ref={(el) => void (moons.current[i] = el)}>
          <Sphere position={[0, 0, 0]} scale={m.size} finish={m.finish} color={m.color === "flavor" ? jelly : m.color} />
        </group>
      ))}
    </>
  );
}

/* ------------------------------------------------------ build-a-robot game */

export type BuilderCommand = { type: "scatter" | "build"; n: number };

/** How close (logo units) a piece must land to its spot to click in. */
const SNAP = 0.2;
/** Logo scale on the board: it stands 2.2 world units tall. */
const BOARD = 2.2;

// Logo pixels (722 x 1134, y down) to logo units, the same mapping as the badge geometry.
const logoPx = (x: number, y: number) => new THREE.Vector3((x - 361) / 1134, -(y - 567) / 1134, 0);

/**
 * Where each piece moves from once the bot is alive, in logo pixels: the antenna wobbles
 * on its base, the head tilts on its neck, the arms swing at the shoulders, the star spins
 * on its own centre and the point bobs. Order matches logoParts().
 */
const LOGO_PIVOTS = [
  [358, 212], // antenna
  [358, 438], // head
  [285, 530], // left arm
  [435, 530], // right arm
  null, // star: its own centre
  [358, 830], // point
] as const;

/** The head's eye holes and the antenna ball, in logo pixels. */
const LOGO_EYES = [[291, 313], [433, 313]] as const;
const LOGO_BULB = [358, 40] as const;

/**
 * The peak. The RoboStars logo (the robot I teach under) lies in six pieces around its own
 * faint outline. Drag each piece home and it clicks in with a bounce. When the last one
 * lands the logo boots: a chrome shockwave, its eyes flicker on in the empty sockets, the
 * antenna bulb lights, bubbles burst out, and it hops pumping its arms, spins its star,
 * waves, and follows the cursor from then on. Click it to make it hop and spin.
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
  const low = useQuality() === "low";
  const { jelly } = useFlavorColors();
  // Each piece re-centred on itself, so it turns about its own middle while dragged.
  const pieces = useMemo(
    () =>
      logoParts().map((part, i) => {
        const geo = part.geo.clone();
        geo.computeBoundingBox();
        const home = geo.boundingBox!.getCenter(new THREE.Vector3());
        geo.translate(-home.x, -home.y, -home.z);
        const p = LOGO_PIVOTS[i];
        const pivot = p ? logoPx(p[0], p[1]).sub(home).setZ(0) : new THREE.Vector3();
        return { geo, home, pivot, color: part.color, star: !!part.star };
      }),
    [],
  );
  useEffect(() => () => pieces.forEach((p) => p.geo.dispose()), [pieces]);
  const homes = useMemo(() => pieces.map((p) => p.home), [pieces]);
  // Glossy candy plastic in the brand blue and orange: the logo stays the logo.
  const mats = useMemo(() => {
    const make = (color: string) =>
      low
        ? new THREE.MeshStandardMaterial({ color, roughness: 0.18, envMapIntensity: 1.1 })
        : new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.25, envMapIntensity: 1.2 });
    const cache = new Map<string, THREE.Material>();
    return pieces.map((p) => cache.get(p.color) ?? cache.set(p.color, make(p.color)).get(p.color)!);
  }, [pieces, low]);
  useEffect(() => () => new Set(mats).forEach((m) => m.dispose()), [mats]);

  const board = useRef<THREE.Group>(null);
  const live = useRef<THREE.Group>(null);
  const parts = useRef<(THREE.Group | null)[]>([]);
  const pivots = useRef<(THREE.Group | null)[]>([]);
  const ghosts = useRef<(THREE.Mesh | null)[]>([]);
  const eyes = useRef<(THREE.Mesh | null)[]>([]);
  const bulb = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Mesh>(null);
  const snapRing = useRef<THREE.Mesh>(null);
  const burst = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  const clock = useThree((s) => s.clock);
  const game = useRef({
    pos: homes.map((h) => h.clone()),
    rot: homes.map(() => 0),
    placed: homes.map(() => false),
    snapAt: homes.map(() => -10),
    lastSnap: -1,
    dragging: -1,
    grab: new THREE.Vector3(),
    won: -10,
    poked: -10,
    reported: -1,
    touched: 0,
    /** Where each piece is actually drawn (includes the idle-hint nudge). */
    vis: homes.map(() => new THREE.Vector3()),
  });
  const scratch = useMemo(
    () => ({ plane: new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit: new THREE.Vector3(), tmp: new THREE.Vector3() }),
    [],
  );

  // Three pieces either side of the outline, top to bottom, inside the visible box.
  const scatter = () => {
    const g = game.current;
    // Half the visible width at the board (camera 5, fov 30), in logo units.
    const half = (5 * Math.tan(THREE.MathUtils.degToRad(15)) * size.width) / size.height / BOARD;
    const lo = 0.5, hi = Math.max(lo + 0.02, half - 0.22);
    // The head goes right: the progress label sits top-left.
    const side = [-1, 1, 1, -1, 1, -1];
    const rows = [0.18, 0.3, 0.0, -0.08, -0.3, -0.34];
    homes.forEach((_, i) => {
      g.pos[i].set(side[i] * (lo + Math.random() * (hi - lo)), rows[i] + (Math.random() - 0.5) * 0.08, 0);
      g.rot[i] = (Math.random() - 0.5) * 1.4;
      g.placed[i] = false;
    });
    g.won = -10;
    g.lastSnap = -1;
  };

  useEffect(() => {
    const g = game.current;
    if (command.type === "build") {
      // Let the pieces fly home one after another rather than all at once.
      homes.forEach((_, i) => window.setTimeout(() => {
        if (!g.placed[i]) {
          g.placed[i] = true;
          g.snapAt[i] = performance.now() / 1000;
          g.lastSnap = i;
        }
      }, motion.reduced ? 0 : i * 140));
    } else scatter();
    // `scatter` reads layout at call time; re-running on resize would reshuffle a game in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command.n]);

  useFrame((state, delta) => {
    const g = game.current;
    const dt = Math.min(delta, 1 / 30);
    const t = state.clock.elapsedTime;
    const now = performance.now() / 1000;
    const since = g.won < 0 ? -1 : t - g.won;
    const awake = since >= 0;
    const still = motion.reduced;

    homes.forEach((home, i) => {
      const m = parts.current[i];
      if (!m) return;
      if (g.placed[i]) {
        // Glide home and square up.
        const k = still ? 1 : 1 - Math.exp(-dt * 14);
        g.pos[i].lerp(home, k);
        g.rot[i] += (0 - g.rot[i]) * k;
      }
      const floating = !g.placed[i] && g.dragging !== i && !still;
      // Idle hint: after a few quiet seconds, the first loose piece drifts part-way toward
      // its spot and back, showing what to do without a word.
      const hinting = floating && i === g.placed.indexOf(false) && performance.now() - g.touched > 3500;
      const nudge = hinting ? 0.35 * (0.5 - 0.5 * Math.cos(t * 2.4)) : 0;
      scratch.tmp.copy(g.pos[i]).lerp(home, nudge);
      m.position.set(scratch.tmp.x, scratch.tmp.y + (floating ? Math.sin(t * 1.5 + i) * 0.015 : 0), g.dragging === i ? 0.25 : 0);
      g.vis[i].set(m.position.x, m.position.y, 0);
      m.rotation.set(floating ? Math.sin(t * 0.9 + i) * 0.2 : 0, floating ? Math.sin(t * 0.7 + i * 2) * 0.4 : 0, g.rot[i]);
      // A snapped piece pops: a quick squash-and-stretch as it clicks in.
      const s = clamp01((now - g.snapAt[i]) / 0.4);
      const popScale = s < 1 && !still ? 1 + Math.sin(Math.PI * s) * 0.18 : 1;
      m.userData.base = damp(m.userData.base ?? 1, g.dragging === i ? 1.1 : 1, dt, 12);
      m.scale.setScalar(m.userData.base * popScale);
      // The outline under a piece goes once the piece is home.
      const ghost = ghosts.current[i];
      if (ghost) ghost.visible = !g.placed[i] || g.pos[i].distanceTo(home) > 0.02;

      // Alive: each piece moves on its own joint.
      const pv = pivots.current[i];
      if (!pv) return;
      if (!awake || still) {
        pv.rotation.set(0, 0, 0);
        return;
      }
      const cheer = since > 1.2 && since < 2.7 ? 1 : 0;
      const poke = t - g.poked < 1 ? 1 : 0;
      const up = Math.max(cheer, poke);
      if (i === 0) {
        // Antenna: a springy wobble that settles into a slow sway.
        pv.rotation.z = Math.sin(t * 9) * 0.35 * Math.exp(-Math.max(0, since - 0.4) * 1.5) + Math.sin(t * 1.7) * 0.08;
      } else if (i === 1) {
        // Head: tilts toward the cursor.
        pv.rotation.z = damp(pv.rotation.z, -pointer.sx * 0.18, dt, 5);
      } else if (i === 2 || i === 3) {
        // Arms swing outward at the shoulder (inward would hit the head): a pump for the
        // cheer, then the right one waves; otherwise a lazy swing.
        const dir = i === 2 ? 1 : -1;
        const waving = i === 3 && since > 2.7 && since < 5.2 ? Math.sin(t * 10) * 0.22 + 0.25 : 0;
        const idle = Math.sin(t * 1.3 + i) * 0.05;
        pv.rotation.z = damp(pv.rotation.z, dir * (up * (0.25 + Math.sin(t * 12) * 0.15) + waving + idle), dt, 10);
      } else if (i === 4) {
        // Star: one full turn as it boots, then a gentle sway, so it always reads as a star.
        pv.rotation.y = easeInOut(clamp01((since - 1.2) / 1.1)) * Math.PI * 2 + Math.sin(t * 1.2) * 0.3;
      } else {
        pv.position.y = pieces[i].pivot.y + Math.sin(t * 2.2) * 0.008;
      }
    });

    // A ring of light where the latest piece clicked in.
    const ring = snapRing.current;
    if (ring) {
      const i = g.lastSnap;
      const k = i < 0 ? 1 : clamp01((now - g.snapAt[i]) / 0.5);
      ring.visible = k < 1 && !still;
      if (ring.visible) {
        ring.position.copy(homes[i]).setZ(0.15);
        ring.scale.setScalar(0.15 + easeOut(k) * 0.35);
        (ring.material as THREE.MeshBasicMaterial).opacity = 1 - k;
      }
    }

    const placed = g.placed.filter(Boolean).length;
    if (placed !== g.reported) {
      g.reported = placed;
      if (placed === homes.length && g.won < 0) g.won = t;
      onProgress(placed);
    }

    // Eyes flicker on in the empty sockets, then glow; the antenna bulb lights after them.
    const power = !awake ? 0 : still ? 1 : clamp01((since - 0.35) / 0.9);
    const flicker = power > 0 && power < 1 ? (Math.sin(t * 60) > 0.2 ? 1 : 0.15) : 1;
    eyes.current.forEach((e) => {
      if (!e) return;
      e.visible = power > 0;
      // A blink every few seconds once awake.
      const blink = !still && power >= 1 && (t % 3.7) < 0.12 ? 0.1 : 1;
      e.scale.set(1, blink, 0.35);
      (e.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.6 * power * flicker;
    });
    if (bulb.current) {
      bulb.current.visible = power > 0;
      (bulb.current.material as THREE.MeshBasicMaterial).opacity = power * (still ? 0.6 : 0.45 + Math.sin(t * 4) * 0.2);
    }

    const lv = live.current;
    if (lv) {
      const hopAt = Math.max(g.won + 1.2, g.poked);
      const u = (t - hopAt) / 0.55;
      const hopping = !still && awake && u >= 0 && u < 1;
      lv.position.y = (hopping ? Math.sin(Math.PI * u) * 0.09 : 0) + (awake && !still ? Math.sin(t * 1.4) * 0.012 : 0);
      // A poke hop includes a full spin.
      const spin = !still && g.poked > g.won && t - g.poked < 0.8 ? easeInOut(clamp01((t - g.poked) / 0.8)) * Math.PI * 2 : 0;
      // Awake, it turns toward the cursor with its whole body.
      const look = awake && since > 1 && !still;
      lv.rotation.y = spin + (look ? damp(lv.rotation.y % (Math.PI * 2), pointer.sx * 0.45, dt, 3) : 0);
      lv.rotation.x = look ? damp(lv.rotation.x, -pointer.sy * 0.2, dt, 3) : 0;
    }

    // The boot shockwave: a chrome ring racing outward from the star.
    const w = wave.current;
    if (w) {
      const k = since < 0 ? 1 : clamp01((since - 0.3) / 0.9);
      w.visible = k > 0 && k < 1 && !still;
      w.scale.setScalar(0.2 + easeOut(k) * 2.2);
      (w.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.9;
    }
    // Bubbles burst out as it powers up.
    const b = burst.current;
    if (b) {
      const k = since < 0 ? 1 : clamp01((since - 0.4) / 2.2);
      b.visible = k > 0 && k < 1 && !still;
      b.children.forEach((c, i) => {
        const a = (i / b.children.length) * Math.PI * 2 + i;
        const r = easeOut(k) * (0.7 + (i % 3) * 0.25);
        c.position.set(Math.cos(a) * r, homes[4].y + Math.sin(a) * r * 0.8 + k * 0.5, 0.25 + (i % 2) * 0.12);
        c.scale.setScalar((0.035 + (i % 4) * 0.015) * Math.sin(Math.PI * Math.min(1, k * 1.3)));
      });
    }

    // Dev-only: where each piece and its spot are on screen (NDC), for the drag test harness.
    if (process.env.NODE_ENV !== "production" && board.current) {
      const cam = state.camera;
      const ndc = (v: THREE.Vector3) => board.current!.localToWorld(v.clone()).project(cam);
      (window as unknown as { __builder: unknown }).__builder = {
        pieces: g.vis.map((p) => ndc(p)),
        homes: homes.map((h) => ndc(h)),
        placed: [...g.placed],
      };
    }
  });

  // Dragging happens on the z = 0 plane of the board.
  const toBoard = (e: ThreeEvent<PointerEvent>) => {
    if (!e.ray.intersectPlane(scratch.plane, scratch.hit) || !board.current) return null;
    return board.current.worldToLocal(scratch.hit.clone());
  };

  const handlers = (i: number) => ({
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      const g = game.current;
      if (!interactive || g.dragging !== -1) return;
      e.stopPropagation();
      // Built and awake: a click is a poke.
      if (g.won >= 0) {
        g.poked = clock.elapsedTime;
        return;
      }
      if (g.placed[i]) return;
      const p = toBoard(e);
      if (!p) return;
      g.dragging = i;
      g.touched = performance.now();
      // Start from where the piece is drawn, so grabbing it mid-hint doesn't make it jump.
      g.pos[i].copy(g.vis[i]);
      g.grab.copy(p).sub(g.pos[i]);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      document.body.style.cursor = "grabbing";
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      const g = game.current;
      if (g.dragging !== i) return;
      const p = toBoard(e);
      if (p) g.pos[i].copy(p.sub(g.grab)).setZ(0);
    },
    onPointerUp: (e: ThreeEvent<PointerEvent>) => {
      const g = game.current;
      if (g.dragging !== i) return;
      g.dragging = -1;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
      document.body.style.cursor = "";
      if (g.pos[i].distanceTo(homes[i]) < SNAP) {
        g.placed[i] = true;
        g.snapAt[i] = performance.now() / 1000;
        g.lastSnap = i;
      }
    },
    onPointerOver: () => {
      const g = game.current;
      if (g.dragging === -1 && (!g.placed[i] || g.won >= 0)) document.body.style.cursor = g.won >= 0 ? "pointer" : "grab";
    },
    onPointerOut: () => {
      if (game.current.dragging === -1) document.body.style.cursor = "";
    },
  });

  const eyeAt = LOGO_EYES.map(([x, y]) => logoPx(x, y).sub(pieces[1].home).sub(pieces[1].pivot));
  const bulbAt = logoPx(...LOGO_BULB).sub(pieces[0].home).sub(pieces[0].pivot);

  return (
    <group ref={board} scale={BOARD}>
      <Bubbles count={10} box={[4, 2.4, 0.6]} center={[0, 0, -1.1]} size={[0.035, 0.13]} seed={11} rise={0.1} />
      {/* the outline to build onto, in the flavour's jelly colour */}
      {pieces.map((p, i) => (
        <mesh
          key={`ghost-${i}`}
          ref={(m) => void (ghosts.current[i] = m)}
          geometry={p.geo}
          position={[p.home.x, p.home.y, -0.1]}
          scale={[1, 1, 0.05]}
        >
          <meshBasicMaterial color={jelly} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
      <group ref={live}>
        {pieces.map((p, i) => (
          <group key={i} ref={(el) => void (parts.current[i] = el)}>
            <group ref={(el) => void (pivots.current[i] = el)} position={p.pivot}>
              <mesh geometry={p.geo} material={mats[i]} position={[-p.pivot.x, -p.pivot.y, 0]} {...handlers(i)} />
              {i === 1 &&
                eyeAt.map((at, k) => (
                  <mesh key={k} ref={(m) => void (eyes.current[k] = m)} position={[at.x, at.y, 0.01]} visible={false}>
                    <sphereGeometry args={[0.024, 24, 16]} />
                    <meshStandardMaterial color={palette.aqua} emissive={palette.aqua} emissiveIntensity={0} toneMapped={false} />
                  </mesh>
                ))}
              {i === 0 && (
                <mesh ref={bulb} position={[bulbAt.x, bulbAt.y, 0.02]} visible={false}>
                  <sphereGeometry args={[0.05, 24, 16]} />
                  <meshBasicMaterial color={palette.lime} transparent opacity={0} toneMapped={false} depthWrite={false} />
                </mesh>
              )}
            </group>
          </group>
        ))}
      </group>
      <mesh ref={snapRing} visible={false}>
        <torusGeometry args={[0.5, 0.025, 12, 64]} />
        <meshBasicMaterial color={jelly} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={wave} visible={false} position={[0, homes[4].y, 0.1]}>
        <torusGeometry args={[0.5, 0.012, 12, 96]} />
        <meshBasicMaterial color={palette.chrome} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      <group ref={burst} visible={false}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[1, 24, 16]} />
            <FinishMaterial finish={i % 5 === 0 ? "plastic" : "glass"} color={i % 5 === 0 ? palette.lime : undefined} />
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
  interactive = false,
}: {
  className: string;
  camera?: number;
  fov?: number;
  children: React.ReactNode;
  spotRef?: RefObject<HTMLDivElement | null>;
  /** Only for 3D that takes pointer input: drei's View aims events only when the event
   *  target is its own box, so that box must receive them. */
  interactive?: boolean;
}) {
  return (
    // Decorative boxes are pointer-events-none: they only tell the shared canvas where to
    // draw, and clicks and taps must reach the page beneath (the hero CTA sits under one).
    <div ref={spotRef} className={`${interactive ? "" : "pointer-events-none"} ${className}`} aria-hidden>
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
    <Spot className={className} camera={5} interactive>
      <BuilderScene command={command} interactive={interactive} onProgress={onProgress} />
    </Spot>
  );
}

const ROBOT_LINES = [
  'Beep boop. Hi!',
  "I'm a robot, not a button.",
  "Careful, I'm mostly chrome.",
  "Hire Hanna and I'm included.",
  'Psst: try the build-a-bot game up there.',
  'Still here. Still waving.',
];

export function ClosingSpot({ className }: { className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const poke = useRef<Poke>({ n: 0, kind: 'hop' });
  const clicks = useRef(0);
  const hide = useRef<number>(undefined);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => () => window.clearTimeout(hide.current), []);

  const onPoke = () => {
    const asleep = poke.current.kind === 'sleep';
    clicks.current = asleep ? 0 : clicks.current + 1;
    const n = clicks.current;
    const kind: Poke['kind'] = asleep
      ? 'wake'
      : n === 10
        ? 'sleep'
        : n === 5
          ? 'spin'
          : 'hop';
    poke.current = { n: poke.current.n + 1, kind };
    let text: string;
    if (kind === 'wake') text = "I'm up! I'm up!";
    else if (kind === 'sleep') text = "That's it. Nap time. Zzz…";
    else if (kind === 'spin') text = 'Okay, you found the easter egg 🥚';
    else {
      const options = ROBOT_LINES.filter((l) => l !== line);
      text = options[Math.floor(Math.random() * options.length)];
    }
    setLine(text);
    window.clearTimeout(hide.current);
    // Asleep, the bubble stays up as a snore until the next click.
    hide.current = window.setTimeout(
      () => setLine(kind === 'sleep' ? 'Zzz…' : null),
      2800,
    );
  };

  return (
    // z-[35]: above the shared canvas (z-30) so the bubble isn't hidden behind the planet,
    // below the fixed header (z-40). overflow-x-clip: before the robot walks in, the bubble's
    // anchor sits off-screen right and would otherwise widen the page on phones.
    <div className={`${className} z-[35] overflow-x-clip`}>
      <Spot className='absolute inset-0' camera={9} spotRef={ref} interactive>
        <ClosingScene
          spot={ref}
          pokeRef={poke}
          onPoke={onPoke}
          bubbleRef={bubble}
        />
      </Spot>
      {/* Positioned each frame by the scene; the inner box sits up and to the left of the head. */}
      <div
        ref={bubble}
        aria-hidden
        className='pointer-events-none absolute left-0 top-0'>
        {line && (
          <div key={line} className='robot-bubble'>
            {line}
          </div>
        )}
      </div>
    </div>
  );
}
