"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ruleSchema = z.object({
  key: z.string().min(1),
  content: z.string().max(4000),
});

export type SaveResult = { error: string } | { success: true };

export async function saveAiRule(values: unknown): Promise<SaveResult> {
  const profile = await requireStaff();

  const parsed = ruleSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "Geçersiz içerik (en fazla 4000 karakter)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_rules")
    .update({
      content: parsed.data.content,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("key", parsed.data.key);

  if (error) {
    return { error: "Kaydedilemedi. Lütfen tekrar deneyin." };
  }

  revalidatePath("/yonetim/ai-kurallari");
  return { success: true };
}
