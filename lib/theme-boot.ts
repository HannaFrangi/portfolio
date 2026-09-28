// Plain (server-safe) module: the layout inlines this before first paint.
export const THEME_KEY = "theme";

/**
 * Runs in <head> before paint: a saved choice wins, otherwise the system setting.
 * Sets data-theme so a dark-mode visitor never sees a flash of the daylight page.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;
