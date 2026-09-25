"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-boot";

export type Theme = "sage" | "club";

/** Set before first paint by the inline script in app/layout.tsx; this just reads it back. */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "club" ? "club" : "sage";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode or blocked storage: the switch still works for this visit.
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "sage");
}
