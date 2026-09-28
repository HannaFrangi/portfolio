"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { smooth } from "@/lib/smooth";

/**
 * Lenis smooth scrolling for wheel and trackpad. It moves the real window scroll, so
 * sticky pins, ScrollDriver and the 3D keep reading scrollY as before. Touch stays
 * native, and reduced-motion visitors get plain scrolling.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, anchors: true });
    smooth.lenis = lenis;
    return () => {
      lenis.destroy();
      smooth.lenis = null;
    };
  }, []);
  return null;
}
