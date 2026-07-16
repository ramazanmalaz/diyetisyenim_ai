"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string };

/**
 * Hesabı ve tüm ilişkili verileri (plan, mesaj, ilerleme, ödeme geçmişi vb.)
 * kalıcı olarak siler. Tüm tablolar auth.users → profiles zincirinde
 * "on delete cascade" ile bağlı; auth kullanıcısını silmek yeterli.
 */
export async function deleteAccount(): Promise<ActionResult | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Hesap silinemedi. Lütfen tekrar dene." };

  await supabase.auth.signOut();
  redirect("/giris");
}
