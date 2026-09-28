import type Lenis from "lenis";

/** The page's Lenis instance, when smooth scrolling is on (not with reduced motion). */
export const smooth: { lenis: Lenis | null } = { lenis: null };
