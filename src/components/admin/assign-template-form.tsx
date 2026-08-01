"use client";

import { UserCheck } from "lucide-react";
import { useActionState } from "react";

import {
  assignTemplateToClient,
  type TemplateResult,
} from "@/app/(admin)/yonetim/planlar/template-actions";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; full_name: string | null };

export function AssignTemplateForm({
  planId,
  clients,
}: {
  planId: string;
  clients: ClientOption[];
}) {
  const [state, action, pending] = useActionState<
    TemplateResult | null,
    FormData
  >(assignTemplateToClient, null);

  if (clients.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">
        Atanacak danışanın yok.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
        Bu şablonu bir danışana ata
      </p>
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      <form action={action} className="flex gap-2">
        <input type="hidden" name="plan_id" value={planId} />
        <select
          name="client_id"
          required
          defaultValue=""
          className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <option value="" disabled>
            Danışan seç…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name ?? c.id}
            </option>
          ))}
        </select>
        <Button type="submit" disabled={pending} className="shrink-0">
          <UserCheck className="mr-1.5 h-4 w-4" />
          {pending ? "Atanıyor…" : "Ata"}
        </Button>
      </form>
      <p className="text-xs text-emerald-700/70 dark:text-emerald-300/60">
        Kopyası oluşturulur ve danışanın aktif programı olur; şablon aynen kalır.
      </p>
    </div>
  );
}
