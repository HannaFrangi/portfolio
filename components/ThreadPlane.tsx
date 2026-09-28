"use client";

import { useEffect, useRef } from "react";

/**
 * A paper plane that rides the How-I-work thread. It sits at the thread's drawn tip
 * (the section's --p), banks along the curve, and bobs a little in the air.
 * The thread SVG stretches (preserveAspectRatio="none"), so points are mapped from
 * viewBox units to pixels by hand to keep the plane undistorted.
 */
export default function ThreadPlane({ pathId }: { pathId: string }) {
  const plane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const path = document.getElementById(pathId) as SVGPathElement | null;
    const svg = path?.ownerSVGElement;
    const section = plane.current?.closest<HTMLElement>("[data-progress]");
    if (!path || !svg || !section) return;
    const total = path.getTotalLength();
    const vb = svg.viewBox.baseVal;
    let frame = 0;

    const place = () => {
      frame = requestAnimationFrame(place);
      const el = plane.current;
      if (!el) return;
      const p = Number(section.style.getPropertyValue("--p") || 1);
      const box = svg.getBoundingClientRect();
      const host = el.offsetParent?.getBoundingClientRect();
      if (!host || box.width === 0) return;
      const sx = box.width / vb.width, sy = box.height / vb.height;
      const at = Math.max(0.001, Math.min(0.999, p)) * total;
      const a = path.getPointAtLength(at);
      const b = path.getPointAtLength(Math.min(total, at + 4));
      const x = box.left - host.left + a.x * sx;
      const y = box.top - host.top + a.y * sy;
      const angle = Math.atan2((b.y - a.y) * sy, (b.x - a.x) * sx);
      const bob = Math.sin(performance.now() / 350) * 3;
      el.style.transform = `translate3d(${x}px, ${y + bob}px, 0) translate(-50%, -50%) rotate(${angle}rad)`;
      el.style.opacity = p > 0.02 ? "1" : "0";
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      place();
      cancelAnimationFrame(frame);
    } else frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [pathId]);

  return (
    <div ref={plane} aria-hidden className="thread-plane pointer-events-none absolute left-0 top-0 hidden md:block">
      <svg viewBox="0 0 48 32" className="h-8 w-12 drop-shadow-[0_6px_6px_rgb(89_95_62/0.35)]">
        {/* folded paper plane, nose to the right */}
        <path d="M47 16 L2 2 L14 16 Z" fill="var(--surface)" stroke="var(--olive)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M47 16 L2 30 L14 16 Z" fill="var(--cream)" stroke="var(--olive)" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M47 16 L14 16 L20 22 Z" fill="var(--sand)" stroke="var(--olive)" strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
