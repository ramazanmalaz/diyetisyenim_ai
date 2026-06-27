import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iyzipay dinamik require kullanır; Turbopack/webpack ile paketlenemez.
  // Sunucuda Node require ile yüklenmesi için harici tutuyoruz.
  serverExternalPackages: ["iyzipay"],
  // iyzipay constructor'ı lib/resources klasörünü fs.readdirSync ile dinamik
  // okur; file-tracing bunu kaçırıp Vercel'de ENOENT verir. İlgili rotalara
  // paketi elle dahil ediyoruz.
  outputFileTracingIncludes: {
    "/abonelik": ["./node_modules/iyzipay/**/*"],
    "/api/webhooks/iyzico": ["./node_modules/iyzipay/**/*"],
  },
  experimental: {
    // Tabak fotoğrafı (≤5 MB) Server Action gövdesiyle gönderildiği için
    // varsayılan 1 MB limitini yükseltiyoruz.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
