import { Bot, Stethoscope } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function BaslangicPage() {
  await requireProfile();
  const supabase = await createClient();

  // Zaten aktif planı varsa doğrudan plana git.
  const { data: active } = await supabase
    .from("diet_plans")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (active) redirect("/plan");

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Nasıl ilerleyelim? 🥗</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dilersen yapay zekâ asistanıyla hemen başla, dilersen gerçek bir
          diyetisyenle ilerle.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/baslangic/ai"
          className="glass flex items-start gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-float)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Bot className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-semibold">AI Diyet Asistanı</span>
            <span className="mt-0.5 block text-sm text-gray-500">
              Birkaç soruyla sana özel program ve günlük kalori hedefi hemen
              hazırlanır. Ücretsiz ve anında.
            </span>
          </span>
        </Link>

        <Link
          href="/diyetisyenler"
          className="glass flex items-start gap-4 rounded-3xl p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-float)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Stethoscope className="h-6 w-6" />
          </span>
          <span>
            <span className="block font-semibold">Diyetisyen ile ilerle</span>
            <span className="mt-0.5 block text-sm text-gray-500">
              Uzman diyetisyenlerimizi incele, birini seç ve uygun bir saate
              randevu al.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
