type ScanItem = {
  name: string;
  calories: number;
  verdict: "positive" | "caution";
};

export type FoodScanData = {
  items: ScanItem[];
  total_calories: number;
  note: string;
  dailyTarget: number | null;
};

export function FoodScanCard({ data }: { data: FoodScanData }) {
  const positives = data.items.filter((i) => i.verdict === "positive");
  const cautions = data.items.filter((i) => i.verdict === "caution");
  const ratio =
    data.dailyTarget && data.dailyTarget > 0
      ? Math.min(data.total_calories / data.dailyTarget, 1)
      : null;

  return (
    <div className="glass w-full max-w-[92%] space-y-3 rounded-2xl p-4 shadow-[var(--shadow-soft)]">
      {/* Başlık + toplam */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">🍽️ Tabak analizi</p>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums dark:bg-gray-800">
          ~{data.total_calories} kcal
        </span>
      </div>

      {/* Hedefe oran */}
      {ratio !== null && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-700"
              style={{ width: `${Math.round(ratio * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-gray-500">
            Günlük hedefin {data.dailyTarget} kcal
          </p>
        </div>
      )}

      {/* Olumlu */}
      {positives.length > 0 && (
        <Section
          title="Olumlu"
          tone="positive"
          items={positives}
        />
      )}

      {/* Dikkat */}
      {cautions.length > 0 && (
        <Section title="Dikkat" tone="caution" items={cautions} />
      )}

      {data.note && (
        <p className="border-t border-gray-100 pt-2 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
          {data.note}
        </p>
      )}

      <p className="text-[11px] text-gray-400">
        Yanlış okuduğum bir şey varsa yaz, ona göre güncellerim.
      </p>
    </div>
  );
}

function Section({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "positive" | "caution";
  items: ScanItem[];
}) {
  const styles =
    tone === "positive"
      ? {
          dot: "bg-emerald-500",
          chip: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
          label: "text-emerald-700 dark:text-emerald-400",
        }
      : {
          dot: "bg-amber-500",
          chip: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
          label: "text-amber-700 dark:text-amber-400",
        };

  return (
    <div className="space-y-1.5">
      <p
        className={`flex items-center gap-1.5 text-xs font-semibold ${styles.label}`}
      >
        <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        {tone === "positive" ? "✅" : "⚠️"} {title}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <li
            key={i}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${styles.chip}`}
          >
            <span>{it.name}</span>
            <span className="opacity-70 tabular-nums">{it.calories} kcal</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
