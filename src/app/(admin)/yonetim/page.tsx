import Link from "next/link";

import { requireStaff } from "@/lib/auth";

// Yalnızca AI odaklı sürüm: randevu, ödeme, manuel plan, grup ve danışan
// yönetimi şimdilik gizli. Yönetim yalnızca AI davranışını ayarlamak için.
const cards: { title: string; desc: string; href?: string }[] = [
  {
    title: "AI Kuralları",
    desc: "Yapay zekâ diyetisyenin davranışını ayarla.",
    href: "/yonetim/ai-kurallari",
  },
];

export default async function YonetimPage() {
  const profile = await requireStaff();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">
          Yönetim Paneli — {profile.full_name ?? "Diyetisyen"}
        </h1>
        <p className="text-gray-500">
          Yapay zekâ diyetisyenin davranış kurallarını buradan ayarlayabilirsin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const inner = (
            <>
              <h2 className="font-semibold">{card.title}</h2>
              <p className="text-sm text-gray-500">{card.desc}</p>
              <p className="mt-2 text-xs text-emerald-600">
                {card.href ? "Aç →" : "Yakında"}
              </p>
            </>
          );
          const className =
            "block rounded-xl border border-gray-200 p-4 transition dark:border-gray-800" +
            (card.href ? " hover:border-emerald-400" : "");
          return card.href ? (
            <Link key={card.title} href={card.href} className={className}>
              {inner}
            </Link>
          ) : (
            <div key={card.title} className={className}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
