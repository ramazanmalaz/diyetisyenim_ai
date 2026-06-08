import { Bot, Stethoscope } from "lucide-react";
import Link from "next/link";

import { requireProfile } from "@/lib/auth";

export default async function PanelPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">
          Merhaba {profile.full_name ?? ""} 👋
        </h1>
        <p className="text-gray-500">
          Nasıl ilerlemek istersin? Dilersen yapay zekâ asistanıyla hemen başla,
          dilersen bir diyetisyen bul.
        </p>
      </div>

      <div className="grid gap-4">
        <Link
          href="/baslangic/ai"
          className="reveal flex items-center gap-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 text-white shadow-[var(--shadow-float)] transition hover:brightness-105"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Bot className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-lg font-bold">
              AI Asistanla Diyete Başla
            </span>
            <span className="mt-0.5 block text-sm text-white/85">
              Birkaç soruyla sana özel program ve günlük kalori hedefi anında
              hazırlanır.
            </span>
          </span>
        </Link>

        <Link
          href="/diyetisyen-bul"
          className="reveal flex items-center gap-4 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-[var(--shadow-float)] transition hover:brightness-105"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Stethoscope className="h-7 w-7" />
          </span>
          <span>
            <span className="block text-lg font-bold">Diyetisyen Bul</span>
            <span className="mt-0.5 block text-sm text-white/90">
              Uzman diyetisyenleri incele, randevu al ve randevularını yönet.
            </span>
          </span>
        </Link>
      </div>

      <p className="text-center text-xs text-gray-400">
        İstediğin zaman öğünlerini değiştirebilir, sağlık sorularını sorabilir ve
        tabağının fotoğrafını paylaşabilirsin.
      </p>
    </div>
  );
}
