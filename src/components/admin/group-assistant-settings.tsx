"use client";

import { Bot } from "lucide-react";
import { useActionState } from "react";

import {
  updateAssistantSettings,
  type AssistantActionResult,
} from "@/app/(admin)/yonetim/gruplar/assistant-actions";
import { Button } from "@/components/ui/button";
import { DAY_NAMES } from "@/lib/group-assistant/schedule";

// Pazartesiden başlayan sıra; değerler JS getDay (0=Pazar).
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function GroupAssistantSettings({
  groupId,
  enabled,
  weighInDow,
  programStartedOn,
}: {
  groupId: string;
  enabled: boolean;
  weighInDow: number;
  programStartedOn: string | null;
}) {
  const [state, action, pending] = useActionState<AssistantActionResult | null, FormData>(
    updateAssistantSettings,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="group_id" value={groupId} />

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4 transition-colors hover:border-emerald-300 has-[:checked]:border-emerald-400 has-[:checked]:bg-emerald-50/60 dark:border-gray-800 dark:has-[:checked]:border-emerald-700 dark:has-[:checked]:bg-emerald-950/30">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={enabled}
          className="mt-1 h-4 w-4 accent-emerald-600"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 font-medium">
            <Bot className="h-4 w-4 text-emerald-600" /> Asistan bu grubu yönetsin
          </span>
          <span className="mt-0.5 block text-sm text-gray-500">
            Soruları cevaplar, tabakları yorumlar, su ve tartıyı kaydeder, her gün sabah/su/akşam
            yoklaması yapar, riskli mesajları sana bildirir. İlk açılışta gruba kendini tanıtır.
          </span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Tartı günü</span>
          <select
            name="weigh_in_dow"
            defaultValue={weighInDow}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
          >
            {DAY_ORDER.map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Program başlangıcı</span>
          <input
            type="date"
            name="program_started_on"
            defaultValue={programStartedOn ?? ""}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-950"
          />
          <span className="block text-xs text-gray-500">Tartı sıralaması bu tarihten itibaren toplam kaybı gösterir.</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Ayarları kaydet"}
        </Button>
        {state && "error" in state && <p className="text-sm text-red-600">{state.error}</p>}
        {state && "ok" in state && <p className="text-sm text-emerald-700">{state.message}</p>}
      </div>
    </form>
  );
}
