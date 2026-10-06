"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { person } from "@/lib/content";
import { setTheme, useTheme } from "@/lib/theme";

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

/**
 * Small hidden extras: a console greeting, and for late-night visitors a badge
 * plus stars in the Night shift sky (CSS keys off html[data-midnight]).
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
