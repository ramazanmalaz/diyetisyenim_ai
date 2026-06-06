// Migration SQL'indeki besin tuple'larını okuyup canlı veritabanına ekler.
// service_role RLS'i bypass eder; name benzersiz olduğu için tekrarlar atlanır.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function env(key) {
  for (const f of [".env.local", ".env"]) {
    try {
      const txt = readFileSync(join(root, f), "utf8");
      const m = txt.match(new RegExp(`^${key}=(.*)$`, "m"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  return null;
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Supabase URL/service-role key bulunamadı.");
  process.exit(1);
}

const migFile = process.argv[2];
if (!migFile) {
  console.error("Kullanım: node scripts/seed-foods.mjs <migration.sql>");
  process.exit(1);
}

const sql = readFileSync(migFile, "utf8");
const re = /\('([^']+)',\s*'([^']+)',\s*(\d+)\)/g;
const rows = [];
let m;
while ((m = re.exec(sql)) !== null) {
  rows.push({ name: m[1], unit_label: m[2], kcal_per_unit: Number(m[3]) });
}

console.log(`${rows.length} besin bulundu, ekleniyor…`);

const res = await fetch(`${url}/rest/v1/foods?on_conflict=name`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=ignore-duplicates,return=minimal",
  },
  body: JSON.stringify(rows),
});

if (!res.ok) {
  console.error("HATA", res.status, await res.text());
  process.exit(1);
}

// Toplam besin sayısını doğrula
const countRes = await fetch(`${url}/rest/v1/foods?select=id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
});
const range = countRes.headers.get("content-range");
console.log(`Tamamlandı. Veritabanındaki toplam besin: ${range?.split("/")[1] ?? "?"}`);
