// Crawls the reference dashboard, logs in, and records a feature inventory:
// screenshots + DOM summaries (tables/forms/charts/filters/nav) per page,
// written to tools/inspect/output/. Credentials come from
// tools/inspect/.env.inspect.local (gitignored), never hardcoded here.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "output");
fs.mkdirSync(OUT_DIR, { recursive: true });

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnvFile(path.join(__dirname, ".env.inspect.local"));
const URL = env.INSPECT_URL || process.env.INSPECT_URL;
const EMAIL = env.INSPECT_EMAIL || process.env.INSPECT_EMAIL;
const PASSWORD = env.INSPECT_PASSWORD || process.env.INSPECT_PASSWORD;

if (!URL || !EMAIL || !PASSWORD) {
  console.error(
    "Missing INSPECT_URL/INSPECT_EMAIL/INSPECT_PASSWORD. Copy .env.inspect.example to .env.inspect.local and fill it in."
  );
  process.exit(1);
}

const report = { loginOk: false, loginError: null, pages: [] };

async function summarizePage(page, name) {
  const url = page.url();
  const shotPath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});

  const summary = await page.evaluate(() => {
    const text = (el) => (el.innerText || "").trim().slice(0, 120);
    const tables = [...document.querySelectorAll("table")].map((t) => ({
      headers: [...t.querySelectorAll("th")].map((th) => text(th)),
      rowCount: t.querySelectorAll("tbody tr").length,
    }));
    const forms = [...document.querySelectorAll("form")].map((f) => ({
      action: f.action,
      fields: [...f.querySelectorAll("input,select,textarea")].map((el) => ({
        tag: el.tagName.toLowerCase(),
        type: el.type || null,
        name: el.name || el.id || null,
        placeholder: el.placeholder || null,
      })),
    }));
    const buttons = [...document.querySelectorAll("button, a[role=button], [type=submit]")]
      .map((b) => text(b))
      .filter(Boolean)
      .slice(0, 40);
    const navLinks = [...document.querySelectorAll("nav a, aside a, header a")]
      .map((a) => ({ text: text(a), href: a.getAttribute("href") }))
      .filter((l) => l.text || l.href);
    const headings = [...document.querySelectorAll("h1,h2,h3")].map((h) => text(h)).filter(Boolean);
    const hasChartSvg = document.querySelectorAll("svg.recharts-surface, canvas").length;
    const hasMap = !!document.querySelector(".leaflet-container, [class*=map]");
    const filters = [...document.querySelectorAll("select, input[type=search], input[type=date]")]
      .map((el) => el.name || el.id || el.placeholder || el.tagName.toLowerCase());
    const pagination = !!document.querySelector("[class*=pagin], [aria-label*=agin]");
    return { tables, forms, buttons, navLinks, headings, hasChartSvg, hasMap, filters, pagination };
  });

  report.pages.push({ name, url, screenshot: `output/${name}.png`, ...summary });
  console.log(`captured: ${name} -> ${url}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await summarizePage(page, "00-landing");

    // Try to find and fill a login form.
    const emailInput = page
      .locator('input[type=email], input[name*=email i], input[name*=user i]')
      .first();
    const passInput = page.locator('input[type=password]').first();

    await emailInput.waitFor({ timeout: 10000 });
    await emailInput.fill(EMAIL);
    await passInput.fill(PASSWORD);

    const submit = page
      .locator('button[type=submit], button:has-text("Login"), button:has-text("Masuk"), button:has-text("Sign in")')
      .first();
    await Promise.all([
      page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {}),
      submit.click(),
    ]);
    await page.waitForTimeout(2000);

    const stillOnLogin = await passInput.isVisible().catch(() => false);
    if (stillOnLogin) {
      const errorText = await page.locator("body").innerText();
      throw new Error("Login appears to have failed (password field still visible). Page text: " + errorText.slice(0, 300));
    }
    report.loginOk = true;
    await summarizePage(page, "01-after-login");

    // Discover internal nav links from the post-login page and crawl each once.
    const origin = new URL(page.url()).origin;
    const hrefs = new Set();
    const navHrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
    for (const h of navHrefs) {
      if (!h || h.startsWith("#") || h.startsWith("mailto:") || h.startsWith("tel:")) continue;
      try {
        const u = new URL(h, origin);
        if (u.origin === origin) hrefs.add(u.pathname + u.search);
      } catch {}
    }
    hrefs.delete(new URL(page.url()).pathname);

    let i = 2;
    for (const href of hrefs) {
      const name = `${String(i).padStart(2, "0")}-${href.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "root"}`;
      try {
        await page.goto(origin + href, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(800);
        await summarizePage(page, name);
      } catch (e) {
        report.pages.push({ name, url: origin + href, error: String(e) });
      }
      i++;
    }
  } catch (e) {
    report.loginError = String(e);
    console.error("Inspection error:", e);
  } finally {
    fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
