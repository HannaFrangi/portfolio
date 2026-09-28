"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import type { Project } from "@/lib/content";
import { Arrow } from "./icons";
import { MemoryIcon } from "./three/scenes";

/**
 * Soft Club's take on Selected works: the PS2 memory-card browser. Each project is a
 * save icon; hovering, focusing or clicking one loads its details, and arrow keys move
 * between them.
 */
export default function MemoryCard({ works }: { works: Project[] }) {
  const [active, setActive] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = works[active];

  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + works.length) % works.length;
    setActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <section
      id="memory"
      data-section
      aria-labelledby="memory-title"
      className="theme-club-only scroll-mt-24 px-4 py-24"
    >
      <div data-reveal className="memory mx-auto max-w-6xl overflow-hidden rounded-[36px]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/50 px-6 py-4 md:px-10">
          <h2 id="memory-title" className="font-display text-lg font-bold tracking-[0.02em] text-olive md:text-xl">
            Memory Card <span className="font-mono text-sm font-normal text-ink-soft">(PS2) / 1</span>
          </h2>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Selected works · {works.length} saves</p>
        </header>

        <div role="toolbar" aria-label="Saved projects" onKeyDown={onKey} className="grid grid-cols-2 gap-2 px-3 pt-6 md:grid-cols-4 md:gap-5 md:px-10">
          {works.map((w, i) => (
            <button
              key={w.id}
              ref={(el) => void (buttons.current[i] = el)}
              type="button"
              aria-pressed={i === active}
              aria-describedby={i === active ? "memory-detail" : undefined}
              aria-label={`${w.name}, ${w.kind}`}
              tabIndex={i === active ? 0 : -1}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="memory-slot group relative rounded-[24px] text-left"
            >
              <MemoryIcon className="relative h-[150px] md:h-[240px]" project={w} selected={i === active} />
              <span className="block px-2 pb-3 text-center font-display text-xs font-semibold text-ink md:text-sm">{w.name}</span>
            </button>
          ))}
        </div>

        {/* Detail panel: what the PS2 shows under the icons for the highlighted save. */}
        {/* Not a live region: the focused save's button already names it, and announcing
            every hover would be noise for screen-reader users who also use a mouse. */}
        <div id="memory-detail" className="memory-detail mx-3 mb-3 mt-4 grid gap-4 rounded-[26px] p-6 md:mx-10 md:mb-10 md:grid-cols-[1fr_auto] md:items-end md:p-8">
          <div>
            <h3 className="font-display text-3xl font-bold tracking-[-0.01em] md:text-4xl">{current.name}</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {current.kind} · <span className="font-medium text-olive">{current.role}</span>
            </p>
            <p className="mt-3 max-w-xl leading-7 text-ink-soft">{current.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {current.stack.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
            {current.links && (
              <p className="mt-4 flex flex-wrap gap-x-5">
                {current.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="link">
                    {l.label} <Arrow />
                  </a>
                ))}
              </p>
            )}
          </div>
          {current.href ? (
            <a href={current.href} target="_blank" rel="noopener noreferrer" className="pill pill-solid self-start md:self-end">
              Load {current.hrefLabel} <Arrow />
            </a>
          ) : (
            <span className="text-sm text-ink-soft">Private SaaS, no public link</span>
          )}
        </div>
      </div>
    </section>
  );
}
