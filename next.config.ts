import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iyzipay dinamik require kullanır; Turbopack/webpack ile paketlenemez.
  // Sunucuda Node require ile yüklenmesi için harici tutuyoruz.
  serverExternalPackages: ["iyzipay"],
  experimental: {
    // Tabak fotoğrafı (≤5 MB) Server Action gövdesiyle gönderildiği için
    // varsayılan 1 MB limitini yükseltiyoruz.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
