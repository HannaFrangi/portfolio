import { Fragment } from "react";
import Image from "next/image";
import CopyEmail from '@/components/CopyEmail';
import EasterEggs from '@/components/EasterEggs';
import MobileMenu from "@/components/MobileMenu";
import Reveal from "@/components/Reveal";
import RobotBuilder from "@/components/RobotBuilder";
import ScrollDriver from "@/components/ScrollDriver";
import SmoothScroll from "@/components/SmoothScroll";
import StageMount from "@/components/StageMount";
import ThemeToggle from "@/components/ThemeToggle";
import ThreadPlane from "@/components/ThreadPlane";
import { Arrow } from "@/components/icons";
import { ClosingSpot, DeviceSpot, FeaturedSpot, HeroSpot } from "@/components/three/spots";
import {
  certificates,
  clients,
  currently,
  education,
  experience,
  featured,
  person,
  process,
  steam,
  toolkit,
  works,
} from "@/lib/content";
import { siteUrl } from "@/lib/site";
import aboutPaper from "./media/about-paper.jpg";
import aboutWaterDark from "./media/about-water-dark.jpg";
import aboutWaterLight from "./media/about-water-light.jpg";
import heroPlate from "./media/hero-plate.jpg";
import heroSkyAquaDark from "./media/hero-sky-aqua-dark.jpg";
import heroSkyAquaLight from "./media/hero-sky-aqua-light.jpg";
import heroSkyDark from "./media/hero-sky-dark.jpg";
import heroSkyLight from "./media/hero-sky-light.jpg";
import portrait from "../public/textures/portrait.png";

/** One sentence the whole page should leave behind. */
const pitch = "I build web and mobile apps, and the admin dashboards behind them. I also teach kids to build robots.";

const personId = `${siteUrl}/#person`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": personId,
      name: person.name,
      alternateName: person.altName,
      url: siteUrl,
      // The public path, not the imported asset: its hashed URL changes every build.
      image: `${siteUrl}/textures/portrait.png`,
      jobTitle: person.role,
      description: pitch,
      email: `mailto:${person.email}`,
      address: { "@type": "PostalAddress", addressCountry: "LB" },
      worksFor: { "@type": "Organization", name: "TheBooker", url: "https://thebooker.online" },
      alumniOf: { "@type": "CollegeOrUniversity", name: "Lebanese International University" },
      knowsAbout: ["React", "Next.js", "React Native", "JavaScript", "Admin dashboards", "SEO"],
      hasCredential: [
        { "@type": "EducationalOccupationalCredential", name: steam, credentialCategory: "certification" },
        ...certificates.map((name) => ({
          "@type": "EducationalOccupationalCredential",
          name,
          credentialCategory: "certification",
          recognizedBy: { "@type": "Organization", name: "Cisco Networking Academy" },
        })),
      ],
      sameAs: [person.github, person.linkedin],
    },
    {
      "@type": "ProfilePage",
      "@id": `${siteUrl}/#page`,
      url: siteUrl,
      name: `${person.name} | ${person.role}`,
      mainEntity: { "@id": personId },
    },
    ...[featured, ...works].map((p) => ({
      "@type": "CreativeWork",
      name: p.name,
      description: `${p.kind}. ${p.summary}`,
      ...(p.href && { url: p.href }),
      keywords: p.stack.join(", "),
      // Team projects credit Hanna as a contributor, solo ones as the creator.
      [p.role.startsWith("Team") ? "contributor" : "creator"]: { "@id": personId },
    })),
  ],
};

const reveal = (i = 0) => ({ "data-reveal": "", style: { ["--i" as string]: i } });

const navLinks = [
  ["Work", "#work"],
  ["Process", "#process"],
  ["About", "#about"],
  ["Toolkit", "#toolkit"],
] as const;

/**
 * Splits a line into letters that rise one after another. Letters are grouped per
 * word so lines only break between words. Screen readers get one plain sr-only copy.
 */
function Kinetic({ text, srText = text, className, offset = 0 }: { text: string; srText?: string; className: string; offset?: number }) {
  const words = text.split(" ");
  let i = offset;
  return (
    <span className={className}>
      <span className="sr-only">{srText}</span>
      {words.map((word, w) => (
        <Fragment key={w}>
          <span aria-hidden className="inline-block whitespace-nowrap">
            {Array.from(word).map((ch) => (
              <span key={i} className="char" style={{ ["--i" as string]: i++ }}>
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 && <span aria-hidden> </span>}
        </Fragment>
      ))}
    </span>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <nav
        aria-label="Main"
        className="pill-soft relative mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-2.5"
      >
        <a href="#top" className="font-serif text-xl italic leading-none">
          {person.name}
        </a>
        <ul className="hidden items-center gap-7 text-sm text-ink-soft md:flex">
          {navLinks.map(([label, href]) => (
            <li key={href}>
              <a href={href} className="transition-colors hover:text-ink">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href={person.cv} download className="pill pill-soft !py-1.5 max-md:hidden">
            CV
          </a>
          <a href="#closing" className="pill pill-solid !py-1.5 max-md:hidden">
            Contact
          </a>
          <MobileMenu links={[...navLinks, ["Contact", "#closing"], ["CV (PDF)", person.cv]]} github={person.github} />
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section
      id='top'
      data-progress='leave'
      aria-labelledby='hero-title'
      className='relative isolate h-[100svh] min-h-160 overflow-hidden'>
      {/* Far plane: generated space-age landscape. It sits under the headline, which sits
          under the WebGL portrait and blobs: landscape, type, subject, foreground. */}
      <div aria-hidden className='plate absolute inset-0 -z-10'>
        <div className='plate-drift absolute inset-[-6%]'>
          <div className='skin-classic absolute inset-0'>
            <Image
              src={heroPlate}
              alt=''
              fill
              preload
              placeholder='blur'
              sizes='100vw'
              className='object-cover object-[50%_62%]'
            />
          </div>
          {/* The secret neo-Y2K look: a frutiger sky per flavour and theme. Hidden (and so never
              loaded) until the Konami code unlocks it. */}
          <div className='skin-y2k absolute inset-0'>
            <div className='flavor-green absolute inset-0'>
              <div className='sky-light absolute inset-0'>
                <Image src={heroSkyLight} alt='' fill sizes='100vw' className='object-cover object-[50%_62%]' />
              </div>
              <div className='sky-dark absolute inset-0'>
                <Image src={heroSkyDark} alt='' fill sizes='100vw' className='object-cover object-[50%_62%]' />
              </div>
            </div>
            <div className='flavor-aqua absolute inset-0'>
              <div className='sky-light absolute inset-0'>
                <Image src={heroSkyAquaLight} alt='' fill sizes='100vw' className='object-cover object-[50%_62%]' />
              </div>
              <div className='sky-dark absolute inset-0'>
                <Image src={heroSkyAquaDark} alt='' fill sizes='100vw' className='object-cover object-[50%_62%]' />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Outside the moving plate, so the hero always melts into the page below. */}
      <div
        aria-hidden
        className='absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-b from-transparent to-mist'
      />
      <div className='absolute inset-x-0 top-[12vh] px-4 text-center max-md:top-[13vh]'>
        <h1 id='hero-title'>
          <Kinetic
            text={`Hi, I'm ${person.first}`}
            srText={`Hi, I'm ${person.first},`}
            offset={0}
            className='block font-display text-[clamp(2.8rem,7.4vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-moss'
          />
          <span className='wipe-in mt-1 block font-serif text-[clamp(2rem,5vw,4.6rem)] italic leading-[1] tracking-[-0.01em]'>
            React &amp; React Native Developer
          </span>
        </h1>
        {/* Phones: the portrait fills the lower screen, so the pitch sits under the title. */}
        <p className='intro-late mx-auto mt-4 max-w-xs text-[0.95rem] leading-6 text-ink-soft md:hidden'>
          {pitch}
          <span className='mt-1 block text-sm font-medium text-olive'>
            2+ years shipping production apps.
          </span>
        </p>
        {/* Availability and the action, right under the name where a recruiter is looking. */}
        <div className='intro-late mt-5 flex flex-wrap items-center justify-center gap-3'>
          {/* A status, not a button: no pill chrome or hover lift, so it never reads as clickable. */}
          <p className='inline-flex items-center gap-2 rounded-full bg-surface/55 px-3.5 py-2 text-[0.8rem] font-medium text-olive backdrop-blur-sm'>
            <span
              aria-hidden
              className='relative size-2 rounded-full bg-accent dot-pulse'
            />
            Open to React &amp; React Native roles · {person.location}
          </p>
          <a href='#work' className='pill pill-solid'>
            See my work <Arrow />
          </a>
        </div>
      </div>

      {/* Static portrait: shows at once (and if WebGL is unavailable), then hands over to the
          3D one, which sets html[data-portrait="3d"] when it exists. */}
      <div
        aria-hidden
        className='portrait-fallback pointer-events-none absolute inset-x-0 bottom-0 top-[34%] flex justify-center'>
        <Image
          src={portrait}
          alt=''
          loading='eager'
          fetchPriority='high'
          sizes='(min-width: 768px) 40vw, 80vw'
          className='h-[140%] w-auto max-w-none object-contain object-top'
        />
      </div>

      <HeroSpot className='absolute inset-0' />

      <div className='intro-late absolute bottom-10 right-6 hidden max-w-[21rem] text-right md:block lg:right-12'>
        <p className='pill-soft rounded-2xl px-5 py-4 text-[1rem] leading-7 text-ink'>
          {pitch}
          <span className='mt-1 block text-sm font-medium text-olive'>
            2+ years shipping production apps.
          </span>
        </p>
      </div>
    </section>
  );
}

/** Context, not a logo wall: who the work below was built for, in one sentence. */
function Clients() {
  const [employer, ...solo] = clients;
  const em = (name: string) => <em className="font-serif text-[1.35em] text-olive">{name}</em>;
  return (
    <section data-section aria-label="Who I build for" className="px-4 pb-6 pt-16">
      <p {...reveal(0)} className="mx-auto max-w-2xl text-center text-lg leading-9 text-ink-soft">
        Developer at {em(employer)}, and solo builder for{" "}
        {solo.map((c, i) => (
          <Fragment key={c}>
            {em(c)}
            {i < solo.length - 2 ? ", " : i === solo.length - 2 ? " and " : "."}
          </Fragment>
        ))}
      </p>
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
      className="relative scroll-mt-24 px-4 md:h-[230vh] md:scroll-mt-0"
    >
      <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-8 pb-4 pt-16 md:sticky md:top-0 md:h-screen md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:py-0">
        <div className="relative z-10">
          <h2
            {...reveal(0)}
            id="featured-title"
            className="font-display text-[clamp(2.3rem,10.5vw,6rem)] font-extrabold leading-[0.95] tracking-[-0.035em]"
          >
            {featured.name}
          </h2>
          <div {...reveal(1)} className="clay mt-6 p-7 lg:p-8">
            <p className="font-serif text-2xl italic text-olive">{featured.kind}</p>
            <p className="mt-1 text-sm text-ink-soft">{featured.role}</p>
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
              <a href={featured.href} target="_blank" rel="noopener noreferrer" className="link mt-7 text-base">
                {featured.hrefLabel} <Arrow />
              </a>
            )}
          </div>
        </div>
        {/* The 3D bleeds past its column (left into the gutter, right to the viewport edge, and
            down past the box) so nothing is sliced mid-page; the scene re-frames itself to compensate. */}
        <div className="relative h-[420px] md:h-[78vh]">
          <FeaturedSpot
            className="absolute -bottom-16 -left-4 -right-4 top-0 md:-bottom-[11vh] md:-left-[10vw] md:right-[calc(-1*max(1rem,50vw-36rem))]"
            screen={featured.screen}
          />
        </div>
        <div aria-hidden className="pin-progress hidden md:block" />
      </div>
    </section>
  );
}

/** Pinned on desktop: the cards ride a sideways rail. Phones get a normal vertical stack. */
function Works() {
  return (
    <section id="works" data-section data-progress="pin" aria-labelledby="works-title" className="relative md:h-[220vh]">
      <div className="relative pb-20 pt-10 md:sticky md:top-0 md:flex md:h-screen md:flex-col md:justify-center md:overflow-hidden md:py-0">
        <div data-rail className="flex flex-col gap-6 px-4 will-change-transform md:flex-row md:items-stretch md:px-[6vw]">
          <div {...reveal(0)} className="flex shrink-0 flex-col justify-center md:w-[26vw] md:pr-4">
            <h2 id="works-title" className="font-display text-[clamp(2.4rem,4.6vw,4.2rem)] font-bold leading-[0.98] tracking-[-0.03em]">
              Selected works
            </h2>
            <p className="mt-4 max-w-sm leading-7 text-ink-soft">
              Client sites and a SaaS product. Every screen here is the real site, scrolling as you scroll.
            </p>
          </div>
          {works.map((w, i) => {
            const feature = w.points.length > 0;
            return (
              <article
                key={w.id}
                {...reveal(1 + i)}
                // No link to tab to: the card itself takes focus so keyboard users still reach it.
                tabIndex={w.href ? undefined : 0}
                aria-labelledby={`work-${w.id}`}
                className={`clay clay-lift flex shrink-0 flex-col overflow-hidden p-3 ${
                  feature
                    ? 'md:w-[min(760px,54vw)] md:flex-row'
                    : 'md:w-[min(540px,40vw)]'
                }`}>
                <DeviceSpot
                  className={`relative h-62.5 shrink-0 rounded-[20px] bg-linear-to-b from-mist/70 to-cream/40 ${
                    feature ? 'md:h-auto md:w-[52%]' : 'md:h-[38vh]'
                  }`}
                  project={w}
                />
                <div className='flex flex-1 flex-col px-3 pb-3 pt-5 md:px-5'>
                  <h3
                    id={`work-${w.id}`}
                    className='font-display text-2xl font-bold tracking-[-0.02em]'>
                    {w.name}
                  </h3>
                  <p className='mt-1 text-sm text-ink-soft'>
                    {w.kind} · {w.role}
                  </p>
                  {w.live && (
                    <p className='mt-2 flex items-center gap-2 text-sm font-medium text-olive'>
                      <span aria-hidden className='size-1.5 shrink-0 rounded-full bg-moss' />
                      {w.live}
                    </p>
                  )}
                  <p className='mt-3 text-[0.95rem] leading-6 text-ink-soft'>
                    {w.summary}
                  </p>
                  {feature && (
                    <ul className='mt-4 space-y-2 text-[0.92rem] leading-6'>
                      {w.points.map((p) => (
                        <li key={p} className='flex gap-3'>
                          <span
                            aria-hidden
                            className='mt-2 size-1.5 shrink-0 rounded-full bg-accent'
                          />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className='mt-4 flex flex-wrap gap-2'>
                    {w.stack.map((s) => (
                      <span key={s} className='chip'>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className='mt-auto flex flex-wrap gap-x-5 pt-5'>
                    {w.href ? (
                      <a
                        href={w.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='link'>
                        {w.hrefLabel} <Arrow />
                      </a>
                    ) : (
                      <span className='text-sm text-ink-soft'>
                        Private SaaS, no public link
                      </span>
                    )}
                    {w.links?.map((l) => (
                      <a
                        key={l.href}
                        href={l.href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='link'>
                        {l.label} <Arrow />
                      </a>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
          {/* trailing room so the last card can travel fully into view */}
          <div aria-hidden className="hidden shrink-0 md:block md:w-[2vw]" />
        </div>
        <div aria-hidden className="pin-progress hidden md:block" />
      </div>
    </section>
  );
}

const stepIcons = [
  // Discover: a magnifier over a checklist line
  <svg key="d" viewBox="0 0 24 24" className="size-7" aria-hidden>
    <circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M15 15l5 5M8 10.5h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>,
  // Build: angle brackets
  <svg key="b" viewBox="0 0 24 24" className="size-7" aria-hidden>
    <path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13.5 4l-3 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // Ship: an arrow leaving a box
  <svg key="s" viewBox="0 0 24 24" className="size-7" aria-hidden>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
];

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
      {/* Phones: one centred column; desktop keeps the left-aligned run along the thread. */}
      <div className="mx-auto max-w-6xl max-md:text-center">
        <h2
          {...reveal(0)}
          id="process-title"
          className="font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold tracking-[-0.03em]"
        >
          How I work
        </h2>
        <p {...reveal(1)} className="mt-3 max-w-xl text-lg leading-8 text-ink-soft max-md:mx-auto">
          I teach kids robotics at RoboStars, so I&apos;m used to breaking a problem into steps anyone can follow.
          Client work runs the same way.
        </p>
        <ol className="relative mt-14 grid gap-12 md:mt-24 md:grid-cols-3 md:gap-10">
          {/* The thread draws itself with scroll; each step lights as it arrives. */}
          <svg
            aria-hidden
            viewBox="0 0 1000 120"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-[12%] -top-16 hidden h-24 w-[76%] md:block"
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
            <li key={p.step} className={`step relative ${i === 1 ? "md:translate-y-8" : ""}`} style={{ ["--s" as string]: at[i] }}>
              <span className="step-icon inline-flex size-14 items-center justify-center rounded-full">{stepIcons[i]}</span>
              <h3 className="mt-5 font-serif text-3xl italic">{p.title}</h3>
              <p className="mt-2 max-w-xs leading-7 text-ink-soft max-md:mx-auto">{p.body}</p>
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
        <div className="skin-classic absolute inset-0">
          <Image src={aboutPaper} alt="" fill placeholder="blur" sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
        </div>
        {/* neo-Y2K: underwater light, one per theme */}
        <div className="skin-y2k absolute inset-0">
          <div className="sky-light absolute inset-0">
            <Image src={aboutWaterLight} alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          </div>
          <div className="sky-dark absolute inset-0">
            <Image src={aboutWaterDark} alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover" />
          </div>
        </div>
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
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] text-paper shadow-[0_40px_80px_-40px_rgb(var(--shade)/0.8)]"
      >
        <PaperBackdrop />
        {/* Olive scrims behind the copy only: the paper stays visible around them. */}
        <div className="relative grid gap-6 p-5 md:gap-8 md:p-12 lg:grid-cols-2">
          <div className="about-panel self-start">
            <h2 id="about-title" className="font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-bold leading-[1.02] tracking-[-0.03em]">
              Developer by day, robotics teacher on the side.
            </h2>
            <p className="mt-5 max-w-md leading-7 text-paper/90">
              I build React and React Native products at TheBooker and for freelance clients, and I teach kids robotics
              and programming at RoboStars, including kids with special needs. Currently studying for an MSc in Computer
              Science.
            </p>
            <h3 className="mt-8 font-display text-base font-semibold tracking-wide text-paper">Currently</h3>
            <dl className="mt-3 divide-y divide-paper/20 border-y border-paper/20">
              {currently.map((c, i) => (
                <div key={c.label} {...reveal(1 + i)} className="grid grid-cols-[5.5rem_1fr] gap-x-4 py-3">
                  <dt className="text-sm text-paper/85">{c.label}</dt>
                  <dd className="font-medium">{c.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="about-panel space-y-8">
            <div>
              <h3 className="font-display text-base font-semibold tracking-wide text-paper">Experience</h3>
              <ul className="mt-3 divide-y divide-paper/20 border-y border-paper/20">
                {experience.map((e, i) => (
                  <li key={e.role} {...reveal(1 + i)} className="grid grid-cols-[1fr_auto] gap-x-4 py-3.5">
                    <span className="font-medium">{e.role}</span>
                    <span className="text-sm text-paper/85">{e.period}</span>
                    <span className="text-sm text-paper/85">{e.place}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold tracking-wide text-paper">Studies</h3>
              <ul className="mt-3 divide-y divide-paper/20 border-y border-paper/20">
                {education.map((e, i) => (
                  <li key={e.title} {...reveal(4 + i)} className="grid grid-cols-[1fr_auto] gap-x-4 py-3.5">
                    <span className="font-medium">{e.title}</span>
                    <span className="text-sm text-paper/85">{e.period}</span>
                    <span className="text-sm text-paper/85">{e.place}</span>
                  </li>
                ))}
              </ul>
              <p {...reveal(6)} className="mt-4 text-sm leading-6 text-paper/85">
                <span className="font-medium text-paper">{steam}.</span> Cisco: {certificates.join(", ")}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Each group says where it was used, so the list reads as evidence rather than a tag cloud. */
function Toolkit() {
  return (
    <section id="toolkit" data-section aria-labelledby="toolkit-title" className="scroll-mt-24 px-4 py-14">
      <div className="mx-auto max-w-6xl">
        <h2
          {...reveal(0)}
          id="toolkit-title"
          className="font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold tracking-[-0.03em]"
        >
          Toolkit
        </h2>
        <dl className="mt-10 border-t border-sand/60">
          {toolkit.map((t, i) => (
            <div key={t.group} {...reveal(1 + i)} className="grid gap-1.5 border-b border-sand/60 py-4 md:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] md:items-baseline md:gap-8">
              <dt className="font-serif text-2xl italic text-olive">{t.group}</dt>
              <dd className="leading-7 text-ink-soft">{t.items.join(", ")}</dd>
              <dd className="font-medium leading-7 text-ink">Used in {t.usedIn}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Closing() {
  return (
    <section id="closing" data-section aria-labelledby="closing-title" className="px-4 pb-10 pt-10">
      <div className="mx-auto max-w-4xl text-center">
        <ClosingSpot className="relative left-1/2 h-[340px] w-screen -translate-x-1/2" />
        <h2
          {...reveal(0)}
          id="closing-title"
          className="mt-6 font-display text-[clamp(2.6rem,7vw,5.6rem)] font-extrabold leading-[0.95] tracking-[-0.035em] text-olive"
        >
          Let&apos;s build <span className="font-serif font-normal italic tracking-[-0.01em]">something.</span>
        </h2>
        <p {...reveal(1)} className="mx-auto mt-5 max-w-md text-lg leading-7 text-ink-soft text-balance">
          Thanks for scrolling. I&apos;m open to React and React Native roles, and email is the quickest way to reach me.
        </p>
        <div {...reveal(2)} className="mt-7 flex flex-wrap justify-center gap-3">
          <a href={`mailto:${person.email}`} className="pill pill-solid">
            {person.email}
          </a>
          <a href={person.cv} download className="pill pill-soft">
            Download CV (PDF)
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
              <path d="M8 3v8M4.5 7.5 8 11l3.5-3.5M3 13h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
        <p {...reveal(3)} className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
          <CopyEmail email={person.email} />
          <a href={person.github} target="_blank" rel="noopener noreferrer" className="link">
            GitHub <Arrow />
          </a>
          <a href={person.linkedin} target="_blank" rel="noopener noreferrer" className="link">
            LinkedIn <Arrow />
          </a>
        </p>
      </div>
      <footer className="mx-auto mt-20 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-sand/50 pt-6 text-xs text-ink-soft">
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
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <StageMount />
      <SmoothScroll />
      <ScrollDriver />
      <Reveal />
      <Nav />
      <main id='main'>
        <Hero />
        <Clients />
        <Featured />
        <Works />
        <Process />
        <About />
        <Toolkit />
        <RobotBuilder />
        <Closing />
      </main>
      <EasterEggs />
    </>
  );
}
