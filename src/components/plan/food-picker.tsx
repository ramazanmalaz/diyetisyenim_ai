"use client";

import { Globe, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { importUsdaFood, searchUsdaFoods } from "@/app/(app)/plan/actions";
import { Input } from "@/components/ui/input";
import type { Food } from "@/lib/foods";

type UsdaCandidate = { fdcId: number; description: string; kcalPer100g: number };

export function FoodPicker({
  foods,
  onPick,
  onCancel,
}: {
  foods: Food[];
  onPick: (food: Food) => void;
  onCancel?: () => void;
}) {
  const [q, setQ] = useState("");
  const [usda, setUsda] = useState<UsdaCandidate[] | null>(null);
  const [busy, setBusy] = useState<"search" | "import" | "">("");
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    const list = term
      ? foods.filter((f) => f.name.toLocaleLowerCase("tr").includes(term))
      : foods;
    return list.slice(0, 100);
  }, [q, foods]);

  async function handleUsdaSearch() {
    const term = q.trim();
    if (term.length < 2) return;
    setBusy("search");
    setError(null);
    setUsda(null);
    const res = await searchUsdaFoods(term);
    setBusy("");
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setUsda(res.candidates);
  }

  async function handleUsdaPick(c: UsdaCandidate) {
    setBusy("import");
    setError(null);
    const res = await importUsdaFood({
      description: c.description,
      kcalPer100g: c.kcalPer100g,
    });
    setBusy("");
    if ("error" in res) {
      setError(res.error);
      return;
    }
    onPick(res.food);
  }

  return (
    <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-gray-950">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setUsda(null);
        }}
        placeholder="Besin ara… (örn. peynir, yumurta)"
        autoFocus
      />
      <div className="max-h-52 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-400">
            Yerel katalogda sonuç yok.
          </p>
        ) : (
          filtered.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onPick(f)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <span>{f.name}</span>
              <span className="shrink-0 text-xs text-gray-400">
                {f.kcal_per_unit} kcal / {f.unit_label}
              </span>
            </button>
          ))
        )}
      </div>

      {/* USDA (uluslararası besin veritabanı) araması */}
      <button
        type="button"
        onClick={handleUsdaSearch}
        disabled={busy !== "" || q.trim().length < 2}
        className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
      >
        {busy === "search" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Globe className="h-3.5 w-3.5" />
        )}
        Bulamadın mı? USDA veritabanında ara
      </button>

      {usda !== null && (
        <div className="space-y-1">
          {usda.length === 0 ? (
            <p className="px-1 py-1 text-xs text-gray-400">
              USDA&apos;da uygun sonuç bulunamadı.
            </p>
          ) : (
            <>
              <p className="px-1 text-[11px] text-gray-400">
                USDA (100 g başına). Seçince eklenir; miktarı 100 g = 1 olarak gir
                (örn. 30 g için 0.3).
              </p>
              <div className="max-h-44 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                {usda.map((c) => (
                  <button
                    key={c.fdcId}
                    type="button"
                    onClick={() => handleUsdaPick(c)}
                    disabled={busy !== ""}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/30"
                  >
                    <span className="line-clamp-2">{c.description}</span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {c.kcalPer100g} kcal / 100 g
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {error && <p className="px-1 text-xs text-red-600">{error}</p>}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:underline"
        >
          İptal
        </button>
      )}
    </div>
  );
}
