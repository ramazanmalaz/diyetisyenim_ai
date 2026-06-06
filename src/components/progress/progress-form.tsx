"use client";

import { ChevronDown, Minus, Plus } from "lucide-react";
import { useState } from "react";

import { addProgress } from "@/app/(app)/ilerleme/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ProgressForm({ defaultDate }: { defaultDate: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weight, setWeight] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

  function stepWeight(delta: number) {
    const cur = parseFloat(weight.replace(",", "."));
    const base = Number.isFinite(cur) ? cur : 70;
    const next = Math.max(0, Math.round((base + delta) * 10) / 10);
    setWeight(String(next));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);
    setSaving(true);
    const result = await addProgress(new FormData(form));
    setSaving(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    form.reset();
    setWeight("");
    setMoreOpen(false);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900"
    >
      <p className="font-semibold">Yeni kayıt</p>

      {/* Tarih */}
      <div>
        <Label htmlFor="entryDate">Tarih</Label>
        <Input
          id="entryDate"
          name="entryDate"
          type="date"
          defaultValue={defaultDate}
          className="mt-1 h-11 text-base"
        />
      </div>

      {/* Kilo — büyük punto + kadran */}
      <div className="rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-950/30">
        <Label className="text-emerald-700 dark:text-emerald-300">
          Kilo (kg)
        </Label>
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => stepWeight(-0.1)}
            aria-label="Azalt"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300"
          >
            <Minus className="h-5 w-5" />
          </button>
          <input
            name="weightKg"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(",", "."))}
            placeholder="72.5"
            className="w-36 bg-transparent text-center text-5xl font-bold tabular-nums text-gray-900 outline-none placeholder:text-gray-300 dark:text-white"
          />
          <button
            type="button"
            onClick={() => stepWeight(0.1)}
            aria-label="Artır"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-gray-900 dark:text-emerald-300"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {[-1, -0.5, 0.5, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => stepWeight(d)}
              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:bg-gray-900 dark:text-emerald-300"
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      {/* Daha fazla seçenek */}
      <div>
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <span>Daha fazla seçenek (su, bel, kalça, not, fotoğraf)</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-gray-400 transition-transform",
              moreOpen && "rotate-180",
            )}
          />
        </button>

        {moreOpen && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="waterMl">Su (ml)</Label>
                <Input
                  id="waterMl"
                  name="waterMl"
                  type="number"
                  step="50"
                  placeholder="2000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="waistCm">Bel (cm)</Label>
                <Input
                  id="waistCm"
                  name="waistCm"
                  type="number"
                  step="0.1"
                  placeholder="80"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hipCm">Kalça (cm)</Label>
                <Input
                  id="hipCm"
                  name="hipCm"
                  type="number"
                  step="0.1"
                  placeholder="95"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="note">Not</Label>
              <Input
                id="note"
                name="note"
                placeholder="Bugün nasıl hissettin?"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="photo">İlerleme fotoğrafı (ops.)</Label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700"
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
