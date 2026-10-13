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
 * Build-a-bot, the peak of the page: a chrome and jelly robot in six parts, dragged back
 * together until it boots up and comes alive. Ties the robotics teaching to the dev work.
 * The buttons give keyboard and screen-reader users the same outcome as dragging.
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
            Build a bot. Watch it wake up.
          </h2>
          <p data-reveal className="mt-4 max-w-md leading-7 text-ink-soft">
            I teach kids to build robots at RoboStars. Your turn: drag the six parts onto the outline. When the last one
            clicks in, it comes alive.
            {/* Touch screens never need the keyboard route, so they don't hear about it. */}
            {!coarse && <> Using a keyboard? &ldquo;Build it for me&rdquo; assembles it in one go.</>}
          </p>
          {/* The pieces start scattered, so "Start over" only appears once there's something to undo;
              until then dragging is the action and auto-build is the quiet way out. */}
          <div className="mt-7 flex min-h-11 flex-wrap items-center gap-5">
            {(placed > 0 || done) && (
              <button type="button" onClick={() => setCommand((c) => ({ type: "scatter", n: c.n + 1 }))} className="pill pill-solid">
                {done ? "Build it again" : "Start over"}
              </button>
            )}
            <button
              type="button"
              disabled={done}
              onClick={() => setCommand((c) => ({ type: "build", n: c.n + 1 }))}
              className="link disabled:opacity-40"
            >
              Build it for me
            </button>
          </div>
        </div>
        {/* touch-none lives on the card (the 3D box passes pointer events through) */}
        <div data-reveal className={`clay relative overflow-hidden ${interactive ? "touch-none" : ""}`}>
          <BuilderSpot
            className="relative h-[380px] md:h-[480px]"
            command={command}
            interactive={interactive}
            onProgress={setPlaced}
          />
          {/* Progress lives on the board, so it stays in view while you play (phones scroll the copy away). */}
          <div className="pointer-events-none absolute left-4 top-4 max-w-[60%] md:left-5 md:top-5">
            <p aria-live="polite" className="font-display text-base font-bold leading-snug text-olive">
              {done ? <>Built! It&apos;s alive. Give it a poke.</> : <>{placed} / {PIECES} parts</>}
            </p>
            {/* progress rail: one pip per piece */}
            <div aria-hidden className="mt-2 flex gap-1">
              {Array.from({ length: PIECES }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-5 rounded-full transition-colors duration-500 ${i < placed ? "bg-moss" : "bg-sand/60"}`}
                />
              ))}
            </div>
          </div>
          {coarse &&
            (playing ? (
              <button type="button" onClick={() => setPlaying(false)} className="pill pill-soft absolute right-3 top-3 !py-1.5 !text-xs">
                Done playing
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-surface/80 to-transparent pb-6"
              >
                <span className="pill pill-solid">Tap to play</span>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
