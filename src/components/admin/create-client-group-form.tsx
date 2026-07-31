"use client";

import { PlusCircle, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  createGroup,
  type ActionResult,
} from "@/app/(admin)/yonetim/gruplar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClientGroupForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createGroup,
    null,
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state && "ok" in state) setOpen(false);
  }, [state]);

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
        >
          <PlusCircle className="h-4 w-4" /> Yeni grup oluştur
        </button>
      ) : (
        <form
          action={action}
          className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-emerald-900/50 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">
              Yeni Grup
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {state && "error" in state && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {state.error}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="cg_name">Grup adı</Label>
            <Input
              id="cg_name"
              name="name"
              placeholder="Ocak Grubu"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cg_note">Not (opsiyonel)</Label>
            <Input
              id="cg_note"
              name="note"
              placeholder="Kilo verme hedefi olanlar"
              autoComplete="off"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Oluşturuluyor…" : "Grubu oluştur"}
          </Button>
        </form>
      )}
    </div>
  );
}
