// Plain (server-safe) module: the layout inlines this before first paint.
export const THEME_KEY = "theme";
export const FLAVOR_KEY = "flavor";

/**
 * Runs in <head> before paint: a saved choice wins, otherwise the system setting.
 * Sets data-theme so a dark-mode visitor never sees a flash of the daylight page, and
 * data-flavor (green or aqua) so a returning aqua visitor never sees a flash of green.
 */
export const themeBootScript = `(function(){try{var e=document.documentElement;var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;e.setAttribute("data-theme",d?"dark":"light");e.setAttribute("data-flavor",localStorage.getItem("${FLAVOR_KEY}")==="aqua"?"aqua":"green")}catch(e){}})()`;
