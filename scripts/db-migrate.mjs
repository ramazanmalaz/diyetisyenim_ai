#!/usr/bin/env node
// Supabase migration uygulayıcı (Management API).
//
// Kullanım:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/db-migrate.mjs        # bekleyenleri uygula
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/db-migrate.mjs --dry  # sadece listele
//
// - PAT yalnızca ortam değişkeninden okunur (koda/REPO'ya ASLA yazılmaz).
// - Proje ref'i .env.local'deki NEXT_PUBLIC_SUPABASE_URL'den çıkarılır.
// - public.schema_migrations tablosu hangi sürümlerin uygulandığını tutar.
// - Migration dosyaları idempotent yazılmalı (create ... if not exists, vb.).

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");
const DRY = process.argv.includes("--dry");

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
if (!PAT) {
  console.error("HATA: SUPABASE_ACCESS_TOKEN ortam değişkeni gerekli.");
  process.exit(1);
}

const env = readFileSync(join(ROOT, ".env.local"), "utf8");
const url = env.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
const ref = url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error("HATA: NEXT_PUBLIC_SUPABASE_URL'den proje ref'i çıkarılamadı.");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${ref}/database/query`;

async function runSql(query) {
  const res = await fetch(API, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (data && typeof data === "object" && !Array.isArray(data) && data.message) {
    throw new Error(data.message);
  }
  return data;
}

async function main() {
  // Takip tablosunu garanti et.
  await runSql(
    "create table if not exists public.schema_migrations (version text primary key, name text, applied_at timestamptz not null default now());",
  );

  const applied = new Set(
    (await runSql("select version from public.schema_migrations")).map((r) => r.version),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !applied.has(f.replace(/\.sql$/, "").split("_")[0]));

  if (pending.length === 0) {
    console.log(`✓ Güncel — ${applied.size} migration uygulanmış, bekleyen yok.`);
    return;
  }

  console.log(`${pending.length} bekleyen migration:`);
  for (const f of pending) console.log("  - " + f);
  if (DRY) {
    console.log("\n(--dry: uygulanmadı)");
    return;
  }

  for (const f of pending) {
    const version = f.replace(/\.sql$/, "").split("_")[0];
    const name = f.replace(/\.sql$/, "").replace(/^[0-9]+_/, "");
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    process.stdout.write(`→ ${f} … `);
    await runSql(sql);
    await runSql(
      `insert into public.schema_migrations (version, name) values ('${version}', '${name.replace(/'/g, "''")}') on conflict (version) do nothing;`,
    );
    console.log("uygulandı ✓");
  }
  console.log("\nTamam.");
}

main().catch((e) => {
  console.error("\nMIGRATION HATASI:", e.message);
  process.exit(1);
});
