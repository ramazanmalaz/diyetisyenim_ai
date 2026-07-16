"use client";

import { PlusCircle, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  createDietitianAccount,
  type ActionResult,
} from "@/app/(admin)/yonetim/kullanicilar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateDietitianForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createDietitianAccount,
    null,
  );

  useEffect(() => {
    // Başarılı kayıt sonrası formu kapat — server action durumuna tepki.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (state && "success" in state) setOpen(false);
  }, [state]);

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
        >
          <PlusCircle className="h-4 w-4" /> Yeni diyetisyen ekle
        </button>
      ) : (
        <form
          action={action}
          className="space-y-3 rounded-2xl border border-emerald-200 bg-white p-5 shadow-[var(--shadow-soft)] dark:border-emerald-900/50 dark:bg-gray-900"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">
              Yeni Diyetisyen
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
            <Label htmlFor="dt_name">Ad Soyad</Label>
            <Input
              id="dt_name"
              name="full_name"
              placeholder="Dyt. Ayşe Kaya"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dt_email">E-posta</Label>
            <Input
              id="dt_email"
              name="email"
              type="email"
              placeholder="ayse@ornek.com"
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dt_pw">Geçici şifre</Label>
            <Input
              id="dt_pw"
              name="password"
              type="password"
              placeholder="En az 6 karakter"
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Oluşturuluyor…" : "Diyetisyen oluştur"}
          </Button>
        </form>
      )}
    </div>
  );
}
