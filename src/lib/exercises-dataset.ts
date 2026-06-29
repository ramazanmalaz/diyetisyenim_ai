import "server-only";

// hasaneyldrm/exercises-dataset — 1324 egzersiz, GIF animasyon + Türkçe talimatlar.
// Aynı ExerciseDB kökenli olduğundan yuhonas veri seti ile egzersiz adları örtüşür;
// AI'nın seçtiği enName → buradaki name eşleşir.

const CDN =
  "https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main";

type RawExercise = {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions?: { tr?: string; en?: string };
  instruction_steps?: { tr?: string[]; en?: string[] };
  muscle_group?: string;
  secondary_muscles?: string[];
  target?: string;
  image?: string;
  gif_url?: string;
};

export type DatasetExercise = {
  id: string;
  name: string;
  category: string;
  bodyPart: string;
  equipment: string;
  trInstructions: string | null;
  trSteps: string[] | null;
  muscleGroup: string | null;
  secondaryMuscles: string[];
  gifUrl: string | null;
  imageUrl: string | null;
};

let cache: DatasetExercise[] | null = null;

export async function loadExercisesDataset(): Promise<DatasetExercise[]> {
  if (cache) return cache;
  const res = await fetch(`${CDN}/data/exercises.json`, {
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  const raw = (await res.json()) as RawExercise[];
  cache = raw.map((x) => ({
    id: x.id,
    name: x.name,
    category: x.category,
    bodyPart: x.body_part,
    equipment: x.equipment,
    trInstructions: x.instructions?.tr ?? null,
    trSteps: x.instruction_steps?.tr ?? null,
    muscleGroup: x.muscle_group ?? null,
    secondaryMuscles: x.secondary_muscles ?? [],
    gifUrl: x.gif_url ? `${CDN}/${x.gif_url}` : null,
    imageUrl: x.image ? `${CDN}/${x.image}` : null,
  }));
  return cache;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tok = (s: string) =>
  new Set((s.toLowerCase().match(/[a-z]+/g) ?? []).filter((t) => t.length > 1));

/** Egzersiz adına göre dataset'ten en iyi eşleşmeyi döndürür. */
export async function findExercise(
  name: string,
): Promise<DatasetExercise | null> {
  if (!name.trim()) return null;
  const dataset = await loadExercisesDataset();
  const q = norm(name);

  const exact = dataset.find((x) => norm(x.name) === q);
  if (exact) return exact;

  const qt = tok(name);
  if (qt.size === 0) return null;

  let best: DatasetExercise | null = null;
  let bestScore = 0;
  let bestLen = Infinity;

  for (const item of dataset) {
    const nt = tok(item.name);
    let inter = 0;
    for (const t of qt) if (nt.has(t)) inter++;
    const score = inter / qt.size;
    if (score > bestScore || (score === bestScore && nt.size < bestLen)) {
      best = item;
      bestScore = score;
      bestLen = nt.size;
    }
  }

  return bestScore >= 0.5 ? best : null;
}
