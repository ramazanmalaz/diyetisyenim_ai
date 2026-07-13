import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { InstallPrompt } from "@/components/app/install-prompt";
import { PwaRegister } from "@/components/app/pwa-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Başlıklar için app-benzeri geometrik sans (display).
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "UzmanDiyet — Diyet Danışmanlık",
  description:
    "Diyetisyen yönetiminde, yapay zekâ destekli sohbet ve kişiye özel diyet takip platformu.",
  manifest: "/manifest.json",
  applicationName: "UzmanDiyet",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UzmanDiyet",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2f7d31",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
