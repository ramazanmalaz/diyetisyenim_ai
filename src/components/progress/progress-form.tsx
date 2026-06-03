"use client";

import { useState } from "react";

import { addProgress } from "@/app/(app)/ilerleme/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProgressForm({ defaultDate }: { defaultDate: string }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
    >
      <p className="font-medium">Yeni kayıt</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="entryDate">Tarih</Label>
          <Input
            id="entryDate"
            name="entryDate"
            type="date"
            defaultValue={defaultDate}
          />
        </div>
        <div>
          <Label htmlFor="weightKg">Kilo (kg)</Label>
          <Input
            id="weightKg"
            name="weightKg"
            type="number"
            step="0.1"
            placeholder="72.5"
          />
        </div>
        <div>
          <Label htmlFor="waterMl">Su (ml)</Label>
          <Input
            id="waterMl"
            name="waterMl"
            type="number"
            step="50"
            placeholder="2000"
          />
        </div>
        <div>
          <Label htmlFor="waistCm">Bel (cm)</Label>
          <Input id="waistCm" name="waistCm" type="number" step="0.1" />
        </div>
        <div>
          <Label htmlFor="hipCm">Kalça (cm)</Label>
          <Input id="hipCm" name="hipCm" type="number" step="0.1" />
        </div>
      </div>

      <div>
        <Label htmlFor="note">Not</Label>
        <Input id="note" name="note" placeholder="Bugün nasıl hissettin?" />
      </div>

      <div>
        <Label htmlFor="photo">Öğün/ilerleme fotoğrafı (ops.)</Label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-emerald-700"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={saving}>
        {saving ? "Kaydediliyor…" : "Kaydet"}
      </Button>
    </form>
  );
}
