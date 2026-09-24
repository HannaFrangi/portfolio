import Reveal from "@/components/Reveal";
import StageMount from "@/components/StageMount";
import { ClosingSpot, DeviceSpot, FeaturedSpot, HeroSpot } from "@/components/three/scenes";
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
        <a href={person.github} target="_blank" rel="noopener noreferrer" className="pill pill-solid !py-1.5">
          GitHub <Arrow />
        </a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative h-[100svh] min-h-[640px] overflow-hidden">
      <div className="intro absolute inset-x-0 top-[11vh] px-4 text-center max-md:top-[12vh]">
        <p className="pill pill-soft mx-auto !text-xs uppercase tracking-[0.2em] text-olive">
          <span className="relative size-2 rounded-full bg-accent dot-pulse" aria-hidden />
          React · React Native · {person.location}
        </p>
        <h1 id="hero-title" className="mt-5">
          <span className="block font-display text-[clamp(2.8rem,7.4vw,7rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-moss">
            Hi, I&apos;m {person.first}
          </span>
          {/* This line sits behind the portrait on purpose: type between the 3D planes. */}
          <span className="block font-serif text-[clamp(3.2rem,9vw,8.6rem)] italic leading-[0.95] tracking-[-0.01em]">
            React Developer
          </span>
        </h1>
      </div>

      <HeroSpot className="absolute inset-0" />

      <div className="intro-late absolute bottom-10 left-6 hidden max-w-[16rem] md:block lg:left-12">
        <p className="pill pill-soft !text-[0.8rem] text-olive">Web · Mobile · Admin dashboards</p>
        <p className="mt-4 text-sm leading-6 text-ink-soft">2+ years building production apps for real clients.</p>
      </div>
      <div className="intro-late absolute bottom-10 right-6 max-w-[19rem] text-right max-md:inset-x-4 max-md:max-w-none max-md:text-center lg:right-12">
        <p className="text-[0.95rem] leading-6 text-ink-soft max-md:hidden">
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
  return (
    <section data-section aria-label="Built for" className="px-4 py-14">
      <p {...reveal(0)} className="text-center font-display text-sm font-medium uppercase tracking-[0.25em] text-ink-soft">
        Built for
      </p>
      <ul {...reveal(1)} className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {clients.map((c) => (
          <li key={c} className="flex items-center gap-2 font-serif text-2xl italic text-olive/80">
            <span aria-hidden className="size-2 rotate-45 rounded-[2px] bg-sage" />
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Featured() {
  return (
    <section id="work" data-section aria-labelledby="featured-title" className="scroll-mt-24 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p {...reveal(0)} className="eyebrow text-center">/ Featured project /</p>
        <h2
          {...reveal(1)}
          id="featured-title"
          className="mt-2 text-center font-display text-[clamp(2.2rem,5vw,4rem)] font-bold tracking-[-0.03em]"
        >
          {featured.name}
        </h2>
        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div {...reveal(2)} className="clay p-7 lg:p-9">
            <p className="font-serif text-2xl italic text-olive">{featured.kind}</p>
            <p className="mt-3 leading-7 text-ink-soft">{featured.summary}</p>
            <ul className="mt-5 space-y-2.5 text-[0.95rem] leading-6">
              {featured.points.map((p) => (
                <li key={p} className="flex gap-3">
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
          <FeaturedSpot className="relative h-[420px] md:h-[520px]" screen={featured.screen} />
        </div>
      </div>
    </section>
  );
}

function Works() {
  return (
    <section data-section aria-labelledby="works-title" className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p {...reveal(0)} className="eyebrow text-center">/ Client projects /</p>
        <h2
          {...reveal(1)}
          id="works-title"
          className="mt-2 text-center font-display text-[clamp(2.2rem,5vw,4rem)] font-bold tracking-[-0.03em]"
        >
          Selected works
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {works.map((w, i) => (
            <article key={w.id} {...reveal(2 + i)} className="clay clay-lift flex flex-col overflow-hidden p-3">
              <DeviceSpot className="relative h-[250px] rounded-[20px] bg-gradient-to-b from-mist/70 to-cream/40" project={w} />
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
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section id="process" data-section aria-labelledby="process-title" className="scroll-mt-24 px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <p {...reveal(0)} className="eyebrow text-center">/ Requirements to deployment /</p>
        <h2
          {...reveal(1)}
          id="process-title"
          className="mt-2 text-center font-display text-[clamp(2.2rem,5vw,4rem)] font-bold tracking-[-0.03em]"
        >
          How I work
        </h2>
        <ol className="relative mt-14 grid gap-6 md:grid-cols-3">
          {/* the thread that ties the three steps together */}
          <svg
            aria-hidden
            viewBox="0 0 1000 120"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-[12%] -top-10 hidden h-24 w-[76%] text-sage md:block"
          >
            <path d="M0 100 C 200 -10, 300 -10, 500 60 S 800 130, 1000 20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 8" />
          </svg>
          {process.map((p, i) => (
            <li
              key={p.step}
              {...reveal(2 + i)}
              className={`clay clay-lift relative p-7 ${i === 1 ? "md:-translate-y-6" : ""}`}
            >
              <span className="font-display text-5xl font-extrabold text-sage/70">{p.step}</span>
              <h3 className="mt-4 font-serif text-3xl italic">{p.title}</h3>
              <p className="mt-2 leading-7 text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Waves() {
  return (
    <svg aria-hidden viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
      <rect width="1200" height="600" fill="#595F3E" />
      <path d="M0 120 C 200 40, 380 200, 600 120 S 1000 20, 1200 110 V600 H0Z" fill="#66704A" />
      <path d="M0 250 C 240 170, 420 330, 640 240 S 1020 160, 1200 250 V600 H0Z" fill="#738B54" />
      <path d="M0 400 C 260 330, 460 470, 700 390 S 1040 320, 1200 400 V600 H0Z" fill="#809A5E" />
      <path d="M0 520 C 300 470, 520 580, 760 510 S 1080 460, 1200 520 V600 H0Z" fill="#959D69" />
    </svg>
  );
}

function About() {
  return (
    <section id="about" data-section aria-labelledby="about-title" className="scroll-mt-24 px-4 py-20">
      <div
        {...reveal(0)}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] text-paper shadow-[0_40px_80px_-40px_rgb(89_95_62/0.8)]"
      >
        <Waves />
        <div className="relative grid gap-10 p-8 md:p-14 lg:grid-cols-2">
          <div>
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
          <div className="space-y-8">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-paper/70">Experience</h3>
              <ul className="mt-3 divide-y divide-paper/20 border-y border-paper/20">
                {experience.map((e) => (
                  <li key={e.role} className="grid grid-cols-[1fr_auto] gap-x-4 py-3.5">
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
                {education.map((e) => (
                  <li key={e.title} className="grid grid-cols-[1fr_auto] gap-x-4 py-3.5">
                    <span className="font-medium">{e.title}</span>
                    <span className="text-sm text-paper/75">{e.period}</span>
                    <span className="text-sm text-paper/75">{e.place}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-6 text-paper/80">Cisco: {certificates.join(", ")}.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Toolkit() {
  return (
    <section id="toolkit" data-section aria-labelledby="toolkit-title" className="scroll-mt-24 px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <p {...reveal(0)} className="eyebrow text-center">/ What I work with /</p>
        <h2
          {...reveal(1)}
          id="toolkit-title"
          className="mt-2 text-center font-display text-[clamp(2.2rem,5vw,4rem)] font-bold tracking-[-0.03em]"
        >
          Toolkit
        </h2>
        <div {...reveal(2)} className="clay mt-10 divide-y divide-sand/40 px-6 md:px-10">
          {toolkit.map((t) => (
            <div key={t.group} className="grid gap-3 py-5 md:grid-cols-[10rem_1fr] md:items-center">
              <h3 className="font-serif text-2xl italic text-olive">{t.group}</h3>
              <div className="flex flex-wrap gap-2">
                {t.items.map((item) => (
                  <span key={item} className="chip !text-[0.85rem]">
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
        <ClosingSpot className="relative mx-auto h-[300px] max-w-xl" />
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
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <StageMount />
      <Reveal />
      <Nav />
      <main>
        <Hero />
        <Clients />
        <Featured />
        <Works />
        <Process />
        <About />
        <Toolkit />
        <Closing />
      </main>
    </>
  );
}
