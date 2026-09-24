"use client";

import { useEffect } from "react";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Writes each `[data-progress]` element's scroll position into `--p` (0..1) so
 * CSS can animate off it, and slides `[data-rail]` tracks sideways while their
 * section is pinned. Modes:
 *   pin   sticky section: 0 as it pins, 1 as it releases
 *   pass  0 when the top enters the viewport, 1 when the bottom leaves
 *   draw  a quicker pass: done by the time the section is well into view
 *   leave 0 while the section fills the screen, 1 once it has scrolled away (the hero)
 * Also writes a smoothed cursor position to --mx / --my (-1..1) on <html>.
 */
export default function ScrollDriver() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const pinned = window.innerWidth >= 768;
      document.querySelectorAll<HTMLElement>("[data-progress]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const mode = el.dataset.progress;
        let p: number;
        // Reduced motion: each mode rests where it reads best standing still. Reveals and
        // pinned sequences show their finished state; parallax sits neutral; the hero stays put.
        if (reduced) p = mode === "leave" ? 0 : mode === "pass" ? 0.5 : 1;
        else if (mode === "pin" && pinned) p = clamp01(-r.top / Math.max(1, r.height - vh));
        else if (mode === "draw") p = clamp01((vh * 0.85 - r.top) / (r.height * 0.7));
        else if (mode === "leave") p = clamp01(-r.top / r.height);
        else p = clamp01((vh - r.top) / (vh + r.height));
        el.style.setProperty("--p", p.toFixed(4));
      });
      document.querySelectorAll<HTMLElement>("[data-rail]").forEach((rail) => {
        const section = rail.closest<HTMLElement>("[data-progress]");
        if (!pinned || reduced || !section) {
          rail.style.transform = "";
          return;
        }
        const p = Number(section.style.getPropertyValue("--p") || 0);
        const distance = Math.max(0, rail.scrollWidth - rail.clientWidth);
        rail.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Cursor, eased toward its target so CSS layers glide rather than jump.
    const root = document.documentElement.style;
    const cursor = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
    const ease = () => {
      cursor.x += (cursor.tx - cursor.x) * 0.08;
      cursor.y += (cursor.ty - cursor.y) * 0.08;
      root.setProperty("--mx", cursor.x.toFixed(4));
      root.setProperty("--my", cursor.y.toFixed(4));
      cursor.raf = Math.abs(cursor.tx - cursor.x) + Math.abs(cursor.ty - cursor.y) > 0.001 ? requestAnimationFrame(ease) : 0;
    };
    const onPointer = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse") return;
      cursor.tx = (e.clientX / window.innerWidth) * 2 - 1;
      cursor.ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!cursor.raf) cursor.raf = requestAnimationFrame(ease);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(cursor.raf);
    };
  }, []);
  return null;
}
