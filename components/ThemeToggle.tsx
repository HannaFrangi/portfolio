"use client";

import { setTheme, useTheme } from "@/lib/theme";

/**
 * A real switch: the label names the skin ("Soft Club") and never changes; the knob
 * and aria-pressed carry the state. Off is the sage studio.
 */
export default function ThemeToggle() {
  const club = useTheme() === "club";
  return (
    <button
      type="button"
      aria-pressed={club}
      aria-label="Soft Club theme"
      onClick={() => setTheme(club ? "sage" : "club")}
      className="theme-toggle pill pill-soft !gap-2 !py-1.5 !pl-3 !pr-1.5 !text-xs font-medium"
    >
      <span>Soft Club</span>
      <span aria-hidden className="theme-switch">
        <span className="theme-toggle-dot" />
      </span>
    </button>
  );
}
