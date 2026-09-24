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
        if (reduced) p = 1;
        else if (mode === "pin" && pinned) p = clamp01(-r.top / Math.max(1, r.height - vh));
        else if (mode === "draw") p = clamp01((vh * 0.85 - r.top) / (r.height * 0.7));
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
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
