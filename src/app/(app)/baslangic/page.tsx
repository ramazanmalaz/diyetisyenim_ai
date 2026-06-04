import { redirect } from "next/navigation";

import { IntakeWizard } from "@/components/onboarding/intake-wizard";
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
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Diyetine başlayalım 🥗</h1>
        <p className="text-sm text-gray-500">
          Birkaç soruyla seni tanıyıp sana özel bir program ve günlük kalori
          hedefi hazırlayacağım.
        </p>
      </div>
      <IntakeWizard />
    </div>
  );
}
