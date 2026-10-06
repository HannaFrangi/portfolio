import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests against the production build (`next start`), so they check what Vercel ships.
 * Run `npm run build` first; CI does. Locally, `npm run test:e2e` reuses a server already on PORT.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Every page renders WebGL in software here, so too many at once starves the 3D.
  // CI runners have 4 shared cores: one test at a time is slower but doesn't flake.
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // The 3D scenes need a moment to compile shaders on a software GPU (more on CI runners).
  timeout: process.env.CI ? 60_000 : 45_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Locally, PW_CHANNEL=chrome uses the installed Chrome instead of Playwright's download.
    channel: process.env.PW_CHANNEL,
    // No GPU on CI runners: SwiftShader gives the shared canvas a real WebGL context.
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
