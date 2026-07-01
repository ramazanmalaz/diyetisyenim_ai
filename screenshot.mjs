import puppeteer from "puppeteer";
import { existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "temporary screenshots");
if (!existsSync(dir)) mkdirSync(dir);

const url = process.argv[2] || "http://localhost:3001";
const label = process.argv[3] || "";

const existing = readdirSync(dir).filter(f => f.endsWith(".png"));
const n = existing.length + 1;
const filename = label ? `screenshot-${n}-${label}.png` : `screenshot-${n}.png`;
const outPath = join(dir, filename);

const executablePath = "C:/Users/Win10/.cache/puppeteer/chrome/win64-137.0.7151.55/chrome-win64/chrome.exe";

const browser = await puppeteer.launch({
  executablePath: existsSync(executablePath) ? executablePath : undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
await new Promise(r => setTimeout(r, 1000));
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Saved: ${outPath}`);
