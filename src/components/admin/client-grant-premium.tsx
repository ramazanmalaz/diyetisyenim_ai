"use client";

import { useActionState } from "react";

import {
  grantClientPremium,
  type ActionResult,
} from "@/app/(admin)/yonetim/danisanlar/actions";
import { Button } from "@/components/ui/button";

export function ClientGrantPremium({ clientId }: { clientId: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    grantClientPremium,
    null,
  );

  return (
    <div className="space-y-2">
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-emerald-600">Premium verildi!</p>
      )}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="client_id" value={clientId} />
        <select
          name="days"
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="30">30 gün</option>
          <option value="90">90 gün</option>
          <option value="180">180 gün</option>
          <option value="365">365 gün</option>
        </select>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Veriliyor…" : "Premium ver"}
        </Button>
      </form>
    </div>
  );
}
