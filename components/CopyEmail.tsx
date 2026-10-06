"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The mailto pill needs a mail app; this copies the address instead, for visitors
 * on webmail or a borrowed laptop. The label confirms, and screen readers hear it.
 */
export default function CopyEmail({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const reset = useRef<number>(undefined);

  useEffect(() => () => window.clearTimeout(reset.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      // Clipboard blocked (permissions, insecure context): the address is still on the pill.
      setState("failed");
    }
    window.clearTimeout(reset.current);
    reset.current = window.setTimeout(() => setState("idle"), 2400);
  };

  return (
    <button type="button" onClick={copy} className="link">
      <span aria-live="polite">
        {state === "copied" ? "Email copied" : state === "failed" ? "Couldn't copy, it's on the button above" : "Copy email"}
      </span>
    </button>
  );
}
