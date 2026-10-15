"use client";

import { lazy, Suspense, type ComponentType } from "react";
import { useSkin } from "@/lib/theme";
import * as classic from "./scenes";

/**
 * The 3D spots for whichever look is on. The classic scenes ship with the page; the
 * neo-Y2K ones are a separate chunk that only loads once someone enters the Konami code
 * (EasterEggs preloads it before switching, so the swap doesn't flash).
 */
export const loadY2k = () => import("./y2k/scenes");

function skinned<P extends { className: string }>(
  name: string,
  Classic: ComponentType<P>,
  load: (m: Awaited<ReturnType<typeof loadY2k>>) => ComponentType<P>,
) {
  const Y2k = lazy(() => loadY2k().then((m) => ({ default: load(m) })));
  function Spot(props: P) {
    if (useSkin() === "classic") return <Classic {...props} />;
    // While the chunk arrives, keep the box so the layout doesn't jump.
    return (
      <Suspense fallback={<div className={props.className} aria-hidden />}>
        <Y2k {...props} />
      </Suspense>
    );
  }
  Spot.displayName = name;
  return Spot;
}

export const HeroSpot = skinned("HeroSpot", classic.HeroSpot, (m) => m.HeroSpot);
export const FeaturedSpot = skinned("FeaturedSpot", classic.FeaturedSpot, (m) => m.FeaturedSpot);
export const DeviceSpot = skinned("DeviceSpot", classic.DeviceSpot, (m) => m.DeviceSpot);
export const BuilderSpot = skinned("BuilderSpot", classic.BuilderSpot, (m) => m.BuilderSpot);
export const ClosingSpot = skinned("ClosingSpot", classic.ClosingSpot, (m) => m.ClosingSpot);
export type { BuilderCommand } from "./scenes";
