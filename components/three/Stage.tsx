"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { View } from "@react-three/drei";
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
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
    >
      <PointerSmoother />
      <View.Port />
    </Canvas>
  );
}
