"use client";

import { lazy, Suspense, type ComponentType } from "react";
import { useSkin } from "@/lib/theme";
import * as classic from "./scenes";

/**
 * The 3D spots for whichever look is on. The classic scenes ship with the page; each secret
 * look's scenes are a separate chunk that only loads once someone enters the Konami code
 * (EasterEggs preloads the next one before switching, so the swap doesn't flash).
 */
export const loadY2k = () => import("./y2k/scenes");
export const loadWasteland = () => import("./wasteland/scenes");

type Scenes = Awaited<ReturnType<typeof loadY2k>> & Awaited<ReturnType<typeof loadWasteland>>;
type Name = "HeroSpot" | "FeaturedSpot" | "DeviceSpot" | "BuilderSpot" | "ClosingSpot";

function skinned<P extends { className: string }>(name: Name, Classic: ComponentType<P>) {
  const pick = (m: Partial<Scenes>) => ({ default: m[name] as unknown as ComponentType<P> });
  const Y2k = lazy(() => loadY2k().then(pick));
  const Wasteland = lazy(() => loadWasteland().then(pick));
  function Spot(props: P) {
    const skin = useSkin();
    if (skin === "classic") return <Classic {...props} />;
    const Skinned = skin === "y2k" ? Y2k : Wasteland;
    // While the chunk arrives, keep the box so the layout doesn't jump.
    return (
      <Suspense fallback={<div className={props.className} aria-hidden />}>
        <Skinned {...props} />
      </Suspense>
    );
  }
  Spot.displayName = name;
  return Spot;
}

export const HeroSpot = skinned("HeroSpot", classic.HeroSpot);
export const FeaturedSpot = skinned("FeaturedSpot", classic.FeaturedSpot);
export const DeviceSpot = skinned("DeviceSpot", classic.DeviceSpot);
export const BuilderSpot = skinned("BuilderSpot", classic.BuilderSpot);
export const ClosingSpot = skinned("ClosingSpot", classic.ClosingSpot);
export type { BuilderCommand } from "./scenes";
