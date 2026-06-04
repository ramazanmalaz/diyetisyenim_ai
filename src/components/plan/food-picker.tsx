"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { Food } from "@/lib/foods";

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
  const filtered = useMemo(() => {
    const term = q.trim().toLocaleLowerCase("tr");
    const list = term
      ? foods.filter((f) => f.name.toLocaleLowerCase("tr").includes(term))
      : foods;
    return list.slice(0, 50);
  }, [q, foods]);

  return (
    <div className="space-y-2 rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-gray-950">
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Besin ara… (örn. peynir, yumurta)"
        autoFocus
      />
      <div className="max-h-52 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-sm text-gray-400">Sonuç yok.</p>
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
