import { Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { AiOnboarding } from "@/components/onboarding/ai-onboarding";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function BaslangicAiPage() {
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
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <div>
        <Link href="/panel" className="text-sm text-gray-400 hover:underline">
          ← Geri
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
          Diyet Asistanı
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </span>
        </h1>
        <p className="text-sm text-gray-500">
          Sana plan hazırlayabilir ya da hazır planını alıp kalorilerini
          hesaplayıp takip edebilirim.
        </p>
      </div>
      <MedicalDisclaimer />
      <AiOnboarding />
    </div>
  );
}
