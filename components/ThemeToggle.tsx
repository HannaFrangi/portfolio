"use client";

import { setTheme, useTheme } from "@/lib/theme";

/** Switches between the sage studio and the Soft Club (PS2 / Y2K) skin. */
export default function ThemeToggle() {
  const theme = useTheme();
  const club = theme === "club";
  return (
    <button
      type="button"
      aria-pressed={club}
      onClick={() => setTheme(club ? "sage" : "club")}
      className="theme-toggle pill pill-soft !gap-2 !px-3 !py-1.5 !text-xs font-medium"
      title={club ? "Switch to the sage theme" : "Switch to the Soft Club theme"}
    >
      <span aria-hidden className="theme-toggle-dot size-3 rounded-full" />
      <span>{club ? "Soft Club" : "Sage"}</span>
      <span className="sr-only">theme, press to switch</span>
    </button>
  );
}
