"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  assignPlan,
  type ActionResult,
} from "@/app/(admin)/yonetim/danisanlar/actions";
import { Button } from "@/components/ui/button";
import { ASSIGN_WEEK_OPTIONS } from "@/lib/validations/plan";


type PlanRow = {
  id: string;
  title: string;
  status: string;
  is_template: boolean;
  daily_calorie_target: number | null;
};

export function ClientAssignPlan({
  clientId,
  plans,
}: {
  clientId: string;
  plans: PlanRow[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    assignPlan,
    null,
  );

  const templates = plans.filter((p) => p.is_template);
  const others = plans.filter((p) => !p.is_template);

  if (plans.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="font-semibold">Program Ata</h2>
        <p className="text-sm text-gray-500">
          Henüz şablonun yok.{" "}
          <Link
            href="/yonetim/planlar"
            className="text-emerald-600 hover:underline"
          >
            Şablon oluştur (elle ya da AI ile) →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Program Ata</h2>
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-600">
          Program atandı — kopyası oluşturuldu, aşağıdan düzenleyebilirsin.
        </p>
      )}
      <form action={action} className="space-y-2">
        <input type="hidden" name="client_id" value={clientId} />
        <div className="flex flex-wrap gap-2">
        <select
          name="plan_id"
          required
          defaultValue=""
          className="min-w-[10rem] flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="" disabled>
            Şablon seç…
          </option>
          {templates.length > 0 && (
            <optgroup label="Şablonlarım">
              {templates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                  {p.daily_calorie_target
                    ? ` · ${p.daily_calorie_target} kcal`
                    : ""}
                </option>
              ))}
            </optgroup>
          )}
          {others.length > 0 && (
            <optgroup label="Diğer planlar">
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <select
          name="duration_weeks"
          defaultValue="4"
          aria-label="Program süresi"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          {ASSIGN_WEEK_OPTIONS.map((w) => (
            <option key={w} value={w}>
              {w} hafta
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Atanıyor…" : "Ata"}
        </Button>
        </div>
      </form>
      <p className="text-xs text-gray-400">
        Atama şablonu kopyalar — şablon bozulmaz, danışanın programı bağımsız
        düzenlenir. İçerik süreden kısaysa baştan tekrar eder.
      </p>
      <Link
        href="/yonetim/planlar"
        className="block text-xs text-emerald-600 hover:underline"
      >
        + Şablon kütüphanesi
      </Link>
    </div>
  );
}
