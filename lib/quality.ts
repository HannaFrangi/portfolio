"use client";

import { useSyncExternalStore } from "react";

/**
 * Render quality for the 3D. "high" on capable desktops; "low" on phones, tablets
 * and low-memory machines, or once the frame rate drops (see Stage's PerformanceMonitor).
 * `?quality=low` or `?quality=high` in the URL forces a tier, for testing.
 */
export type Quality = "high" | "low";

function detect(): Quality {
  if (typeof window === "undefined") return "high";
  const forced = new URLSearchParams(window.location.search).get("quality");
  if (forced === "low" || forced === "high") return forced;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.screen.width, window.screen.height) < 768;
  const weak = (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
  return coarse || small || weak ? "low" : "high";
}

let current: Quality = detect();
const listeners = new Set<() => void>();

export function getQuality() {
  return current;
}

/** Only ever steps down within a visit, so the scene never flickers between tiers. */
export function degradeQuality() {
  if (current === "low") return;
  current = "low";
  listeners.forEach((l) => l());
}

export function useQuality(): Quality {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getQuality,
    () => "high",
  );
}

/** Half-size screen captures for the low tier: a quarter of the GPU memory. */
export function textureFor(src: string, quality: Quality) {
  return quality === "low" ? src.replace(/\.jpg$/, "-sm.jpg") : src;
}
