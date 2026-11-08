"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useQuality } from "@/lib/quality";
import { useTheme } from "@/lib/theme";

// Shared with the other looks: one pointer and one reduced-motion flag for the whole canvas.
export {
  blobGeometry,
  clamp01,
  easeInOut,
  easeOut,
  easeOutBack,
  grainTexture,
  motion,
  pinsActive,
  pointer,
  sectionProgress,
  useDetail,
} from "../kit";

/**
 * The overgrown city, shared with globals.css: weathered concrete and bone paper, moss and
 * ivy taking it back, rust where the metal was, and warm golden-hour light. Spores glow at dusk.
 */
export const palette = {
  bone: "#ECE3CF",
  paper: "#E2D5B8",
  concrete: "#A7A293",
  stone: "#7E7A6E",
  moss: "#6E8B3D",
  ivy: "#3F5A2A",
  lichen: "#A9B86A",
  rust: "#B4562B",
  rustDark: "#7A3518",
  tin: "#5E7F7A",
  gold: "#F2B65A",
  spore: "#E9F28A",
  ink: "#1F1A12",
  tape: "#C9C2AE",
};

/**
 * Dusk: the same city after sundown. Stone and moss sink to blue-grey and deep green so
 * the warm lamp light, the spores and the glowing screens carry the scene.
 */
const dusk: Record<string, string> = {
  [palette.bone]: "#9b9583",
  [palette.paper]: "#8a7f66",
  [palette.concrete]: "#545a58",
  [palette.stone]: "#3d4341",
  [palette.moss]: "#3e5a2c",
  [palette.ivy]: "#22351c",
  [palette.lichen]: "#66763f",
  [palette.rust]: "#7e3c20",
  [palette.tin]: "#38524f",
  [palette.tape]: "#7d7867",
};

/** A palette colour as the current theme shows it. */
export function useSwatch(color: string) {
  return useTheme() === "dark" ? (dusk[color] ?? color) : color;
}

// Seeded so every visitor sees the same rocks.
export function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/**
 * Mottled stains for rust and worn paint: a small tileable canvas of blotches in the base
 * colour, its darker edge and a lighter wash. Cached per colour pair.
 */
const stainCache = new Map<string, THREE.CanvasTexture>();
export function stainTexture(base: string, stain: string, seed = 3) {
  const key = `${base}|${stain}|${seed}`;
  const hit = stainCache.get(key);
  if (hit) return hit;
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  const r = rng(seed * 131 + 7);
  const s = new THREE.Color(stain);
  const light = new THREE.Color(base).lerp(new THREE.Color("#fff6e0"), 0.25);
  for (let i = 0; i < 140; i++) {
    const x = r() * size, y = r() * size, rad = 4 + r() ** 2 * 38;
    const col = r() < 0.7 ? s : light;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${0.18 + r() * 0.35})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    // Draw each blotch at the wrapped positions too, so the tile has no seams.
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      g.save();
      g.translate(dx, dy);
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  stainCache.set(key, t);
  return t;
}

/** Rough random normals: pitted concrete and corroded metal. Coarser than the classic flock. */
let pits: THREE.DataTexture | null = null;
export function pitTexture() {
  if (pits) return pits;
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const r = rng(77);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = 128 + (r() - 0.5) * 200;
    data[i * 4 + 1] = 128 + (r() - 0.5) * 200;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  pits = new THREE.DataTexture(data, size, size);
  pits.wrapS = pits.wrapT = THREE.RepeatWrapping;
  pits.repeat.set(4, 4);
  pits.needsUpdate = true;
  return pits;
}

/**
 * moss:     soft, velvety growth (sheen), the green that takes everything back
 * concrete: pitted grey stone
 * rust:     corroded metal, mottled orange-brown, barely reflective
 * paint:    old enamel over tin, chipped (stain map), a little gloss left
 * glow:     spores, lamps and eyes
 */
export type Finish = "moss" | "concrete" | "rust" | "paint" | "glow";

export function FinishMaterial({ finish, color, vertexColors = false }: { finish: Finish; color?: string; vertexColors?: boolean }) {
  const quality = useQuality();
  const fallback = {
    moss: palette.moss,
    concrete: palette.concrete,
    rust: palette.rust,
    paint: palette.tin,
    glow: palette.spore,
  }[finish];
  const base = useSwatch(color ?? fallback);
  const dark = useTheme() === "dark";
  const map = useMemo(() => {
    if (typeof document === "undefined") return null;
    if (finish === "rust") return stainTexture(base, palette.rustDark, 5);
    if (finish === "paint") return stainTexture(base, palette.rust, 9);
    return null;
  }, [finish, base]);
  // Vertex-coloured meshes carry their own colours: the material stays white so they show true.
  const tint = vertexColors ? "#ffffff" : base;

  if (finish === "glow")
    return <meshStandardMaterial color={base} emissive={base} emissiveIntensity={dark ? 2.2 : 1.1} roughness={0.5} toneMapped={false} />;
  if (quality === "low") {
    // Low tier: plain standard materials, no sheen or normal maps.
    if (finish === "rust") return <meshStandardMaterial map={map} metalness={0.35} roughness={0.85} />;
    if (finish === "paint") return <meshStandardMaterial map={map} metalness={0.2} roughness={0.55} />;
    return <meshStandardMaterial color={tint} vertexColors={vertexColors} roughness={finish === "moss" ? 1 : 0.92} />;
  }
  if (finish === "moss")
    return (
      <meshPhysicalMaterial
        color={tint}
        vertexColors={vertexColors}
        roughness={1}
        sheen={1}
        sheenRoughness={0.7}
        sheenColor={new THREE.Color(base).lerp(new THREE.Color("#e8ffb0"), 0.4)}
        normalMap={pitTexture()}
        normalScale={new THREE.Vector2(0.4, 0.4)}
      />
    );
  if (finish === "concrete")
    return (
      <meshStandardMaterial
        color={tint}
        vertexColors={vertexColors}
        roughness={0.95}
        normalMap={pitTexture()}
        normalScale={new THREE.Vector2(0.6, 0.6)}
      />
    );
  if (finish === "rust")
    return (
      <meshStandardMaterial map={map} metalness={0.45} roughness={0.8} normalMap={pitTexture()} normalScale={new THREE.Vector2(0.5, 0.5)} />
    );
  return <meshPhysicalMaterial map={map} metalness={0.25} roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.6} />;
}

/**
 * The room every material reflects: a low golden sun on one side and pale sky above by day;
 * at dusk a deep teal sky with a warm band on the horizon. Built once per theme.
 */
const envCache = new Map<string, THREE.Texture>();
function sharedEnvironment(gl: THREE.WebGLRenderer, dark: boolean) {
  const key = dark ? "dark" : "light";
  const hit = envCache.get(key);
  if (hit) return hit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? "#141d22" : "#e6dcc4");
  const panel = (color: string, intensity: number, pos: [number, number, number], scale: [number, number]) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false }),
    );
    mesh.position.set(...pos);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  panel(dark ? "#3c5866" : "#fff3d6", dark ? 0.8 : 2.2, [0, 4, 2], [10, 3]); // sky
  panel(dark ? "#f2a65a" : "#ffc46b", dark ? 1.4 : 3, [5, 0.5, 2], [5, 2]); // the sun / the last light
  panel(dark ? "#1f3a2a" : "#8fa860", dark ? 0.8 : 1.3, [-5, -1, 2], [6, 3]); // foliage bounce
  panel(dark ? "#e9f28a" : "#f6ecd2", dark ? 0.5 : 1, [0, -4, 1], [10, 3]); // ground
  const pmrem = new THREE.PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  envCache.set(key, texture);
  return texture;
}

/**
 * Golden hour: a low warm sun from the right, pale sky above and green bounce from below.
 * At dusk the sun is gone: a cool teal sky light and a warm lantern from the front.
 */
export function Studio() {
  const dark = useTheme() === "dark";
  const gl = useThree((s) => s.gl);
  const environment = useMemo(() => sharedEnvironment(gl, dark), [gl, dark]);
  return (
    <>
      <hemisphereLight args={dark ? ["#4a6a78", "#0b120c", 0.7] : ["#fff1d0", "#7f9152", 1.05]} />
      <directionalLight position={dark ? [2, 4, 6] : [6, 3, 4]} intensity={dark ? 1.6 : 2.6} color={dark ? "#ffc98a" : "#ffd08a"} />
      <directionalLight position={[-5, 3, -3]} intensity={dark ? 1.8 : 0.8} color={dark ? "#7fb0c4" : "#cfe0b0"} />
      {/* shared across views, so never disposed when one view unmounts */}
      <primitive object={environment} attach="environment" dispose={null} />
    </>
  );
}
