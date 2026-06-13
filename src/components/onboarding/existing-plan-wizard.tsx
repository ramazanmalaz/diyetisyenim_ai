"use client";

import { ImagePlus, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import {
  extractPlanFromPhoto,
  saveManualPlan,
  uploadPlanPhotos,
} from "@/app/(app)/baslangic/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEAL_TYPES } from "@/lib/diet";
import type { MealType } from "@/types/database";

type Item = { content: string; calories: string };
type ItemsByType = Record<MealType, Item[]>;

const emptyItems = (): ItemsByType =>
  MEAL_TYPES.reduce((acc, m) => {
    acc[m.value] = [];
    return acc;
  }, {} as ItemsByType);

export function ExistingPlanWizard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ItemsByType>(emptyItems);
  const [title, setTitle] = useState("");
  const [dailyTarget, setDailyTarget] = useState("");
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [busy, setBusy] = useState<"" | "read" | "upload" | "save">("");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const totalKcal = MEAL_TYPES.reduce(
    (s, m) =>
      s + items[m.value].reduce((t, it) => t + (Number(it.calories) || 0), 0),
    0,
  );
  const itemCount = MEAL_TYPES.reduce((s, m) => s + items[m.value].length, 0);

  function filesFromInput(): File[] {
    return Array.from(fileRef.current?.files ?? []);
  }

  function buildFormData(files: File[]): FormData {
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    return fd;
  }

  function addItem(type: MealType) {
    setItems((prev) => ({
      ...prev,
      [type]: [...prev[type], { content: "", calories: "" }],
    }));
  }

  function updateItem(type: MealType, idx: number, patch: Partial<Item>) {
    setItems((prev) => ({
      ...prev,
      [type]: prev[type].map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  }

  function removeItem(type: MealType, idx: number) {
    setItems((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== idx),
    }));
  }

  async function handleRead() {
    const files = filesFromInput();
    if (files.length === 0) {
      setError("Önce bir görsel seç.");
      return;
    }
    setBusy("read");
    setError(null);
    setNote(null);
    const res = await extractPlanFromPhoto(buildFormData(files));
    setBusy("");
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setPhotoPaths((p) => [...p, ...res.photoPaths]);
    // AI'ın okuduğu öğeleri ilgili öğünlere ekle.
    setItems((prev) => {
      const next: ItemsByType = { ...prev };
      for (const m of res.meals) {
        next[m.meal_type] = [
          ...next[m.meal_type],
          { content: m.item, calories: String(m.calories) },
        ];
      }
      return next;
    });
    setNote(res.note || "Görsel okundu. Yanlış varsa düzelt, sonra kaydet.");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleUpload() {
    const files = filesFromInput();
    if (files.length === 0) {
      setError("Önce bir görsel seç.");
      return;
    }
    setBusy("upload");
    setError(null);
    const res = await uploadPlanPhotos(buildFormData(files));
    setBusy("");
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setPhotoPaths((p) => [...p, ...res.photoPaths]);
    setNote(`${res.photoPaths.length} görsel referans olarak eklendi.`);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    const flat = MEAL_TYPES.flatMap((m) =>
      items[m.value]
        .filter((it) => it.content.trim() !== "")
        .map((it) => ({
          mealType: m.value,
          content: it.content.trim(),
          calories: Number(it.calories) || 0,
        })),
    );
    if (flat.length === 0) {
      setError("En az bir öğün öğesi ekle (ya da görselden okut).");
      return;
    }
    setBusy("save");
    setError(null);
    const res = await saveManualPlan({
      title: title.trim() || undefined,
      dailyTarget: dailyTarget.trim() ? Number(dailyTarget) : undefined,
      items: flat,
      photoPaths,
    });
    // Başarılıysa action /plan'a yönlendirir.
    setBusy("");
    if (res && "error" in res) setError(res.error);
  }

  return (
    <div className="space-y-6">
      {/* 1) Görsel: AI oku VEYA referans ekle */}
      <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          <ImagePlus className="h-4 w-4" /> Planının fotoğrafı (opsiyonel)
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Diyetisyeninden aldığın listenin fotoğrafını yükle; asistan okuyup
          öğünleri otomatik doldursun. Dilersen aşağıdan elle de girebilirsin.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700 dark:text-gray-300"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleRead}
            disabled={busy !== ""}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4" />
            {busy === "read" ? "Okunuyor…" : "AI ile oku ve doldur"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleUpload}
            disabled={busy !== ""}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            {busy === "upload" ? "Yükleniyor…" : "Sadece referans ekle"}
          </Button>
        </div>
        {photoPaths.length > 0 && (
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            ✓ {photoPaths.length} görsel eklendi
          </p>
        )}
        {note && (
          <p className="text-xs text-gray-600 dark:text-gray-400">{note}</p>
        )}
      </section>

      {/* 2) Öğün şablonu (elle gir / düzelt) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Günlük öğünlerin</h2>
          <span className="text-xs text-gray-500">
            {itemCount} öğe · ~{totalKcal} kcal/gün
          </span>
        </div>

        {MEAL_TYPES.map((m) => (
          <div
            key={m.value}
            className="rounded-2xl border border-gray-200 p-3 dark:border-gray-800"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">{m.label}</span>
              <button
                type="button"
                onClick={() => addItem(m.value)}
                className="flex items-center gap-1 text-xs text-emerald-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Öğe ekle
              </button>
            </div>
            {items[m.value].length === 0 ? (
              <p className="text-xs text-gray-400">Henüz öğe yok.</p>
            ) : (
              <div className="space-y-2">
                {items[m.value].map((it, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={it.content}
                      onChange={(e) =>
                        updateItem(m.value, idx, { content: e.target.value })
                      }
                      placeholder="Örn. 2 haşlanmış yumurta"
                      className="flex-1"
                    />
                    <div className="relative w-24 shrink-0">
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={it.calories}
                        onChange={(e) =>
                          updateItem(m.value, idx, { calories: e.target.value })
                        }
                        placeholder="kcal"
                        className="pr-9"
                      />
                      <span className="absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-gray-400">
                        kcal
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(m.value, idx)}
                      aria-label="Öğeyi sil"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* 3) Başlık + günlük hedef (opsiyonel) */}
      <section className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="planTitle">Plan adı (opsiyonel)</Label>
          <Input
            id="planTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Kendi Planım"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dailyTarget">Günlük hedef (opsiyonel)</Label>
          <Input
            id="dailyTarget"
            type="number"
            inputMode="numeric"
            value={dailyTarget}
            onChange={(e) => setDailyTarget(e.target.value)}
            placeholder={`${totalKcal || "otomatik"}`}
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="button"
        onClick={handleSave}
        disabled={busy !== ""}
        className="w-full"
      >
        {busy === "save" ? "Kaydediliyor…" : "Planımı uygula →"}
      </Button>
    </div>
  );
}
