import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tabak fotoğrafı (≤5 MB) Server Action gövdesiyle gönderildiği için
    // varsayılan 1 MB limitini yükseltiyoruz.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
