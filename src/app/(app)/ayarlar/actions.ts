"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error: string };

const PHOTO_BUCKET = "progress-photos";

/** Kullanıcının klasöründeki tüm dosya yolları (alt klasörler dahil). */
async function listUserFiles(
  admin: ReturnType<typeof createAdminClient>,
  prefix: string,
  depth = 0,
): Promise<string[]> {
  const { data } = await admin.storage
    .from(PHOTO_BUCKET)
    .list(prefix, { limit: 1000 });
  const out: string[] = [];
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    // Klasör girdilerinin id'si yok.
    if (item.id) out.push(path);
    else if (depth < 3)
      out.push(...(await listUserFiles(admin, path, depth + 1)));
  }
  return out;
}

/**
 * Hesabı ve tüm ilişkili verileri (plan, mesaj, ilerleme, ödeme geçmişi vb.)
 * kalıcı olarak siler. Tablolar auth.users → profiles zincirinde
 * "on delete cascade" ile bağlı; Storage'daki fotoğraflar ise cascade'e
 * dahil değil, önce onlar silinir (öğün, ilerleme, sohbet fotoğrafları
 * `progress-photos/<kullanıcı-id>/` altında).
 */
export async function deleteAccount(): Promise<ActionResult | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const admin = createAdminClient();
  try {
    const files = await listUserFiles(admin, user.id);
    for (let i = 0; i < files.length; i += 100) {
      await admin.storage.from(PHOTO_BUCKET).remove(files.slice(i, i + 100));
    }
  } catch (err) {
    // Fotoğraf silme hatası hesabın silinmesini engellemesin; loglanır.
    console.error("[hesap-sil] fotoğraflar silinemedi", err);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "Hesap silinemedi. Lütfen tekrar dene." };

  await supabase.auth.signOut();
  redirect("/giris");
}
