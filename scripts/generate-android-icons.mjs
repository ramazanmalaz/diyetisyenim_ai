// brand/app-icon.svg'den Android ikonlarını üretir: node scripts/generate-android-icons.mjs
//
// - Adaptif ikon (Android 8+): arka plan = adaçayı degrade, ön plan = kase +
//   yaprak. Ön plan 108dp tuvalin ortadaki 72dp'lik görünür alanına oturur;
//   içerik 66dp güvenli dairenin içinde kalır (her başlatıcı maskesinde kesilmez).
// - Eski başlatıcılar için kare ve yuvarlak ikon.
// - Bildirim çubuğu ikonu: Android renkleri yok sayıp yalnızca alfa kanalını
//   çizer; renkli ikon gri kare görünür. Bu yüzden beyaz silüet.
// - Açılış ekranı (Android 11 ve öncesi): beyaz zemin + ortada ikon.
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const RES = "android/app/src/main/res";
const svg = (await readFile("brand/app-icon.svg", "utf8")).replace(
  /\r\n/g,
  "\n",
);

const defs = svg.slice(
  svg.indexOf("<defs>"),
  svg.indexOf("</defs>") + "</defs>".length,
);
const body = svg.slice(
  svg.indexOf("</defs>") + "</defs>".length,
  svg.lastIndexOf("</svg>"),
);
const lines = body.split("\n").filter((l) => l.trim());
// Arka plan: ilk iki <rect> (degrade + parlama). Ön plan: geri kalanı.
const bgLines = lines.filter((l) =>
  l.startsWith('<rect width="1024" height="1024"'),
);
const fgLines = lines.filter((l) => !bgLines.includes(l));

const wrap = (inner, viewBox = "0 0 1024 1024") =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defs}${inner}</svg>`,
  );

// 1024'lük tasarım 72dp görünür alana denk gelsin: 108/72 = 1.5 kat tuval.
const PAD = (1024 * 1.5 - 1024) / 2;
const adaptiveViewBox = `${-PAD} ${-PAD} ${1024 + 2 * PAD} ${1024 + 2 * PAD}`;
const background = wrap(bgLines.join(""), adaptiveViewBox)
  .toString()
  // Degrade dikdörtgenleri tüm 1.5x tuvali kaplasın.
  .replaceAll(
    '<rect width="1024" height="1024"',
    `<rect x="${-PAD}" y="${-PAD}" width="${1024 + 2 * PAD}" height="${1024 + 2 * PAD}"`,
  );
const foreground = wrap(fgLines.join(""), adaptiveViewBox);

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

const render = (input, size) =>
  sharp(Buffer.from(input), { density: 300 }).resize(size, size);

for (const [d, k] of Object.entries(densities)) {
  const dir = `${RES}/mipmap-${d}`;
  await mkdir(dir, { recursive: true });
  const adaptive = Math.round(108 * k);
  const legacy = Math.round(48 * k);

  await render(foreground, adaptive)
    .png()
    .toFile(`${dir}/ic_launcher_foreground.png`);
  await render(background, adaptive)
    .png()
    .toFile(`${dir}/ic_launcher_background.png`);

  // Eski başlatıcılar: köşeleri yuvarlatılmış kare + daire.
  const full = await render(svg, legacy).png().toBuffer();
  const r = Math.round(legacy * 0.18);
  const roundedMask = Buffer.from(
    `<svg width="${legacy}" height="${legacy}"><rect width="${legacy}" height="${legacy}" rx="${r}"/></svg>`,
  );
  const circleMask = Buffer.from(
    `<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`,
  );
  await sharp(full)
    .composite([{ input: roundedMask, blend: "dest-in" }])
    .png()
    .toFile(`${dir}/ic_launcher.png`);
  await sharp(full)
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toFile(`${dir}/ic_launcher_round.png`);

  // Bildirim ikonu (24dp, beyaz silüet: kase + yaprak).
  const drawableDir = `${RES}/drawable-${d}`;
  await mkdir(drawableDir, { recursive: true });
  const silhouette = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="170 220 684 640">` +
      `<path d="M512 540 C512 410 590 310 724 268 C746 412 668 518 512 540 Z" fill="#fff"/>` +
      `<path d="M512 540 C512 446 466 380 398 356" stroke="#fff" stroke-width="34" stroke-linecap="round" fill="none"/>` +
      `<path d="M222 560 H802 C802 714 676 812 540 812 H484 C348 812 222 714 222 560 Z" fill="#fff"/>` +
      `</svg>`,
  );
  await render(silhouette, Math.round(24 * k))
    .png()
    .toFile(`${drawableDir}/ic_stat_notify.png`);
}

// Adaptif ikon tanımları: arka plan artık renk değil degrade görseli.
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
await writeFile(`${RES}/mipmap-anydpi-v26/ic_launcher.xml`, adaptiveXml);
await writeFile(`${RES}/mipmap-anydpi-v26/ic_launcher_round.xml`, adaptiveXml);

// Açılış ekranları: mevcut dosyaların boyutlarında, beyaz zemin + ortada ikon.
const splashes = [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
];
for (const [dir, w, h] of splashes) {
  const size = Math.round(Math.min(w, h) * 0.32);
  const r = Math.round(size * 0.22);
  const icon = await sharp(await render(svg, size).png().toBuffer())
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();
  await sharp({
    create: { width: w, height: h, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toFile(`${RES}/${dir}/splash.png`);
}

console.log("Android ikonları üretildi.");
