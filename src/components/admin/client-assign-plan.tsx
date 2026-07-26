"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  assignPlan,
  type ActionResult,
} from "@/app/(admin)/yonetim/danisanlar/actions";
import { Button } from "@/components/ui/button";

type PlanRow = { id: string; title: string; status: string };

export function ClientAssignPlan({
  clientId,
  plans,
  activePlanId,
}: {
  clientId: string;
  plans: PlanRow[];
  activePlanId: string | null;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    assignPlan,
    null,
  );

  if (plans.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="font-semibold">Plan Ata</h2>
        <p className="text-sm text-gray-500">
          Atanabilecek plan yok.{" "}
          <Link
            href="/yonetim/planlar/yeni"
            className="text-emerald-600 hover:underline"
          >
            Yeni plan oluştur →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Plan Ata</h2>
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-600">Plan atandı!</p>
      )}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="client_id" value={clientId} />
        <select
          name="plan_id"
          defaultValue={activePlanId ?? ""}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="" disabled>
            Plan seç…
          </option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
              {p.id === activePlanId ? " (aktif)" : ""}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Atanıyor…" : "Ata"}
        </Button>
      </form>
      <Link
        href="/yonetim/planlar/yeni"
        className="block text-xs text-emerald-600 hover:underline"
      >
        + Yeni plan oluştur
      </Link>
    </div>
  );
}
