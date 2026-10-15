"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { person } from "@/lib/content";
import { getFlavor, setFlavor, setTheme, useTheme } from "@/lib/theme";

const ROBOT = String.raw`
     o
   __|__
  | o o |   Hey, you opened DevTools.
  |  =  |   Fellow developer or curious recruiter: hi!
  /|___|\
   d   b
`;

/** A note for whoever opens the console. Once per page load (StrictMode runs effects twice in dev). */
let greeted = false;
function greet() {
  if (greeted) return;
  greeted = true;
  const accent = "color:#e0703a;font-weight:700";
  const plain = "color:inherit";
  console.log(`%c${ROBOT}`, "color:#738b54;font-family:ui-monospace,monospace;font-weight:700");
  console.log(
    `%cThis site:%c Next.js, React Three Fiber, one shared WebGL canvas for every 3D scene.\n` +
      `%cHiring a React / React Native dev?%c ${person.email}\n` +
      `%cCV:%c ${location.origin}${person.cv}\n` +
      `%cPsst:%c click or tap the robot at the bottom of the page.`,
    accent, plain, accent, plain, accent, plain, accent, plain,
  );
}

/** Dev-only override (Shift+M), so the midnight extras can be checked at any hour. */
let forced: boolean | null = null;
const forcedListeners = new Set<() => void>();

/** Midnight to 4am on the visitor's own clock. Rechecked every minute. */
const isMidnight = () => forced ?? new Date().getHours() < 4;
const subscribeClock = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  forcedListeners.add(cb);
  return () => {
    window.clearInterval(id);
    forcedListeners.delete(cb);
  };
};

const DISMISSED = "midnight-dismissed";

/** ↑ ↑ ↓ ↓ ← → ← → B A. On touch: the same as swipes, then two taps for B and A. */
const KONAMI = ["up", "up", "down", "down", "left", "right", "left", "right", "b", "a"];
const KEYS: Record<string, string> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", b: "b", a: "a" };

/** Flip between the green and aqua looks, revealed in a circle from the middle where supported. */
function flipFlavor() {
  const next = getFlavor() === "aqua" ? "green" : "aqua";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !document.startViewTransition) return setFlavor(next);
  const root = document.documentElement;
  root.classList.add("cheat");
  document.startViewTransition(() => setFlavor(next)).finished.finally(() => root.classList.remove("cheat"));
}

/**
 * Small hidden extras: a console greeting, for late-night visitors a badge plus stars in
 * the Night shift sky (CSS keys off html[data-midnight]), and the Konami code, which
 * swaps the green meadow for the aqua sky (and back).
 */
export default function EasterEggs() {
  const midnight = useSyncExternalStore(subscribeClock, isMidnight, () => false);
  const dark = useTheme() === "dark";
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(DISMISSED) === "1";
    } catch {
      return false;
    }
  });

  useEffect(greet, []);

  // Dev only (stripped from production builds): Shift+M toggles midnight on and off.
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    console.info("[dev] Shift+M toggles the midnight easter egg.");
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.code !== "KeyM" || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")) return;
      forced = !isMidnight();
      if (forced) setDismissed(false);
      console.info(`[dev] midnight ${forced ? "on" : "off"}`);
      forcedListeners.forEach((cb) => cb());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The secret code. Nothing on the page mentions it.
  useEffect(() => {
    let at = 0;
    const step = (token: string) => {
      at = token === KONAMI[at] ? at + 1 : token === KONAMI[0] ? 1 : 0;
      if (at < KONAMI.length) return;
      at = 0;
      flipFlavor();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")) return;
      const token = KEYS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (token) step(token);
      else at = 0;
    };
    // Touch: a swipe is a long, mostly one-axis drag (finger direction); a tap stands in for B, then A.
    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const p = e.touches[0];
      start = e.touches.length === 1 ? { x: p.clientX, y: p.clientY, t: e.timeStamp } : null;
    };
    const onEnd = (e: TouchEvent) => {
      const p = e.changedTouches[0];
      if (!start || !p) return;
      const dx = p.clientX - start.x, dy = p.clientY - start.y;
      const far = Math.max(Math.abs(dx), Math.abs(dy));
      const quick = e.timeStamp - start.t < 300;
      start = null;
      if (far < 12 && quick) {
        step(KONAMI[at] === "b" || KONAMI[at] === "a" ? KONAMI[at] : "tap");
      } else if (far > 40) {
        step(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (midnight) root.dataset.midnight = "";
    else delete root.dataset.midnight;
  }, [midnight]);

  if (!midnight || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED, "1");
    } catch {
      // Blocked storage: it just comes back on the next visit.
    }
  };

  return (
    <aside
      aria-label="Late-night note"
      className="midnight-badge clay fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 !rounded-full py-2 pl-4 pr-2 text-sm"
    >
      <span aria-hidden>🌙</span>
      <span>
        Burning the midnight oil? <span className="text-ink-soft">Me too.</span>
      </span>
      {!dark && (
        <button type="button" onClick={() => setTheme("dark")} className="link whitespace-nowrap font-medium">
          Lights off
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="grid size-8 shrink-0 place-items-center rounded-full text-ink-soft hover:text-ink"
      >
        ×
      </button>
    </aside>
  );
}
