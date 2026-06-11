import { ArrowUpRight, Bot, Stethoscope } from "lucide-react";
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
    <div className="mx-auto w-full max-w-md space-y-8 px-4 py-12">
      <div className="text-center">
        <span className="reveal inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          Başlangıç
        </span>
        <h1 className="reveal mt-4 text-3xl font-extrabold text-balance">
          Nasıl ilerleyelim?
        </h1>
        <p className="reveal mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Dilersen yapay zekâ asistanıyla hemen başla, dilersen gerçek bir
          diyetisyenle ilerle.
        </p>
      </div>

      <div className="space-y-4">
        <ChoiceCard
          href="/baslangic/ai"
          icon={<Bot className="h-6 w-6" strokeWidth={1.5} />}
          title="AI Diyet Asistanı"
          desc="Birkaç soruyla sana özel program ve günlük kalori hedefi hemen hazırlanır. Ücretsiz ve anında."
        />
        <ChoiceCard
          href="/diyetisyenler"
          icon={<Stethoscope className="h-6 w-6" strokeWidth={1.5} />}
          title="Diyetisyen ile ilerle"
          desc="Uzman diyetisyenlerimizi incele, birini seç ve uygun bir saate randevu al."
        />
      </div>
    </div>
  );
}

/** Seçim kartı — Double-Bezel (dış kabuk + iç çekirdek) + button-in-button ok. */
function ChoiceCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group reveal block rounded-[1.75rem] bg-white/40 p-1.5 ring-1 ring-black/5 transition-[transform,box-shadow] duration-[400ms] ease-[var(--ease-drawer)] hover:-translate-y-1 hover:shadow-[var(--shadow-float)] active:scale-[0.99] dark:bg-white/5 dark:ring-white/10"
    >
      <span className="flex items-center gap-4 rounded-[calc(1.75rem-0.375rem)] bg-white/80 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)] dark:bg-gray-900/70">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
            {desc}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-gray-500 transition-transform duration-[400ms] ease-[var(--ease-drawer)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105 dark:bg-white/10 dark:text-gray-300">
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </span>
    </Link>
  );
}
