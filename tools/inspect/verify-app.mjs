// Local QA helper: logs into the app being built (not the reference site) with
// the seeded admin account and screenshots given routes, for visual smoke-testing
// during development. Usage: node tools/inspect/verify-app.mjs "/penduduk,/peta"
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "output", "verify");
const PAGES = (process.argv[2] || "/penduduk").split(",");
const BASE_URL = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const EMAIL = process.env.VERIFY_EMAIL || "admin@ddp.local";
const PASSWORD = process.env.VERIFY_PASSWORD || "Admin12345!";

fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 500) errors.push(`[http ${res.status()}] ${res.url()}`);
  });

  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click("button[type=submit]");
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15000 }).catch((e) => {
    errors.push(`[login] did not navigate away from /login: ${e.message}`);
  });
  console.log("post-login url:", page.url());

  for (const p of PAGES) {
    await page
      .goto(`${BASE_URL}${p}`, { waitUntil: "networkidle", timeout: 20000 })
      .catch((e) => errors.push(`[goto ${p}] ${e.message}`));
    await page.waitForTimeout(600);
    const name = p.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "root";
    await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
    console.log("captured", p, "->", `output/verify/${name}.png`);
  }

  await browser.close();
  if (errors.length) {
    console.log("\n--- console/page/http errors seen ---");
    for (const e of errors) console.log(e);
    process.exitCode = 1;
  } else {
    console.log("\nNo console/page/HTTP errors observed.");
  }
})();
