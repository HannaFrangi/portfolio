# Hanna Al Frangi — portfolio

Personal site of Hanna Al Frangi, a React & React Native developer in Lebanon who also teaches kids robotics at RoboStars.

Live: https://portfolio-seven-puce-lxb2vtku9r.vercel.app (moving to a custom domain soon)

## What's on the page

A light, retro-futurist "space-age studio": sage and cream, soft 3D clay shapes, frosted cards, and one burnt-orange accent.

- **Hero:** a cut-out portrait among 3D planets, with availability and a link to the work.
- **Featured project (RoboStars):** a pinned section where a tablet scrolls the real site as you scroll.
- **Selected works:** a sideways rail of client projects. Each device screen shows a full-page capture of the live site and scrolls from top to bottom while its card is on screen.
- **About, Toolkit, and a "Currently" card.**
- **Build a RoboStars bot:** drag the logo pieces back together (or press "Build it for me").
- **Night shift:** a dark theme that re-lights the same studio instead of inverting it. It follows the system setting until you pick one.
- A few easter eggs. Open DevTools for a hint.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, statically rendered) and React 19
- [React Three Fiber](https://r3f.docs.pmnd.rs) + [drei](https://drei.docs.pmnd.rs) + three.js for the 3D
- Tailwind CSS 4
- [Lenis](https://lenis.darkroom.engineering) for smooth scrolling
- Vercel for hosting and analytics

## How it's built

- **One WebGL canvas for the whole page.** `components/three/Stage.tsx` mounts a single fixed, transparent canvas; every 3D spot on the page is a drei `View` that paints into it, so the site only ever uses one GL context.
- **Scroll drives everything.** `components/ScrollDriver.tsx` writes each section's progress into a CSS variable and slides the Works rail sideways while its section is pinned.
- **Adaptive quality.** The canvas lowers its resolution when frames drop and switches to smaller screen textures on slow devices (`lib/quality.ts`).
- **Accessible by default.** Reduced motion turns off smooth scrolling, pinning and 3D movement and shows every section in its finished state. There's a skip link, a theme-aware focus ring, screen-reader text for the animated name, and a keyboard route through the build-a-bot game.
- **Works without WebGL.** The hero falls back to a static portrait.

## Project layout

```
app/
  page.tsx          the whole page, section by section, plus the JSON-LD
  layout.tsx        fonts, metadata, theme boot script
  globals.css       design tokens (light + Night shift) and component styles
  llms.txt/         plain-text summary for AI assistants
  robots.ts, sitemap.ts
components/
  three/            Stage (shared canvas), scenes, and 3D pieces (devices, robot, blobs)
  RobotBuilder.tsx  build-a-bot game
  EasterEggs.tsx    console greeting and the after-midnight extras
  ...
lib/
  content.ts        all the copy: projects, experience, toolkit, "Currently"
  site.ts           the public URL used in metadata
public/textures/    site captures shown on the device screens (+ -sm versions for slow devices)
```

Most text changes only need `lib/content.ts`. The page, `llms.txt` and the structured data all read from it.

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

In development, **Shift+M** toggles the midnight easter egg so it can be checked at any hour. It is stripped from production builds.

### Tests

End-to-end tests (Playwright, in `e2e/`) run against the production build on a desktop and a phone viewport:

```bash
npm run build
npx playwright install chromium   # once
npm run test:e2e                  # or PW_CHANNEL=chrome npm run test:e2e to use your installed Chrome
```

They check that the page loads without errors and starts the 3D, never scrolls sideways, and that Night shift, build-a-bot, Copy email, the midnight badge, reduced motion, the SEO endpoints, the JSON-LD and the security headers all work.

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, build and these tests on every pull request and on every push to `dev` and `main`.

### Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The public origin for canonical URLs, the sitemap, `llms.txt` and JSON-LD. Set it once a custom domain is live; until then Vercel's production URL is used. |

## SEO and AI search

The page is server-rendered and open to all crawlers. It ships a sitemap, `robots.txt`, `llms.txt`, Open Graph images, and a linked `Person` / `ProfilePage` / `CreativeWork` JSON-LD graph built from `lib/content.ts`.

## Workflow

- `dev` is for development; every push gets a Vercel preview.
- `main` is production. Changes reach it through a pull request from `dev`.
- Dependabot opens grouped dependency updates weekly (`.github/dependabot.yml`). Vercel skips preview builds for those branches (`vercel.json`).
- Security headers, including a baseline Content-Security-Policy, are set in `next.config.ts`.

## Notes

- The downloadable CV is `public/HannaAlFrangi-CV.pdf`. Source résumé files in `app/*.pdf` are gitignored on purpose.
- Fonts are self-hosted (Instrument Serif and Syne in `app/fonts`); Geist comes from `next/font`.
