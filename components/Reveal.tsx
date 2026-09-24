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
    document.querySelectorAll("[data-section]").forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove("reveal");
    };
  }, []);
  return null;
}
