import Link from "next/link";

import { requireStaff } from "@/lib/auth";

const cards: { title: string; desc: string; href?: string }[] = [
  { title: "Danışanlar", desc: "Danışan listesi ve detayları." },
  {
    title: "Diyet Planları",
    desc: "Plan oluştur ve ata.",
    href: "/yonetim/planlar",
  },
  {
    title: "Randevular",
    desc: "Görüşme takvimi.",
    href: "/yonetim/randevular",
  },
  {
    title: "Ödemeler",
    desc: "Abonelik ve tahsilatlar.",
    href: "/yonetim/odemeler",
  },
  {
    title: "AI Kuralları",
    desc: "Asistanın davranışını ayarla.",
    href: "/yonetim/ai-kurallari",
  },
  {
    title: "Sohbetler",
    desc: "Grup ve birebir konuşmalar.",
    href: "/yonetim/sohbetler",
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
          Danışanları, diyet planlarını, randevuları ve AI kurallarını buradan
          yöneteceksin.
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
