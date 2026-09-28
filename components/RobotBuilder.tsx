"use client";

import { useState, useSyncExternalStore } from "react";
import { BuilderSpot, type BuilderCommand } from "./three/scenes";

const PIECES = 6;

// Touch screens: the play area only captures swipes after "Tap to play", so it never traps scrolling.
const coarseQuery = "(pointer: coarse)";
const subscribeCoarse = (cb: () => void) => {
  const mq = window.matchMedia(coarseQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/**
 * Build-a-robot: the RoboStars logo in pieces, dragged back together. Ties the robotics
 * teaching to the dev work. The buttons give keyboard and screen-reader users the same
 * outcome as dragging.
 */
export default function RobotBuilder() {
  const [placed, setPlaced] = useState(0);
  const [command, setCommand] = useState<BuilderCommand>({ type: "scatter", n: 0 });
  const [playing, setPlaying] = useState(false);
  const coarse = useSyncExternalStore(subscribeCoarse, () => window.matchMedia(coarseQuery).matches, () => false);
  const interactive = !coarse || playing;
  const done = placed === PIECES;

  return (
    <section id="build" data-section aria-labelledby="builder-title" className="px-4 py-20">
      {/* Mirrored split (toy left, copy right) so it doesn't repeat the featured layout. */}
      <div className="mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="md:order-2">
          <h2
            data-reveal
            id="builder-title"
            className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.03em]"
          >
            Build a RoboStars bot
          </h2>
          <p data-reveal className="mt-4 max-w-md leading-7 text-ink-soft">
            I teach kids to build robots at RoboStars. Your turn: drag the pieces onto the outline and they click into
            place.
          </p>
          <p aria-live="polite" className="mt-6 font-display text-lg font-bold text-olive">
            {done ? (
              <>Built! That&apos;s the RoboStars logo, by the way.</>
            ) : (
              <>
                {placed} / {PIECES} pieces
              </>
            )}
          </p>
          {/* progress rail: one pip per piece */}
          <div aria-hidden className="mt-3 flex gap-1.5">
            {Array.from({ length: PIECES }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${i < placed ? "bg-accent" : "bg-sand/60"}`}
              />
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => setCommand((c) => ({ type: "scatter", n: c.n + 1 }))} className="pill pill-soft">
              Scatter pieces
            </button>
            <button
              type="button"
              disabled={done}
              onClick={() => setCommand((c) => ({ type: "build", n: c.n + 1 }))}
              className="pill pill-solid disabled:opacity-50"
            >
              Build it for me
            </button>
          </div>
        </div>
        {/* touch-none lives on the card (the 3D box passes pointer events through) */}
        <div data-reveal className={`clay relative overflow-hidden ${interactive ? "touch-none" : ""}`}>
          <BuilderSpot
            className="relative h-[360px] md:h-[460px]"
            command={command}
            interactive={interactive}
            onProgress={setPlaced}
          />
          {coarse &&
            (playing ? (
              <button type="button" onClick={() => setPlaying(false)} className="pill pill-soft absolute right-3 top-3 !py-1.5 !text-xs">
                Done playing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-paper/80 to-transparent pb-6"
              >
                <span className="pill pill-solid">Tap to play</span>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
