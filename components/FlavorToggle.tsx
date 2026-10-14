"use client";

import { setFlavor, useFlavor } from "@/lib/theme";

/**
 * Green meadow or aqua sky. The button is a little gel orb in the flavour you'd switch to,
 * so it previews the change; the label says it in words.
 */
export default function FlavorToggle() {
  const aqua = useFlavor() === "aqua";
  const next = aqua ? "green" : "aqua";
  return (
    <button
      type="button"
      aria-label={`Colour: ${aqua ? "aqua" : "green"}. Switch to ${next}`}
      title={`Switch to the ${next} look`}
      onClick={() => setFlavor(next)}
      className="flavor-toggle pill pill-soft !size-9 !justify-center !p-0 max-md:!size-11"
    >
      <span aria-hidden className={`flavor-orb flavor-orb-${next}`} />
    </button>
  );
}
