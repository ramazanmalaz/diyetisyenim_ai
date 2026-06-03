import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Aktif diyetisyen kurallarını birleştirip döndürür.
 * Service-role istemcisiyle okunur (danışanlar ai_rules'u doğrudan göremez).
 */
export async function getActiveDietitianRules(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ai_rules")
    .select("content")
    .eq("is_active", true);

  if (!data || data.length === 0) return null;

  const combined = data
    .map((row) => row.content)
    .filter((c) => c.trim().length > 0)
    .join("\n\n");

  return combined.length > 0 ? combined : null;
}
