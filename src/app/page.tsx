import Link from "next/link";

import { Button } from "@/components/ui/button";

const NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const CHIPS = [
  { icon: "🥗", label: "Kişiye özel plan" },
  { icon: "💬", label: "7/24 asistan" },
  { icon: "📊", label: "İlerleme takibi" },
  { icon: "📷", label: "Tabak analizi" },
];

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
      {/* Katmanlı radial gradyanlar */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          background:
            "radial-gradient(60% 50% at 50% -5%, rgba(20,168,102,0.20), transparent 70%), radial-gradient(40% 45% at 88% 25%, rgba(54,201,128,0.16), transparent 70%), radial-gradient(45% 45% at 8% 85%, rgba(14,139,88,0.14), transparent 70%)",
        }}
      />
      {/* İnce doku */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-screen"
        style={{ backgroundImage: NOISE }}
      />

      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
        🥗 Yapay zekâ diyetisyenin cebinde
      </span>

      <h1 className="max-w-3xl text-4xl font-semibold text-balance sm:text-6xl">
        Hedefine giden yol, sana özel bir{" "}
        <span className="text-emerald-600">planla</span> başlar.
      </h1>

      <p className="mt-6 max-w-xl text-lg text-gray-600 dark:text-gray-300">
        Birkaç soruyu yanıtla; yapay zekâ diyetisyenin sana özel programını ve
        günlük kalori hedefini saniyeler içinde hazırlasın. Öğünlerini düzenle,
        sorularını sor, tabağının fotoğrafını paylaş.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="h-12 px-7 text-base">
          <Link href="/kayit">Hemen başla →</Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-7 text-base">
          <Link href="/giris">Giriş yap</Link>
        </Button>
      </div>

      <ul className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
        {CHIPS.map((c) => (
          <li
            key={c.label}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3.5 py-1.5 text-sm text-gray-700 shadow-[var(--shadow-soft)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-300"
          >
            <span aria-hidden>{c.icon}</span>
            {c.label}
          </li>
        ))}
      </ul>
    </main>
  );
}
