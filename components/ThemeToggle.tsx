"use client";

import { setTheme, useTheme } from "@/lib/theme";

/** Daylight studio or Night shift. The label stays put; aria-pressed carries the state. */
export default function ThemeToggle() {
  const dark = useTheme() === "dark";
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label="Night shift (dark mode)"
      title={dark ? "Switch to daylight" : "Switch to night shift"}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="theme-toggle pill pill-soft !size-9 !justify-center !p-0 max-md:!size-11"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        {/* sun: shown by day */}
        <g className="theme-sun" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </g>
        {/* moon: shown at night */}
        <path className="theme-moon" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
