"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow } from "./icons";

/** Phones only: the section links and GitHub, behind one thumb-sized button. */
export default function MobileMenu({ links, github }: { links: readonly (readonly [string, string])[]; github: string }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (!panel.current?.parentElement?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="pill pill-soft !size-11 !justify-center !p-0"
      >
        <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          ) : (
            <path d="M3.5 6.5h13M3.5 13.5h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          )}
        </svg>
      </button>
      <div
        ref={panel}
        id="mobile-menu"
        hidden={!open}
        className="absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-[28px] border border-hairline bg-surface p-2 shadow-[0_24px_48px_-24px_rgb(89_95_62/0.5)]"
      >
        <ul>
          {links.map(([label, href]) => (
            <li key={href}>
              <a href={href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3.5 text-lg font-medium hover:bg-sand/30">
                {label}
              </a>
            </li>
          ))}
          <li>
            <a href={github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-2xl px-4 py-3.5 text-lg font-medium text-olive hover:bg-sand/30">
              GitHub <Arrow />
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
