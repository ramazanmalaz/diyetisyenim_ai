"use client";

import { PlusCircle, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  createClientAccount,
  type ActionResult,
} from "@/app/(admin)/yonetim/danisanlar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateClientForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createClientAccount,
    null,
  );

  useEffect(() => {
    // Başarılı kayıt sonrası formu kapat — server action durumuna tepki.
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
          <PlusCircle className="h-4 w-4" /> Yeni danışan ekle
        </button>
      ) : (
        <form
          action={action}
          className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-emerald-900/50 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">
              Yeni Danışan
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
            <Label htmlFor="cc_name">Ad Soyad</Label>
            <Input
              id="cc_name"
              name="full_name"
              placeholder="Ayşe Kaya"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cc_email">E-posta</Label>
            <Input
              id="cc_email"
              name="email"
              type="email"
              placeholder="ayse@ornek.com"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cc_pw">Geçici şifre</Label>
            <Input
              id="cc_pw"
              name="password"
              type="password"
              placeholder="En az 6 karakter"
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Oluşturuluyor…" : "Danışan oluştur"}
          </Button>
        </form>
      )}
    </div>
  );
}
