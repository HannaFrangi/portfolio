# GEO Audit Report: Hanna Al Frangi Portfolio

**Audit Date:** 2026-10-02
**URL:** https://portfolio-seven-puce-lxb2vtku9r.vercel.app
**Business Type:** Personal portfolio (Agency/Services pattern: case studies, client list)
**Pages Analyzed:** 1 (single-page site) + robots.txt, sitemap.xml, llms.txt

---

## Executive Summary

**Overall GEO Score: 52/100 (Poor)**

The site itself is now technically strong: server-rendered, open to every AI crawler, with llms.txt, a sitemap, a canonical URL and a linked Person/ProfilePage/CreativeWork JSON-LD graph. The score is held down by things off the site: a random Vercel domain, almost no web footprint for "Hanna Al Frangi", and a name collision with a banker called Hanna (Johnny) Frangi who is what search engines currently return.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 55/100 | 25% | 13.8 |
| Brand Authority | 15/100 | 20% | 3.0 |
| Content E-E-A-T | 60/100 | 20% | 12.0 |
| Technical GEO | 80/100 | 15% | 12.0 |
| Schema & Structured Data | 80/100 | 10% | 8.0 |
| Platform Optimization | 30/100 | 10% | 3.0 |
| **Overall GEO Score** | | | **52/100** |

On-site categories alone (Technical, Schema, Citability, E-E-A-T) average 69. The off-site gap is the main problem.

---

## Critical Issues

None. No crawler blocks, no noindex, the page is fully server-rendered, structured data is present.

## High Priority Issues

1. **Random domain.** `portfolio-seven-puce-lxb2vtku9r.vercel.app` carries no name signal and looks throwaway to people and models. Buy `hannafrangi.com` (or similar), attach it in Vercel, set `NEXT_PUBLIC_SITE_URL`. The code already handles the switch.
2. **Entity not recognized.** A web search for "Hanna Al Frangi" returns a banker, Hanna (Johnny) Frangi, and nothing about you. AI engines will confuse the two or say they know nothing.
3. **Your own profiles don't link to the site.** GitHub (`hannafrangi`) has no website, no bio. Same check needed on LinkedIn. These are the two `sameAs` links in the JSON-LD, so they should point back to confirm the identity.

## Medium Priority Issues

4. **No question-answer content.** AI answers are built from passages that answer a question directly ("Who builds React Native apps in Lebanon?", "What did Hanna build for TheBooker?"). The page has short marketing lines but no plain Q&A or case-study paragraphs.
5. **Thin content: ~720 words.** Project summaries are one or two sentences. One short case study per project (problem, what you built, outcome, numbers) would roughly double citable text.
6. **Client sites don't credit you.** RoboStars lists you as an instructor (team photo) but no client site has a "built by" link. A footer credit on RoboStars, SMS Cleaning and HomeRoots is a strong backlink + entity signal.
7. **No testimonials.** Nothing third-party vouches for the work on the page.

## Low Priority Issues

8. JSON-LD `image` points at a build-hashed `/_next/static/...` URL that changes every deploy. Use a stable path (e.g. `/textures/portrait.png` or the OG image).
9. Name form varies: "Hanna Al Frangi" (site) vs "Hanna Frangi" (GitHub). Add `alternateName: "Hanna Frangi"` to the Person schema and keep profiles consistent.
10. Only HSTS among security headers. No CSP, `X-Content-Type-Options`, `Referrer-Policy`. Minor for GEO, easy to add in `next.config.ts`.
11. All three `<img>` have empty alt. Correct for these decorative/fallback images; noted only for completeness.

---

## Category Deep Dives

### AI Citability (55/100)
Good: the title, meta description and the pitch ("I build web and mobile apps, and the admin dashboards behind them. I also teach kids to build robots.") are clean, self-contained, quotable sentences. Project summaries name the client, the product type and the stack.
Weak: no passages over ~40 words, no numbers (users, downloads, load times, Lighthouse scores), no Q&A. Example rewrite for TheBooker:
> "Hanna Al Frangi built the React Native app for TheBooker, a booking platform for spas, barbers and stylists in Lebanon, live on the App Store and Google Play since [year], plus its web landing page, admin dashboard and business dashboard."

### Brand Authority (15/100)
- Web search: no results for you; name collision with a banker.
- GitHub: exists, name "Hanna Frangi", location Lebanon, no site link, no bio.
- LinkedIn: exists (linked from site), not verified in this audit.
- No Reddit, YouTube, dev.to, Medium, podcast or press mentions found.
- Client sites: no "built by" credits.

### Content E-E-A-T (60/100)
Strong experience signals: real, live client projects with links, App Store/Play listings, clear solo vs team roles, employment history, MSc/BSc, CCNA certificates, downloadable CV. Missing: outcomes and metrics, testimonials, any writing that shows expertise (blog posts, talks), a "last updated" signal.

### Technical GEO (80/100)
- robots.txt allows all; GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot all get 200.
- llms.txt present, well-formed, generated from content.
- sitemap.xml, canonical, OG + Twitter cards (1200x630) all correct for the live domain.
- Full SSR: all text present in the initial HTML (106 KB, ~1.4s).
- Minus: random domain, only HSTS among security headers.

### Schema & Structured Data (80/100)
`@graph` with Person (url, image, jobTitle, description, worksFor, alumniOf, knowsAbout, sameAs), ProfilePage (mainEntity → Person), and 5 CreativeWork entries with `creator` → Person. Missing: `alternateName`, stable image URL, `hasCredential` for the CCNA certificates, SoftwareApplication type for TheBooker's apps.

### Platform Optimization (30/100)
Present on GitHub and LinkedIn only. Neither links back. No content on platforms AI engines cite heavily (Reddit, YouTube, dev.to/Medium, Stack Overflow).

---

## Quick Wins (This Week)

1. Add the portfolio URL and a one-line bio to GitHub and LinkedIn. (10 minutes; confirms identity for every AI engine.)
2. Buy a name domain, attach it in Vercel, set `NEXT_PUBLIC_SITE_URL`.
3. Ask RoboStars (and other clients) for a "Website by Hanna Al Frangi" footer link.
4. Add `alternateName`, a stable `image` URL and `hasCredential` to the JSON-LD.
5. Add one or two numbers to each project summary.

## 30-Day Action Plan

### Week 1: Identity
- [ ] Custom domain live, env var set
- [ ] GitHub + LinkedIn link to the site, same name form everywhere
- [ ] JSON-LD fixes (alternateName, stable image, credentials)

### Week 2: Content depth
- [ ] Short case study per project: problem, what you built, result, numbers
- [ ] A small "FAQ" block (services, location, availability, stack) with FAQPage schema

### Week 3: Third-party signals
- [ ] Client "built by" credits
- [ ] 2-3 short testimonials on the page
- [ ] Pin portfolio-related repos on GitHub with READMEs linking the site

### Week 4: Off-site presence
- [ ] One technical write-up on dev.to or Medium (e.g. building TheBooker's dashboards) linking back
- [ ] Re-run this audit and compare

---

## Appendix: Pages Analyzed

| URL | Title | GEO Issues |
|---|---|---|
| / | Hanna Al Frangi \| React & React Native Developer | 6 |
| /robots.txt | (allows all, sitemap + host set) | 0 |
| /sitemap.xml | 1 URL | 0 |
| /llms.txt | Hanna Al Frangi | 0 |

Sources: web search for "Hanna Al Frangi" and "Hanna Frangi React developer Lebanon"; https://www.gulftalent.com/people/hanna-johnny-frangi-2761382 (name collision); GitHub API for `hannafrangi`; homepages of robostarslb.com, thebooker.online, smscleaninglb.com.
