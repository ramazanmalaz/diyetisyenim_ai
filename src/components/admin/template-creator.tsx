"use client";

import { Camera, PlusCircle, Sparkles, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import {
  createTemplate,
  createTemplateFromPhoto,
  createTemplateWithAi,
  type TemplateResult,
} from "@/app/(admin)/yonetim/planlar/template-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downscaleImage } from "@/lib/image-downscale";
import { cn } from "@/lib/utils";

type Mode = "ai" | "photo" | "manual";

export function TemplateCreator() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");

  const [aiState, aiAction, aiPending] = useActionState<
    TemplateResult | null,
    FormData
  >(createTemplateWithAi, null);
  const [photoState, photoAction, photoPending] = useActionState<
    TemplateResult | null,
    FormData
  >(createTemplateFromPhoto, null);
  const [manualState, manualAction, manualPending] = useActionState<
    TemplateResult | null,
    FormData
  >(createTemplate, null);

  const state =
    mode === "ai" ? aiState : mode === "photo" ? photoState : manualState;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
      >
        <PlusCircle className="h-4 w-4" /> Yeni program şablonu
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-emerald-900/50 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
          Yeni Program Şablonu
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mod seçimi */}
      <div className="flex gap-2">
        {(
          [
            { id: "ai" as const, label: "AI ile üret", icon: Sparkles },
            { id: "photo" as const, label: "Fotoğraftan oku", icon: Camera },
            { id: "manual" as const, label: "Elle", icon: PlusCircle },
          ]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-150",
              mode === id
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {state && "error" in state && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}

      {mode === "photo" ? (
        <PhotoTemplateForm action={photoAction} pending={photoPending} />
      ) : mode === "ai" ? (
        <form action={aiAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="tpl_ai_title">Şablon adı</Label>
            <Input
              id="tpl_ai_title"
              name="title"
              placeholder="1600 kcal Dengeli Program"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tpl_ai_cal">Günlük kalori hedefi</Label>
            <Input
              id="tpl_ai_cal"
              name="daily_target"
              type="number"
              min={800}
              max={5000}
              step={50}
              defaultValue={1600}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tpl_ai_brief">Nasıl bir program olsun?</Label>
            <textarea
              id="tpl_ai_brief"
              name="brief"
              rows={3}
              maxLength={500}
              placeholder="Örn. Akdeniz tarzı, kırmızı et az, laktoz intoleransı olanlar için uygun…"
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
            <p className="text-xs text-gray-400">
              Boş bırakırsan genel dengeli bir program üretilir.
            </p>
          </div>
          <Button type="submit" disabled={aiPending} className="w-full">
            {aiPending ? "Üretiliyor… (~20-40 sn)" : "AI ile 7 günlük program üret"}
          </Button>
        </form>
      ) : (
        <form action={manualAction} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="tpl_title">Şablon adı</Label>
            <Input
              id="tpl_title"
              name="title"
              placeholder="Sporcu Programı"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tpl_cal">Günlük kalori hedefi (opsiyonel)</Label>
            <Input
              id="tpl_cal"
              name="daily_target"
              type="number"
              min={800}
              max={5000}
              step={50}
              placeholder="1600"
            />
          </div>
          <Button type="submit" disabled={manualPending} className="w-full">
            {manualPending ? "Oluşturuluyor…" : "Boş şablon oluştur"}
          </Button>
          <p className="text-xs text-gray-400">
            Oluşturduktan sonra öğünleri tek tek eklersin.
          </p>
        </form>
      )}
    </div>
  );
}

/**
 * Fotoğraf/PDF'ten şablon okuma formu.
 *
 * Görseller GÖNDERMEDEN ÖNCE tarayıcıda küçültülür: mobil fotoğrafları 3-8 MB
 * olabiliyor (5 MB sınırını aşar, iOS'ta HEIC gelir). Küçültülmüş dosyalar
 * DataTransfer ile input'a geri yazılır ki form action'a onlar gitsin.
 */
function PhotoTemplateForm({
  action,
  pending,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);

  async function onFilesChange() {
    const input = inputRef.current;
    if (!input?.files || input.files.length === 0) {
      setNames([]);
      return;
    }
    setPreparing(true);
    const originals = Array.from(input.files);
    const prepared: File[] = [];

    for (const f of originals) {
      if (f.type === "application/pdf") {
        prepared.push(f);
        continue;
      }
      try {
        const blob = await downscaleImage(f);
        prepared.push(
          new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", {
            type: "image/jpeg",
          }),
        );
      } catch {
        // Küçültme başarısızsa orijinali gönder — sunucu limitleri yine korur.
        prepared.push(f);
      }
    }

    const dt = new DataTransfer();
    for (const f of prepared) dt.items.add(f);
    input.files = dt.files;

    setNames(prepared.map((f) => f.name));
    setPreparing(false);
  }

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="tpl_ph_title">Şablon adı</Label>
        <Input
          id="tpl_ph_title"
          name="title"
          placeholder="Diyetisyen Programı — Ocak"
          required
          autoComplete="off"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="tpl_ph_files">Program görseli ya da PDF</Label>
        <input
          id="tpl_ph_files"
          ref={inputRef}
          name="files"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          required
          onChange={onFilesChange}
          className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700 dark:border-gray-700 dark:bg-gray-950"
        />
        <p className="text-xs text-gray-400">
          En fazla 4 dosya · görsel 5 MB, PDF 10 MB. Haftanın günleri ayrı ayrı
          yazıyorsa günlere göre okunur; tek günlük şablonsa 7 güne uygulanır.
        </p>
      </div>

      {names.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {names.map((n) => (
            <li
              key={n}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {n}
            </li>
          ))}
        </ul>
      )}

      <Button
        type="submit"
        disabled={pending || preparing || names.length === 0}
        className="w-full"
      >
        {preparing
          ? "Dosyalar hazırlanıyor…"
          : pending
            ? "Okunuyor… (~20-40 sn)"
            : "Görselden programı oku"}
      </Button>
    </form>
  );
}
