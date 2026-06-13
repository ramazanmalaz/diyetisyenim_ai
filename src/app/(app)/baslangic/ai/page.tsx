import Link from "next/link";
import { redirect } from "next/navigation";

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
        <h1 className="mt-2 text-2xl font-bold">Diyet Asistanı 🥗</h1>
        <p className="text-sm text-gray-500">
          Sana plan hazırlayabilir ya da hazır planını alıp kalorilerini
          hesaplayıp takip edebilirim.
        </p>
      </div>
      <AiOnboarding />
    </div>
  );
}
