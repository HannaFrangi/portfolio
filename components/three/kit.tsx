"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useQuality } from "@/lib/quality";
import { useTheme } from "@/lib/theme";

/** Palette shared with globals.css. */
export const palette = {
  moss: "#738B54",
  sage: "#959D69",
  olive: "#595F3E",
  sand: "#C2B396",
  cream: "#EDE8DC",
  mist: "#DBDFD9",
  ink: "#13180A",
  accent: "#E0703A",
  chrome: "#e9ece6",
};

/**
 * Night shift: the blobs turn to deep velvet so the warm rim light and the glowing
 * screens carry the scene. Scenes keep asking for palette.moss etc.
 */
const night: Record<string, string> = {
  [palette.moss]: "#3f6034",
  [palette.sage]: "#5a7443",
  [palette.olive]: "#2f3421",
  [palette.sand]: "#6b5f47",
  [palette.mist]: "#1a1e14",
};

/** A palette colour as the current theme shows it. */
export function useSwatch(color: string) {
  return useTheme() === "dark" ? (night[color] ?? color) : color;
}

/** Window-level pointer, -1..1, shared by every view. Not React state. */
export const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

export const motion = {
  reduced: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOut = (v: number) => 1 - (1 - v) ** 3;
export const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
/** Overshoots then settles: the "pop" for blobs arriving. */
export const easeOutBack = (v: number) => 1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2;

/** Pinned sections pin from the md breakpoint up; phones scroll them normally. */
export const pinsActive = () => typeof window !== "undefined" && window.innerWidth >= 768;

/** 0 when the element's top enters the bottom of the viewport, 1 when its bottom leaves the top. */
export function scrollProgress(el: Element | null) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp01((vh - r.top) / (vh + r.height));
}

/** Progress through a pinned (sticky) section: 0 as it pins, 1 as it releases. */
export function pinProgress(el: Element | null) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span <= 0 ? scrollProgress(el) : clamp01(-r.top / span);
}

/** A section's own timeline: pinned progress on desktop, pass-through progress on phones. */
export function sectionProgress(el: Element | null) {
  return pinsActive() ? pinProgress(el) : scrollProgress(el);
}

// Seeded so every visitor sees the same shapes.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/**
 * A soft organic lump: a sphere pushed around by a few low-frequency waves.
 * Cached by shape and detail, so every blob with the same seed shares one geometry.
 */
const blobCache = new Map<string, THREE.BufferGeometry>();
export function blobGeometry(seed: number, amount = 0.22, segments = 64) {
  const key = `${seed}:${amount}:${segments}`;
  const hit = blobCache.get(key);
  if (hit) return hit;
  const g = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.66));
  const r = rng(seed * 7919 + 1);
  const waves = Array.from({ length: 4 }, () => ({
    dir: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
    freq: 1.2 + r() * 2.2,
    phase: r() * Math.PI * 2,
    amp: (0.4 + r() * 0.6) * amount,
  }));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let d = 1;
    for (const w of waves) d += Math.sin(v.dot(w.dir) * w.freq * Math.PI + w.phase) * w.amp;
    v.multiplyScalar(d);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  blobCache.set(key, g);
  return g;
}

/** Segment counts per tier: the low tier roughly thirds the triangle count. */
export function useDetail() {
  return useQuality() === "low" ? { blob: 36, sphere: 28 } : { blob: 64, sphere: 48 };
}

/** Fine random normals: gives the matte clay a flocked, felt-like grain. */
let grain: THREE.DataTexture | null = null;
export function grainTexture() {
  if (grain) return grain;
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  const r = rng(42);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 128 + (r() - 0.5) * 120;
    data[i * 4 + 1] = 128 + (r() - 0.5) * 120;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  grain = new THREE.DataTexture(data, size, size);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(8, 8);
  grain.needsUpdate = true;
  return grain;
}

export type Finish = "flock" | "clay" | "chrome" | "glow";

export function FinishMaterial({ finish, color }: { finish: Finish; color: string }) {
  const quality = useQuality();
  color = useSwatch(color);
  const normalMap = useMemo(() => (finish === "flock" ? grainTexture() : null), [finish]);
  if (quality === "low") {
    // Low tier: one standard (not physical) shader per finish. No sheen, clearcoat,
    // iridescence or normal map, which are the expensive parts on a phone GPU.
    if (finish === "chrome") return <meshStandardMaterial color={palette.chrome} metalness={1} roughness={0.14} envMapIntensity={1.4} />;
    if (finish === "glow") return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.4} />;
    return <meshStandardMaterial color={color} roughness={finish === "flock" ? 0.92 : 0.6} />;
  }
  if (finish === "chrome")
    return (
      <meshPhysicalMaterial
        color={palette.chrome}
        metalness={1}
        roughness={0.12}
        envMapIntensity={1.4}
      />
    );
  if (finish === "glow")
    return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} roughness={0.4} />;
  if (finish === "flock")
    return (
      <meshPhysicalMaterial
        color={color}
        roughness={0.95}
        sheen={1}
        sheenRoughness={0.55}
        sheenColor={new THREE.Color(color).lerp(new THREE.Color("#ffffff"), 0.45)}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.35, 0.35)}
      />
    );
  return <meshPhysicalMaterial color={color} roughness={0.7} clearcoat={0.25} clearcoatRoughness={0.6} />;
}

/**
 * The environment map chrome and gloss reflect: soft light panels in a light room.
 * Built once per theme and shared by every view (it used to be rendered per view).
 */
const envCache = new Map<string, THREE.Texture>();
function sharedEnvironment(gl: THREE.WebGLRenderer, dark: boolean) {
  const key = dark ? "dark" : "light";
  const hit = envCache.get(key);
  if (hit) return hit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? "#15180f" : "#e9e6dc");
  const panel = (geometry: THREE.BufferGeometry, color: string, intensity: number, pos: [number, number, number], scale: [number, number]) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false }),
    );
    mesh.position.set(...pos);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  const plane = new THREE.PlaneGeometry(1, 1);
  panel(plane, dark ? "#ffd2b0" : "#ffffff", dark ? 1.2 : 3, [0, 4, 3], [10, 3]);
  panel(plane, dark ? "#8a6a4a" : "#dfe8c8", dark ? 0.9 : 1.6, [-5, 0, 2], [6, 3]);
  panel(plane, dark ? "#f08a50" : "#f3c9a8", dark ? 1.6 : 1.4, [5, -1, 2], [6, 2]);
  panel(new THREE.RingGeometry(0.5, 1, 48), dark ? "#9fb0d0" : "#ffffff", dark ? 0.6 : 1.5, [0, -3, 4], [3, 3]);
  const pmrem = new THREE.PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  envCache.set(key, texture);
  return texture;
}

/**
 * Soft daylight studio: warm key, bounce, and the shared environment. Night shift dims
 * the room and turns the key into a warm lamp with a cool rim from behind.
 */
export function Studio() {
  const dark = useTheme() === "dark";
  const gl = useThree((s) => s.gl);
  const environment = useMemo(() => sharedEnvironment(gl, dark), [gl, dark]);
  return (
    <>
      <hemisphereLight args={dark ? ["#6b6a5a", "#0b0d08", 0.55] : ["#fffaf0", "#9aa77a", 1.1]} />
      <directionalLight position={[4, 6, 5]} intensity={dark ? 2.3 : 2.2} color={dark ? "#ffd0a8" : "#fff4e2"} />
      <directionalLight position={[-5, 2, -3]} intensity={dark ? 1.6 : 0.7} color={dark ? "#9fb4e0" : "#cfe0b0"} />
      {/* shared across views, so never disposed when one view unmounts */}
      <primitive object={environment} attach="environment" dispose={null} />
    </>
  );
}
