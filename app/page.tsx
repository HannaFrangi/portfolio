import { Fragment } from "react";
import Image from "next/image";
import MemoryCard from "@/components/MemoryCard";
import Reveal from "@/components/Reveal";
import ScrollDriver from "@/components/ScrollDriver";
import StageMount from "@/components/StageMount";
import ThemeToggle from "@/components/ThemeToggle";
import ThreadPlane from "@/components/ThreadPlane";
import { BuddySpot, ClosingSpot, DeviceSpot, FeaturedSpot, HeroSpot } from "@/components/three/scenes";
import {
  certificates,
  clients,
  education,
  experience,
  featured,
  person,
  process,
  toolkit,
  works,
} from "@/lib/content";
import aboutPaper from "./media/about-paper.jpg";
import heroPlate from "./media/hero-plate.jpg";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: person.name,
  jobTitle: person.role,
  address: { "@type": "PostalAddress", addressCountry: "LB" },
  worksFor: { "@type": "Organization", name: "TheBooker" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Lebanese International University" },
  knowsAbout: ["React", "Next.js", "React Native", "JavaScript", "Admin dashboards", "SEO"],
  sameAs: [person.github, person.linkedin],
};

const reveal = (i = 0) => ({ "data-reveal": "", style: { ["--i" as string]: i } });

const Arrow = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
    <path d="M4 12 12 4M6 4h6v6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/**
 * Splits a line into letters that rise one after another. Letters are grouped per
 * word so lines only break between words. Screen readers get the plain text.
 */
function Kinetic({ text, className, offset = 0 }: { text: string; className: string; offset?: number }) {
  const words = text.split(" ");
  let i = offset;
  return (
    <span className={className} aria-label={text}>
      {words.map((word, w) => (
        <Fragment key={w}>
          <span aria-hidden className="inline-block whitespace-nowrap">
            {Array.from(word).map((ch) => (
              <span key={i} className="char" style={{ ["--i" as string]: i++ }}>
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 && " "}
        </Fragment>
      ))}
    </span>
  );
}

/** Soft Club only: little four-point stars twinkling across the page. */
function Sparkles() {
  const stars = [
    [8, 18, 14, 0], [22, 64, 10, 1.2], [37, 30, 8, 2.1], [52, 82, 12, 0.6], [66, 12, 9, 1.7],
    [78, 48, 14, 2.6], [90, 26, 8, 0.9], [14, 88, 9, 3.1], [45, 52, 7, 1.4], [84, 76, 11, 2.2],
  ];
  return (
    <div aria-hidden className="theme-club-only pointer-events-none fixed inset-0 z-20">
      {stars.map(([x, y, size, delay], i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="sparkle absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: size * 1.6, animationDelay: `${delay}s` }}
        >
          <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0Z" fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}

function Nav() {
  const links = [
    ["Work", "#work"],
    ["Process", "#process"],
    ["About", "#about"],
    ["Toolkit", "#toolkit"],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4">
      <nav
        aria-label="Main"
        className="pill-soft mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-2.5"
      >
        <a href="#top" className="font-serif text-xl italic leading-none">
          {person.name}
        </a>
        <ul className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
          {links.map(([label, href]) => (
            <li key={href}>
              <a href={href} className="transition-colors hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href={person.github} target="_blank" rel="noopener noreferrer" className="pill pill-solid !py-1.5 max-sm:hidden">
            GitHub <Arrow />
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section
      id="top"
      data-progress="leave"
      aria-labelledby="hero-title"
      className="relative isolate h-[100svh] min-h-[640px] overflow-hidden"
    >
      {/* Far plane: generated space-age landscape. It sits under the headline, which sits
          under the WebGL portrait and blobs: landscape, type, subject, foreground. */}
      <div aria-hidden className="plate absolute inset-0 -z-10">
        <div className="plate-drift absolute inset-[-6%]">
          <Image src={heroPlate} alt="" fill preload placeholder="blur" sizes="100vw" className="object-cover object-[50%_62%]" />
        </div>
      </div>
      {/* Outside the moving plate, so the hero always melts into the page below. */}
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-b from-transparent to-mist" />
      <div className="absolute inset-x-0 top-[11vh] px-4 text-center max-md:top-[12vh]">
        <p className="intro-pill pill pill-soft mx-auto !text-xs uppercase tracking-[0.2em] text-olive">
          <span className="relative size-2 rounded-full bg-accent dot-pulse" aria-hidden />
          React · React Native · {person.location}
        </p>
        <h1 id="hero-title" className="mt-5">
          <Kinetic
            text={`Hi, I'm ${person.first}`}
            offset={4}
            className="block font-display text-[clamp(2.8rem,7.4vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-moss"
          />
          {/* This line sits behind the portrait on purpose: type between the 3D planes. */}
          <span className="wipe-in block font-serif text-[clamp(3.2rem,9vw,8.6rem)] italic leading-[0.95] tracking-[-0.01em]">
            React Developer
          </span>
        </h1>
        {/* Phones: the portrait fills the lower screen, so the action sits under the title. */}
        <a href="#work" className="intro-late pill pill-solid mt-6 md:hidden">
          See my work <Arrow />
        </a>
      </div>

      <HeroSpot className="absolute inset-0" />

      <div className="intro-late absolute bottom-10 left-6 hidden max-w-[16rem] md:block lg:left-12">
        <p className="pill pill-soft !text-[0.8rem] text-olive">Web · Mobile · Admin dashboards</p>
        <p className="pill-soft mt-3 rounded-2xl px-4 py-3 text-sm leading-6 text-ink-soft">
          2+ years building production apps for real clients.
        </p>
      </div>
      <div className="intro-late absolute bottom-10 right-6 hidden max-w-[19rem] text-right md:block lg:right-12">
        <p className="pill-soft rounded-2xl px-4 py-3 text-[0.95rem] leading-6 text-ink-soft">
          I build web apps, mobile apps and the admin dashboards that run them, from the first requirement to
          deployment.
        </p>
        <a href="#work" className="pill pill-solid mt-4">
          See my work <Arrow />
        </a>
      </div>
    </section>
  );
}

function Clients() {
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-12 pr-12">
      {clients.map((c) => (
        <li key={c} className="flex items-center gap-3 whitespace-nowrap font-serif text-3xl italic text-olive/80">
          <span aria-hidden className="size-2 rotate-45 rounded-[2px] bg-sage" />
          {c}
        </li>
      ))}
    </ul>
  );
  return (
    <section data-section aria-label="Built for" className="py-14">
      <p {...reveal(0)} className="text-center font-display text-sm font-medium uppercase tracking-[0.25em] text-ink-soft">
        Built for
      </p>
      {/* Two copies side by side so the drift loops without a seam. */}
      <div {...reveal(1)} className="marquee-mask mt-6 overflow-hidden">
        <div className="marquee flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}

/** The peak. Pinned on desktop: the text lights point by point while the 3D plays out. */
function Featured() {
  const beats = [0.3, 0.5, 0.7];
  return (
    <section
      id="work"
      data-section
      data-progress="pin"
      aria-labelledby="featured-title"
      className="relative scroll-mt-0 px-4 md:h-[320vh]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 py-20 md:sticky md:top-0 md:h-screen md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-0">
        <div>
          <p {...reveal(0)} className="eyebrow">/ Featured project /</p>
          <h2
            {...reveal(1)}
            id="featured-title"
            className="mt-2 font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold tracking-[-0.03em]"
          >
            {featured.name}
          </h2>
          <div {...reveal(2)} className="clay mt-6 p-7 lg:p-8">
            <p className="font-serif text-2xl italic text-olive">{featured.kind}</p>
            <p className="mt-3 leading-7 text-ink-soft">{featured.summary}</p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem] leading-6">
              {featured.points.map((p, i) => (
                <li key={p} className="beat flex gap-3" style={{ ["--s" as string]: beats[i] }}>
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {featured.stack.map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
            </div>
            {featured.href && (
              <a href={featured.href} target="_blank" rel="noopener noreferrer" className="pill pill-solid mt-7">
                Visit {featured.hrefLabel} <Arrow />
              </a>
            )}
          </div>
        </div>
        <FeaturedSpot className="relative h-[420px] md:h-[78vh]" screen={featured.screen} />
      </div>
    </section>
  );
}

/** Pinned on desktop: the cards ride a sideways rail. Phones get a normal vertical stack. */
function Works() {
  return (
    <section data-section data-progress="pin" aria-labelledby="works-title" className="theme-sage-only relative md:h-[220vh]">
      <div className="py-20 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:overflow-hidden md:py-0">
        <div data-rail className="flex flex-col gap-6 px-4 will-change-transform md:flex-row md:items-stretch md:px-[6vw]">
          <div {...reveal(0)} className="flex shrink-0 flex-col justify-center md:w-[26vw] md:pr-4">
            <h2 id="works-title" className="font-display text-[clamp(2.4rem,4.6vw,4.2rem)] font-bold leading-[0.98] tracking-[-0.03em]">
              Selected works
            </h2>
            <p className="mt-4 max-w-sm leading-7 text-ink-soft">
              Client sites and a SaaS product. Every screen here is the real site, scrolling as you scroll.
            </p>
          </div>
          {works.map((w, i) => (
            <article
              key={w.id}
              {...reveal(1 + i)}
              className="clay clay-lift flex shrink-0 flex-col overflow-hidden p-3 md:w-[min(540px,40vw)]"
            >
              <DeviceSpot className="relative h-[250px] rounded-[20px] bg-gradient-to-b from-mist/70 to-cream/40 md:h-[38vh]" project={w} />
              <div className="flex flex-1 flex-col px-3 pb-3 pt-5">
                <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink-soft">{w.kind}</p>
                <h3 className="mt-1.5 font-display text-2xl font-bold tracking-[-0.02em]">{w.name}</h3>
                <p className="mt-2 text-[0.95rem] leading-6 text-ink-soft">{w.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {w.stack.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-5">
                  {w.href ? (
                    <a
                      href={w.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-moss underline decoration-sage/50 underline-offset-4 hover:text-olive"
                    >
                      {w.hrefLabel} <Arrow />
                    </a>
                  ) : (
                    <span className="text-sm text-ink-soft">Private SaaS, no public link</span>
                  )}
                </div>
              </div>
            </article>
          ))}
          {/* trailing room so the last card can travel fully into view */}
          <div aria-hidden className="hidden shrink-0 md:block md:w-[2vw]" />
        </div>
      </div>
    </section>
  );
}

function Process() {
  const at = [0.15, 0.45, 0.75];
  return (
    <section
      id="process"
      data-section
      data-progress="draw"
      aria-labelledby="process-title"
      className="scroll-mt-24 px-4 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          {...reveal(0)}
          id="process-title"
          className="font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold tracking-[-0.03em]"
        >
          How I work
        </h2>
        <p {...reveal(1)} className="mt-3 max-w-md leading-7 text-ink-soft">
          From the first requirement to deployment, and support after launch.
        </p>
        <ol className="relative mt-20 grid gap-6 md:grid-cols-3">
          {/* The thread draws itself with scroll; each step lights as it arrives. */}
          <svg
            aria-hidden
            viewBox="0 0 1000 120"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-[12%] -top-12 hidden h-24 w-[76%] md:block"
          >
            <defs>
              <mask id="thread-draw">
                <path className="thread-mask" pathLength={1} d="M0 100 C 200 -10, 300 -10, 500 60 S 800 130, 1000 20" fill="none" stroke="#fff" strokeWidth="10" />
              </mask>
            </defs>
            <path id="thread-path" d="M0 100 C 200 -10, 300 -10, 500 60 S 800 130, 1000 20" fill="none" stroke="var(--sage)" strokeWidth="2" strokeDasharray="6 8" mask="url(#thread-draw)" />
          </svg>
          <ThreadPlane pathId="thread-path" />
          {process.map((p, i) => (
            <li
              key={p.step}
              className={`step clay clay-lift relative p-7 ${i === 1 ? "md:-translate-y-6" : ""}`}
              style={{ ["--s" as string]: at[i] }}
            >
              <span className="step-num font-display text-5xl font-extrabold">{p.step}</span>
              <h3 className="mt-4 font-serif text-3xl italic">{p.title}</h3>
              <p className="mt-2 leading-7 text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Generated paper-cut landscape. As the section passes, the camera drifts across it
 * (scroll-driven zoom and pan) and a band of window light slides over the paper.
 */
function PaperBackdrop() {
  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="paper absolute inset-[-8%]">
        <Image src={aboutPaper} alt="" fill placeholder="blur" sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
      </div>
      <div className="light-sweep absolute inset-0" />
    </div>
  );
}

function About() {
  return (
    <section
      id="about"
      data-section
      data-progress="pass"
      aria-labelledby="about-title"
      className="scroll-mt-24 px-4 py-20"
    >
      <div
        {...reveal(0)}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] text-paper shadow-[0_40px_80px_-40px_rgb(89_95_62/0.8)]"
      >
        <PaperBackdrop />
        {/* Frosted olive panels behind the copy only: the paper stays visible around them. */}
        <div className="relative grid gap-6 p-5 md:gap-8 md:p-12 lg:grid-cols-2">
          <div className="about-panel self-start">
            <p className="font-serif text-xl italic text-paper/80">/ Who I am /</p>
            <h2 id="about-title" className="mt-3 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.03em]">
              Developer by day, robotics teacher on the side.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-paper/85">
              I build React and React Native products at TheBooker and for freelance clients, and I teach kids robotics
              and programming at RoboStars, including kids with special needs. Currently studying for an MSc in Computer
              Science.
            </p>
          </div>
          <div className="about-panel space-y-8">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-paper/70">Experience</h3>
              <ul className="mt-3 divide-y divide-paper/20 border-y border-paper/20">
                {experience.map((e, i) => (
                  <li key={e.role} {...reveal(1 + i)} className="grid grid-cols-[1fr_auto] gap-x-4 py-3.5">
                    <span className="font-medium">{e.role}</span>
                    <span className="text-sm text-paper/75">{e.period}</span>
                    <span className="text-sm text-paper/75">{e.place}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-paper/70">Studies</h3>
              <ul className="mt-3 divide-y divide-paper/20 border-y border-paper/20">
                {education.map((e, i) => (
                  <li key={e.title} {...reveal(4 + i)} className="grid grid-cols-[1fr_auto] gap-x-4 py-3.5">
                    <span className="font-medium">{e.title}</span>
                    <span className="text-sm text-paper/75">{e.period}</span>
                    <span className="text-sm text-paper/75">{e.place}</span>
                  </li>
                ))}
              </ul>
              <p {...reveal(6)} className="mt-4 text-sm leading-6 text-paper/80">
                Cisco: {certificates.join(", ")}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Toolkit() {
  let n = 0;
  return (
    <section id="toolkit" data-section aria-labelledby="toolkit-title" className="scroll-mt-24 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <h2
          {...reveal(0)}
          id="toolkit-title"
          className="text-center font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold tracking-[-0.03em]"
        >
          Toolkit
        </h2>
        <div className="clay mt-10 divide-y divide-sand/40 px-6 md:px-10">
          {toolkit.map((t) => (
            <div key={t.group} className="grid gap-3 py-5 md:grid-cols-[10rem_1fr] md:items-center">
              <h3 {...reveal(n++)} className="font-serif text-2xl italic text-olive">
                {t.group}
              </h3>
              <div className="flex flex-wrap gap-2">
                {t.items.map((item) => (
                  <span key={item} {...reveal(n++)} className="chip chip-pop !text-[0.85rem]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section data-section aria-labelledby="closing-title" className="px-4 pb-10 pt-10">
      <div className="mx-auto max-w-4xl text-center">
        <ClosingSpot className="relative mx-auto h-[340px] max-w-2xl" />
        <h2 {...reveal(0)} id="closing-title" className="font-serif text-[clamp(2.6rem,6vw,4.6rem)] italic leading-none text-moss">
          Thanks for scrolling.
        </h2>
        <p {...reveal(1)} className="mx-auto mt-4 max-w-md leading-7 text-ink-soft">
          More of my work and history lives on GitHub and LinkedIn.
        </p>
        <div {...reveal(2)} className="mt-7 flex justify-center gap-3">
          <a href={person.github} target="_blank" rel="noopener noreferrer" className="pill pill-solid">
            GitHub <Arrow />
          </a>
          <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="pill pill-soft">
            LinkedIn <Arrow />
          </a>
        </div>
      </div>
      <footer className="mx-auto mt-20 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-sand/50 pt-6 text-xs text-ink-soft max-md:pr-28 md:pr-40">
        <span>
          © {new Date().getFullYear()} {person.name}
        </span>
        <span>Built with Next.js and three.js</span>
      </footer>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <StageMount />
      <Sparkles />
      {/* Robot buddy: lives in the corner, drawn by the shared canvas. */}
      <BuddySpot className="pointer-events-none fixed bottom-2 right-1 z-30 h-[140px] w-[110px] md:bottom-4 md:right-4 md:h-[190px] md:w-[150px]" />
      <ScrollDriver />
      <Reveal />
      <Nav />
      <main>
        <Hero />
        <Clients />
        <Featured />
        <Works />
        <MemoryCard works={works} />
        <Process />
        <About />
        <Toolkit />
        <Closing />
      </main>
    </>
  );
}
