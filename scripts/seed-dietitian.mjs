#!/usr/bin/env node
// Örnek diyetisyen + danışanları + grubu oluşturur (demo/test verisi).
//
// Kullanım:
//   node scripts/seed-dietitian.mjs
//   node scripts/seed-dietitian.mjs --clean   # oluşturduğu demo hesapları siler
//
// - SUPABASE_SERVICE_ROLE_KEY .env.local'den okunur (repoya yazılmaz).
// - 20260101003400_dietitian_workspace migration'ı UYGULANMIŞ olmalı
//   (client_groups tabloları + guard_profile_update düzeltmesi buna bağlı).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CLEAN = process.argv.includes("--clean");

const env = readFileSync(join(ROOT, ".env.local"), "utf8");
const pick = (key) =>
  env.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");

const url = pick("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = pick("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !serviceKey) {
  console.error("HATA: .env.local'de SUPABASE URL / SERVICE_ROLE_KEY bulunamadı.");
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Demo kadro ──────────────────────────────────────────────────────────────
const DIETITIAN = {
  email: "diyetisyen@uzmandiyet.com",
  password: "Diyetisyen2026!",
  full_name: "Dyt. Elif Yılmaz",
};

const CLIENTS = [
  { email: "danisan1@uzmandiyet.com", password: "Danisan2026!", full_name: "Ayşe Kaya" },
  { email: "danisan2@uzmandiyet.com", password: "Danisan2026!", full_name: "Mehmet Demir" },
  { email: "danisan3@uzmandiyet.com", password: "Danisan2026!", full_name: "Zeynep Arslan" },
];

const GROUP_NAME = "Ocak Grubu";

/** E-postadan kullanıcıyı bulur (sayfalayarak). */
async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser({ email, password, full_name }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`  · var: ${email}`);
    return existing.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`  + oluşturuldu: ${email}`);
  return data.user.id;
}

async function removeUser(email) {
  const u = await findUserByEmail(email);
  if (!u) return console.log(`  · yok: ${email}`);
  const { error } = await db.auth.admin.deleteUser(u.id);
  if (error) throw new Error(`${email}: ${error.message}`);
  console.log(`  - silindi: ${email}`);
}

async function clean() {
  console.log("Demo hesaplar siliniyor…");
  for (const c of CLIENTS) await removeUser(c.email);
  await removeUser(DIETITIAN.email);
  console.log("Bitti.");
}

async function seed() {
  console.log("1) Diyetisyen hesabı");
  const dietitianId = await ensureUser(DIETITIAN);

  const { error: roleErr } = await db
    .from("profiles")
    .update({ role: "dietitian", full_name: DIETITIAN.full_name })
    .eq("id", dietitianId);
  if (roleErr) {
    throw new Error(
      `Rol atanamadı (${roleErr.message}). ` +
        "20260101003400_dietitian_workspace migration'ı uygulandı mı?",
    );
  }
  console.log("  ✓ rol: dietitian");

  console.log("2) Danışanlar");
  const clientIds = [];
  for (const c of CLIENTS) {
    const id = await ensureUser(c);
    const { error } = await db
      .from("profiles")
      .update({ dietitian_id: dietitianId, full_name: c.full_name, role: "client" })
      .eq("id", id);
    if (error) throw new Error(`${c.email} profili: ${error.message}`);
    clientIds.push(id);
  }
  console.log(`  ✓ ${clientIds.length} danışan diyetisyene bağlandı`);

  console.log("3) Grup + grup sohbeti");
  let { data: group } = await db
    .from("client_groups")
    .select("id, conversation_id")
    .eq("dietitian_id", dietitianId)
    .eq("name", GROUP_NAME)
    .maybeSingle();

  if (!group) {
    const { data, error } = await db
      .from("client_groups")
      .insert({
        dietitian_id: dietitianId,
        name: GROUP_NAME,
        note: "Kilo verme hedefi olanlar",
      })
      .select("id, conversation_id")
      .single();
    if (error) throw new Error(`Grup: ${error.message}`);
    group = data;
    console.log(`  + grup: ${GROUP_NAME}`);
  } else {
    console.log(`  · grup zaten var: ${GROUP_NAME}`);
  }

  if (!group.conversation_id) {
    const { data: conv, error } = await db
      .from("conversations")
      .insert({
        type: "group",
        title: GROUP_NAME,
        ai_enabled: false,
        created_by: dietitianId,
      })
      .select("id")
      .single();
    if (error) throw new Error(`Grup sohbeti: ${error.message}`);
    await db
      .from("client_groups")
      .update({ conversation_id: conv.id })
      .eq("id", group.id);
    group.conversation_id = conv.id;
    console.log("  + grup sohbeti açıldı");
  }

  await db.from("client_group_members").upsert(
    clientIds.map((client_id) => ({ group_id: group.id, client_id })),
    { onConflict: "group_id,client_id" },
  );
  await db.from("conversation_members").upsert(
    [dietitianId, ...clientIds].map((user_id) => ({
      conversation_id: group.conversation_id,
      user_id,
    })),
    { onConflict: "conversation_id,user_id" },
  );
  console.log("  ✓ üyeler senkronlandı");

  console.log("\n── Giriş bilgileri ─────────────────────────────");
  console.log(`Diyetisyen : ${DIETITIAN.email} / ${DIETITIAN.password}`);
  for (const c of CLIENTS) console.log(`Danışan    : ${c.email} / ${c.password}`);
  console.log("────────────────────────────────────────────────");
  console.log("Diyetisyen giriş yapınca /yonetim paneline düşer.");
}

try {
  await (CLEAN ? clean() : seed());
} catch (e) {
  console.error("\nHATA:", e.message);
  process.exit(1);
}
