import Link from "next/link";

import { requireProfile } from "@/lib/auth";

const cards: { title: string; desc: string; href?: string }[] = [
  {
    title: "Sohbet",
    desc: "Diyetisyen grubunda konuş, AI'a soru sor.",
    href: "/sohbet",
  },
  {
    title: "Diyet Planım",
    desc: "Kişiye özel öğün planını gör.",
    href: "/plan",
  },
  {
    title: "İlerleme",
    desc: "Kilo, ölçü ve su takibini yap.",
    href: "/ilerleme",
  },
  {
    title: "Randevu",
    desc: "Diyetisyeninle görüşme planla.",
    href: "/randevu",
  },
  {
    title: "Abonelik",
    desc: "Danışmanlık paketini yönet ve öde.",
    href: "/abonelik",
  },
];

export default async function PanelPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">
          Merhaba {profile.full_name ?? ""} 👋
        </h1>
        <p className="text-gray-500">
          DiyetChat paneline hoş geldin. Sorularını beslenme asistanına
          sorabilirsin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
