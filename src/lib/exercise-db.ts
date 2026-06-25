import "server-only";

// yuhonas free-exercise-db (anahtarsız, limitsiz) — egzersiz adı + demo görseller.
// Hem AI program üretiminde "kullanılabilir egzersiz" sözlüğü, hem de egzersiz
// detayında inline görsel çözümleme için kullanılır. Aynı kaynaktan seçilen
// egzersizlerin görseli her zaman bulunur.

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main";

type RawItem = {
  name?: string;
  images?: string[];
  equipment?: string | null;
  category?: string | null;
  level?: string | null;
};
export type ExerciseItem = {
  name: string;
  images: string[];
  equipment: string | null;
  category: string | null;
  level: string | null;
};

let cache: ExerciseItem[] | null = null;

export async function loadExerciseIndex(): Promise<ExerciseItem[]> {
  if (cache) return cache;
  const res = await fetch(`${CDN}/dist/exercises.json`, {
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  const raw = (await res.json()) as RawItem[];
  cache = raw
    .filter((x) => x.name && x.images && x.images.length > 0)
    .map((x) => ({
      name: x.name as string,
      images: x.images as string[],
      equipment: x.equipment ?? null,
      category: x.category ?? null,
      level: x.level ?? null,
    }));
  return cache;
}

const tok = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z]+/g) ?? []).filter((t) => t.length > 1));

function frameUrls(it: ExerciseItem): string[] {
  return it.images.slice(0, 2).map((p) => `${CDN}/exercises/${encodeURI(p)}`);
}

/**
 * Egzersiz adı/enName için demo görsel kareleri. Önce birebir ad eşleşmesi
 * (AI sözlükten seçtiyse kesin bulunur), yoksa token-örtüşmesi (skor>=0.5).
 */
export async function resolveExerciseFrames(
  query: string,
): Promise<string[] | null> {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const index = await loadExerciseIndex();

  const exact = index.find((it) => it.name.toLowerCase() === q);
  if (exact) return frameUrls(exact);

  const qt = tok(q);
  if (qt.size === 0) return null;
  let best: ExerciseItem | null = null;
  let bestScore = 0;
  let bestLen = Infinity;
  for (const it of index) {
    const nt = tok(it.name);
    let inter = 0;
    for (const t of qt) if (nt.has(t)) inter += 1;
    const score = inter / qt.size;
    if (score > bestScore || (score === bestScore && nt.size < bestLen)) {
      best = it;
      bestScore = score;
      bestLen = nt.size;
    }
  }
  if (!best || bestScore < 0.5) return null;
  return frameUrls(best);
}

const GYM_EQUIP = new Set([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "kettlebells",
  "e-z curl bar",
  "body only",
  null,
]);
const HOME_EQUIP = new Set(["body only", "bands", null]);
const USEFUL_CATEGORY = new Set(["strength", "cardio", "plyometrics"]);

/**
 * AI program üretiminde "enName için seçilebilecek" egzersiz adları listesi.
 * Moda göre filtrelenir; pratik (strength/cardio) ve başlangıç/orta öncelikli,
 * makul sayıda (prompt boyutu için ~220 ile sınırlı).
 */
export async function getExerciseVocabulary(
  mode: "bodyweight" | "gym",
): Promise<string[]> {
  const index = await loadExerciseIndex();
  const allow = mode === "gym" ? GYM_EQUIP : HOME_EQUIP;
  const pool = index.filter(
    (it) =>
      allow.has(it.equipment) &&
      it.category != null &&
      USEFUL_CATEGORY.has(it.category),
  );
  // Başlangıç/orta önce (yeni başlayanlar için tanıdık hareketler).
  const rank = (l: string | null) =>
    l === "beginner" ? 0 : l === "intermediate" ? 1 : 2;
  pool.sort((a, b) => rank(a.level) - rank(b.level));
  return pool.slice(0, 220).map((it) => it.name);
}
