import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // iyzipay dinamik require kullanır; Turbopack/webpack ile paketlenemez.
  // Sunucuda Node require ile yüklenmesi için harici tutuyoruz.
  serverExternalPackages: ["iyzipay"],
};

export default nextConfig;
