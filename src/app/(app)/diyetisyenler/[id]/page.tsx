import Link from "next/link";
import { notFound } from "next/navigation";

import { DietitianProfile } from "@/components/dietitians/dietitian-profile";
import { requireProfile } from "@/lib/auth";
import {
  PUBLIC_DIETITIAN_COLUMNS,
  type PublicDietitian,
} from "@/lib/dietitians";
import { createClient } from "@/lib/supabase/server";

export default async function DietitianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("dietitians")
    .select(PUBLIC_DIETITIAN_COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) notFound();
  const d = data as PublicDietitian;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-8">
      <Link
        href="/diyetisyen-bul"
        className="text-sm text-gray-400 hover:underline"
      >
        ← Diyetisyenler
      </Link>

      <DietitianProfile d={d} />
    </div>
  );
}
