// Responsive smoke audit for the DDP application. It logs in with a seeded or
// explicitly supplied QA account, captures each route at multiple viewports,
// and fails when the document itself overflows horizontally or a route returns
// a server error. Wide tables may still scroll inside their own containers.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output", "verify");
const PAGES = (process.argv[2] || "/penduduk").split(",").map((value) => value.trim()).filter(Boolean);
const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.VERIFY_EMAIL || "admin@ddp.local";
const PASSWORD = process.env.VERIFY_PASSWORD || "Admin12345!";
const VIEWPORTS = (process.env.VERIFY_VIEWPORTS || "mobile:390x844,tablet:768x1024,desktop:1440x900")
  .split(",")
  .map((entry) => {
    const match = entry.trim().match(/^([a-z0-9-]+):(\d+)x(\d+)$/i);
    if (!match) throw new Error(`Viewport tidak valid: ${entry}`);
    return { name: match[1], width: Number(match[2]), height: Number(match[3]) };
  });

fs.mkdirSync(OUT, { recursive: true });

const report = { baseUrl: BASE_URL, pages: [], errors: [] };

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
}

async function inspectRoute(page, route, viewport) {
  const response = await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(500);
  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = root.clientWidth;
    const documentWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const visible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
    };
    const compactTargets = [...document.querySelectorAll("button,a,input,select,textarea")]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: (element.getAttribute("aria-label") || element.textContent || element.getAttribute("placeholder") || element.tagName).trim().slice(0, 60), width: Math.round(rect.width), height: Math.round(rect.height) };
      })
      .filter((target) => target.width < 32 || target.height < 36)
      .slice(0, 20);
    return { viewportWidth, documentWidth, horizontalOverflow: Math.max(0, documentWidth - viewportWidth), compactTargets };
  });

  const safeRoute = route.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "root";
  const screenshot = `${viewport.name}-${safeRoute}.png`;
  await page.screenshot({ path: path.join(OUT, screenshot), fullPage: true });
  const result = { route, viewport, status: response?.status() ?? null, screenshot, ...metrics };
  report.pages.push(result);
  console.log(`${viewport.name.padEnd(7)} ${route.padEnd(36)} HTTP ${result.status} overflow ${metrics.horizontalOverflow}px`);
  if ((result.status ?? 0) >= 500) report.errors.push(`${viewport.name} ${route}: HTTP ${result.status}`);
  if (metrics.horizontalOverflow > 1) report.errors.push(`${viewport.name} ${route}: document overflow ${metrics.horizontalOverflow}px`);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(`${viewport.name} page error: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 500) report.errors.push(`${viewport.name} HTTP ${response.status()}: ${response.url()}`);
    });
    await login(page);
    for (const route of PAGES) {
      try {
        await inspectRoute(page, route, viewport);
      } catch (error) {
        report.errors.push(`${viewport.name} ${route}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await context.close();
  }
} finally {
  fs.writeFileSync(path.join(OUT, "responsive-report.json"), JSON.stringify(report, null, 2));
  await browser.close();
}

if (report.errors.length) {
  console.error("\nResponsive smoke audit menemukan masalah:");
  report.errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("\nResponsive smoke audit selesai tanpa overflow dokumen atau HTTP 5xx.");
}
