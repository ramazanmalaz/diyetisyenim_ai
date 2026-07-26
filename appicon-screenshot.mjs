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

const PORT = 3098;
const server = createServer(async (req, res) => {
  const filePath = join(__dirname, req.url.split("?")[0]);
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    res.writeHead(200, { "Content-Type": ext === ".html" ? "text/html" : "image/png" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(PORT, r));

const executablePath = "C:/Users/Win10/.cache/puppeteer/chrome/win64-137.0.7151.55/chrome-win64/chrome.exe";
const browser = await puppeteer.launch({
  executablePath: existsSync(executablePath) ? executablePath : undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
await page.goto(`http://localhost:${PORT}/appicon.html`, { waitUntil: "networkidle0" });
await new Promise(r => setTimeout(r, 500));

const outPath = join(OUT_DIR, "AppIcon-1024x1024.png");
await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
console.log(`✓ AppIcon-1024x1024.png`);

await browser.close();
server.close();
