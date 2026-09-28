"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor, View } from "@react-three/drei";
import { degradeQuality, getQuality, useQuality } from "@/lib/quality";
import { pointer } from "./kit";

function PointerSmoother() {
  useFrame((_, delta) => {
    const k = 1 - Math.exp(-Math.min(delta, 1 / 30) * 4);
    pointer.sx += (pointer.x - pointer.sx) * k;
    pointer.sy += (pointer.y - pointer.sy) * k;
  });
  return null;
}

/**
 * One transparent WebGL canvas fixed over the page. Every 3D spot on the page
 * is a drei View that paints into it, so the site uses a single GL context.
 */
export default function Stage() {
  const quality = useQuality();
  // Adaptive resolution: `factor` eases down when frames drop and back up with headroom.
  // Caps: 1.75x on desktop (2x mostly buys invisible pixels) and 1.5x on the low tier.
  const [factor, setFactor] = useState(1);
  // The low tier stays at 1.5x: the blobs are all soft silhouettes, and below that their
  // edges visibly stair-step on phones (MSAA is off there).
  const cap = quality === "low" ? 1.5 : 1.75;
  const dpr = Math.max(1, Math.min(window.devicePixelRatio, 1 + factor * (cap - 1)));
  // Start judging only once loading (texture decode, shader compiles) has settled.
  const [watching, setWatching] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setWatching(true), 6000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <Canvas
      className="!fixed !inset-0 !h-[100lvh] !w-full z-30 !pointer-events-none"
      eventSource={document.body}
      eventPrefix="client"
      dpr={dpr}
      // MSAA is expensive on phones and barely visible at their pixel density.
      gl={{ alpha: true, antialias: getQuality() === "high", powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        // Dev-only handle for the performance harness; stripped from production builds.
        if (process.env.NODE_ENV !== "production") (window as unknown as { __gl: THREE.WebGLRenderer }).__gl = gl;
      }}
    >
      {watching && (
      <PerformanceMonitor
        // Judge ~10s windows (20 x 500ms, 75% of samples must agree) so one-off hitches,
        // like a section compiling its shaders on arrival, never count as a slow device.
        ms={500}
        iterations={20}
        // Below 45fps sustained: step down. Above 57fps (i.e. holding 60): step back up.
        bounds={(refresh) => (refresh > 90 ? [60, 100] : [45, 57])}
        // drei starts at 0.5 by default; start at full quality and only step down if slow.
        factor={1}
        flipflops={3}
        onChange={({ factor }) => setFactor(factor)}
        // Still struggling after several adjustments: settle on the low tier for this visit.
        onFallback={() => {
          degradeQuality();
          setFactor(0);
        }}
      />
      )}
      <PointerSmoother />
      <View.Port />
    </Canvas>
  );
}
