"use client";

import { UserPlus } from "lucide-react";
import { useActionState } from "react";

import {
  addGroupMember,
  type ActionResult,
} from "@/app/(admin)/yonetim/gruplar/actions";
import { Button } from "@/components/ui/button";

type ClientOption = { id: string; full_name: string | null };

export function AddGroupMemberForm({
  groupId,
  clients,
}: {
  groupId: string;
  clients: ClientOption[];
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    addGroupMember,
    null,
  );

  if (clients.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Eklenebilecek danışan kalmadı — tüm danışanların bu grupta.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="group_id" value={groupId} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="client_id"
          required
          defaultValue=""
          className="h-10 min-w-[12rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950"
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
        <Button type="submit" disabled={pending}>
          <UserPlus className="mr-1.5 h-4 w-4" />
          {pending ? "Ekleniyor…" : "Ekle"}
        </Button>
      </div>
      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
    </form>
  );
}
