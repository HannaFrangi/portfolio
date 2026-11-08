"use client";

import { useEffect } from "react";

/**
 * Marks sections as shown when they reach the reading area, which plays the
 * CSS reveals in globals.css. Content is visible without JS: the hidden
 * starting state only applies once `html.reveal` is set here.
 */
export default function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) e.target.setAttribute("data-shown", "");
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.05 },
    );
    const watch = (scope: ParentNode) => scope.querySelectorAll("[data-section]:not([data-shown])").forEach((el) => io.observe(el));
    watch(document);
    // Sections can be re-created later (the build game remounts when the Konami code
    // switches looks); watch those too, or their copy would stay hidden.
    const mo = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-section]")) io.observe(n);
          watch(n);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
      root.classList.remove("reveal");
    };
  }, []);
  return null;
}
