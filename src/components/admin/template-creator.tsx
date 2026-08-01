"use client";

import { PlusCircle, Sparkles, X } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createTemplate,
  createTemplateWithAi,
  type TemplateResult,
} from "@/app/(admin)/yonetim/planlar/template-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Mode = "ai" | "manual";

export function TemplateCreator() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");

  const [aiState, aiAction, aiPending] = useActionState<
    TemplateResult | null,
    FormData
  >(createTemplateWithAi, null);
  const [manualState, manualAction, manualPending] = useActionState<
    TemplateResult | null,
    FormData
  >(createTemplate, null);

  const state = mode === "ai" ? aiState : manualState;

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
            { id: "manual" as const, label: "Elle oluştur", icon: PlusCircle },
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

      {mode === "ai" ? (
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
