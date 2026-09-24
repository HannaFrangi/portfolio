"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";

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

/** A soft organic lump: a sphere pushed around by a few low-frequency waves. */
export function blobGeometry(seed: number, amount = 0.22, segments = 96) {
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
  return g;
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
  const normalMap = useMemo(() => (finish === "flock" ? grainTexture() : null), [finish]);
  if (finish === "chrome")
    return <meshStandardMaterial color={palette.chrome} metalness={1} roughness={0.12} envMapIntensity={1.4} />;
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

/** Soft daylight studio: warm key, sage bounce, and light panels for chrome to reflect. */
export function Studio() {
  return (
    <>
      <hemisphereLight args={["#fffaf0", "#9aa77a", 1.1]} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#fff4e2" />
      <directionalLight position={[-5, 2, -3]} intensity={0.7} color="#cfe0b0" />
      <Environment resolution={128} frames={1}>
        {/* daylight surround, so chrome reflects cream room light instead of black */}
        <color attach="background" args={["#e9e6dc"]} />
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#dfe8c8" position={[-5, 0, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#f3c9a8" position={[5, -1, 2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.5} position={[0, -3, 4]} scale={3} />
      </Environment>
    </>
  );
}
