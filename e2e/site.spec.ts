import { expect, test, type Page } from "@playwright/test";

/** Scroll the whole page in steps so every section mounts, reveals and plays its 3D. */
async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
}

test.describe("page", () => {
  test("loads without errors and starts the 3D", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      // Vercel Analytics only exists on Vercel; under `next start` its script 404s.
      // Chrome leaves the URL out of the 404 message, so check where it came from too.
      const analytics = `${m.text()} ${m.location().url}`.includes("_vercel/insights");
      if (m.type() === "error" && !analytics) errors.push(m.text());
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Hi, I'm Hanna");
    // The shared WebGL canvas marks the page once the 3D portrait has taken over.
    await expect(page.locator("html")).toHaveAttribute("data-portrait", "3d", { timeout: 30_000 });
    await scrollThrough(page);
    expect(errors).toEqual([]);
  });

  test("never scrolls sideways", async ({ page }) => {
    await page.goto("/");
    await scrollThrough(page);
    // Give the closing robot time to walk in; its speech bubble once widened the page.
    await page.waitForTimeout(2000);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test("Night shift switches the theme and remembers it", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const toggle = page.getByRole("button", { name: "Night shift (dark mode)" });
    const before = await html.getAttribute("data-theme");
    await toggle.click();
    const after = before === "dark" ? "light" : "dark";
    await expect(html).toHaveAttribute("data-theme", after);
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", after);
  });

  test("build-a-bot assembles itself", async ({ page }) => {
    await page.goto("/");
    await page.locator("#build").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Build it for me" }).click();
    await expect(page.locator("#build [aria-live]")).toContainText("Built!", { timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Build it again" })).toBeVisible();
  });

  test("Copy email puts the address on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.locator("#closing").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Copy email" }).click();
    await expect(page.getByRole("button", { name: "Email copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("hannafrangi.hf@gmail.com");
  });

  test("the CV downloads", async ({ request }) => {
    const res = await request.get("/HannaAlFrangi-CV.pdf");
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("pdf");
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("every Works card is on screen", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Phones stack the cards vertically anyway");
    await page.goto("/");
    const cards = page.locator("#works article");
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
  });
});

test.describe("after midnight", () => {
  test("shows the late-night badge, and it can be dismissed", async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 7, 1, 30));
    await page.goto("/");
    const badge = page.getByRole("complementary", { name: "Late-night note" });
    await expect(badge).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-midnight", "");
    await badge.getByRole("button", { name: "Dismiss" }).click();
    await expect(badge).toBeHidden();
  });

  test("stays hidden in the daytime", async ({ page }) => {
    await page.clock.setFixedTime(new Date(2026, 9, 7, 14, 0));
    await page.goto("/");
    await page.waitForTimeout(1000);
    await expect(page.getByRole("complementary", { name: "Late-night note" })).toHaveCount(0);
  });
});

test.describe("SEO and security", () => {
  test("robots, sitemap and llms.txt are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBe(true);
    expect(await robots.text()).toMatch(/Sitemap:/i);

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("<urlset");

    const llms = await request.get("/llms.txt");
    expect(llms.ok()).toBe(true);
    expect(await llms.text()).toContain("# Hanna Al Frangi");
  });

  test("JSON-LD is valid and describes Hanna", async ({ page }) => {
    await page.goto("/");
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(raw ?? "{}");
    const person = data["@graph"].find((n: { "@type": string }) => n["@type"] === "Person");
    expect(person.name).toBe("Hanna Al Frangi");
  });

  test("security headers are sent", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
  });
});
