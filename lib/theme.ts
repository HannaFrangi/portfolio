"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-boot";

export type Theme = "light" | "dark";

const media = "(prefers-color-scheme: dark)";

/** Set before first paint by the inline script in app/layout.tsx; this just reads it back. */
export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** An explicit choice, remembered; until then the page follows the system setting. */
export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode or blocked storage: the switch still works for this visit.
  }
}

function saved() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // No saved choice yet: follow the system when it flips (e.g. sunset on macOS).
  const mq = window.matchMedia(media);
  const onSystem = () => {
    if (!saved()) document.documentElement.dataset.theme = mq.matches ? "dark" : "light";
  };
  mq.addEventListener("change", onSystem);
  return () => {
    observer.disconnect();
    mq.removeEventListener("change", onSystem);
  };
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "light");
}
