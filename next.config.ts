import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";

import type { NextConfig } from "next";

/**
 * iyzipay SDK'sı dinamik require kullandığı için (lib/resources'ı
 * fs.readdirSync ile yükler, IyzipayResource → postman-request → ~70 alt
 * bağımlılık) Next file-tracing onun bağımlılık ağacını izleyemiyor ve Vercel'de
 * "Cannot find module 'postman-request'" / "ENOENT scandir .../resources" hatası
 * veriyordu. Çözüm: iyzipay'in TÜM bağımlılık kapanışını build anında hesaplayıp
 * ödeme rotalarının trace çıktısına elle dahil etmek. (Elle liste yerine dinamik
 * — npm ağacı değişse de kendini günceller.)
 */
function iyzipayClosureGlobs(): string[] {
  const req = createRequire(join(process.cwd(), "package.json"));
  const seen = new Set<string>();
  const pkgDir = (name: string, from: string): string | null => {
    try {
      return dirname(req.resolve(join(name, "package.json"), { paths: [from] }));
    } catch {
      return null;
    }
  };
  const walk = (name: string, from: string) => {
    const dir = pkgDir(name, from);
    if (!dir || seen.has(dir)) return;
    seen.add(dir);
    let deps: Record<string, string> = {};
    try {
      deps =
        JSON.parse(readFileSync(join(dir, "package.json"), "utf8"))
          .dependencies ?? {};
    } catch {
      /* no-op */
    }
    for (const d of Object.keys(deps)) walk(d, dir);
  };
  walk("iyzipay", process.cwd());
  return [...seen].map(
    (d) => "./" + relative(process.cwd(), d).split(sep).join("/") + "/**/*",
  );
}

const iyzipayFiles = iyzipayClosureGlobs();

const nextConfig: NextConfig = {
  // iyzipay dinamik require kullanır; Turbopack/webpack ile paketlenemez.
  serverExternalPackages: ["iyzipay"],
  // iyzipay + tüm bağımlılık ağacını ödeme rotalarına dahil et (yukarı bkz.).
  outputFileTracingIncludes: {
    "/abonelik": iyzipayFiles,
    "/api/webhooks/iyzico": iyzipayFiles,
  },
  experimental: {
    // Tabak fotoğrafı (≤5 MB) Server Action gövdesiyle gönderildiği için
    // varsayılan 1 MB limitini yükseltiyoruz.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
