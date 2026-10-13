// brand/app-icon.svg'den tüm uygulama ikonlarını üretir: node scripts/generate-icons.mjs
// iOS ve PWA ikonları köşesiz ve opak olmalı — maskeyi platform uygular.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const src = await readFile("brand/app-icon.svg");
const targets = [
  ["ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", 1024],
  ["public/icon-512.png", 512],
  ["public/icon-maskable-512.png", 512],
  ["public/icon-192.png", 192],
  ["public/apple-touch-icon.png", 180],
];
for (const [out, size] of targets) {
  await sharp(src, { density: 300 })
    .resize(size, size)
    .flatten({ background: "#46623a" })
    .removeAlpha()
    .png()
    .toFile(out);
}

// Tarayıcı sekmesi için yuvarlatılmış köşeli SVG favicon
const svg = src.toString();
const favicon = svg
  .replace("<defs>", '<defs><clipPath id="r"><rect width="1024" height="1024" rx="229"/></clipPath>')
  .replace("</defs>", '</defs><g clip-path="url(#r)">')
  .replace("</svg>", "</g></svg>");
await writeFile("src/app/icon.svg", favicon);
console.log("İkonlar üretildi.");
