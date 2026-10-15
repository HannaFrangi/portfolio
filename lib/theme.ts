"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./theme-boot";

export type Theme = "light" | "dark";
/**
 * The look: the sage studio everyone sees ("classic"), or the secret neo-Y2K site ("y2k"),
 * unlocked with the Konami code. Never saved: every visit starts classic.
 */
export type Skin = "classic" | "y2k";
/** Inside the neo-Y2K look: the green frutiger meadow, or the aqua and lilac sky. */
export type Flavor = "green" | "aqua";

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
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-flavor", "data-skin"] });
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

export function getSkin(): Skin {
  return document.documentElement.dataset.skin === "y2k" ? "y2k" : "classic";
}

export function setSkin(skin: Skin) {
  document.documentElement.dataset.skin = skin;
}

export function useSkin(): Skin {
  return useSyncExternalStore(subscribe, getSkin, () => "classic");
}

export function getFlavor(): Flavor {
  return document.documentElement.dataset.flavor === "aqua" ? "aqua" : "green";
}

export function setFlavor(flavor: Flavor) {
  document.documentElement.dataset.flavor = flavor;
}

export function useFlavor(): Flavor {
  return useSyncExternalStore(subscribe, getFlavor, () => "green");
}
