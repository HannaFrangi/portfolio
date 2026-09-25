// Plain (server-safe) module: the layout inlines this before first paint.
export const THEME_KEY = "theme";

/** Runs in <head> before paint so a returning Soft Club visitor never sees the sage flash. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="club")document.documentElement.setAttribute("data-theme","club")}catch(e){}})()`;
