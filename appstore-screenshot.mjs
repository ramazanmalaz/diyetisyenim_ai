/**
 * App Store Screenshot Generator
 * Çıktı klasörü: ./app-store-screenshots/
 *
 * Boyutlar:
 *   iPhone 6.7"  → 1290 × 2796 px  (viewport 430×932 @ 3x)
 *   iPhone 6.5"  → 1242 × 2688 px  (viewport 414×896 @ 3x)
 *   iPad 12.9"   → 2048 × 2732 px  (viewport 1024×1366 @ 2x)
 */

import puppeteer from "puppeteer";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "app-store-screenshots");
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// Geçici sunucu — 3099 portunda
const PORT = 3099;
const server = createServer(async (req, res) => {
  const url = req.url === "/" ? "/appstore-screens.html" : req.url;
  const filePath = join(__dirname, url.split("?")[0]);
  const ext = extname(filePath);
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  } catch {
    res.writeHead(404); res.end("Not found");
  }
});

await new Promise(r => server.listen(PORT, r));
console.log(`Server: http://localhost:${PORT}`);

const executablePath = "C:/Users/Win10/.cache/puppeteer/chrome/win64-137.0.7151.55/chrome-win64/chrome.exe";
const browser = await puppeteer.launch({
  executablePath: existsSync(executablePath) ? executablePath : undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--force-device-scale-factor=1"],
});

const SCREENS = [1, 2, 3, 4, 5];

const DEVICES = [
  { name: "iphone-67",  w: 430,  h: 932,  dpr: 3, pw: 1290, ph: 2796 },
  { name: "iphone-65",  w: 414,  h: 896,  dpr: 3, pw: 1242, ph: 2688 },
  { name: "ipad-129",   w: 1024, h: 1366, dpr: 2, pw: 2048, ph: 2732 },
];

const page = await browser.newPage();

for (const device of DEVICES) {
  console.log(`\n── ${device.name} (${device.pw}×${device.ph}) ──`);
  await page.setViewport({ width: device.w, height: device.h, deviceScaleFactor: device.dpr });

  for (const s of SCREENS) {
    const url = `http://localhost:${PORT}/appstore-screens.html?s=${s}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    await new Promise(r => setTimeout(r, 800));

    const filename = `${device.name}-screen${s}.png`;
    const outPath = join(OUT_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  ✓ ${filename}`);
  }
}

await browser.close();
server.close();
console.log(`\nTamamlandı → ${OUT_DIR}`);
