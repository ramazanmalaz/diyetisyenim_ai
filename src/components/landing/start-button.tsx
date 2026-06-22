"use client";

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * "Hemen başla" — giriş istemeden onboarding'i başlatır.
 * Oturum yoksa sessizce anonim Supabase oturumu açar (kullanıcı sonra
 * sorular bitince hesabını oluşturur ya da "Geç"er). Anonim giriş Supabase'de
 * kapalıysa kullanıcıyı normal kayıt sayfasına yönlendirir (zarif düşüş).
 */
export function StartButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          // Anonim giriş kapalı → klasik kayıt akışına düş.
          router.push("/kayit");
          return;
        }
      }
      router.push("/baslangic/ai");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={busy}
      className="group inline-flex items-center gap-3 rounded-full bg-emerald-600 py-2.5 pr-2.5 pl-7 text-base font-semibold text-white shadow-[0_1px_2px_rgb(7_40_29/0.2),0_12px_28px_-10px_rgb(11_109_72/0.6)] transition-[transform,box-shadow] duration-[400ms] ease-[var(--ease-drawer)] hover:shadow-[0_2px_6px_rgb(7_40_29/0.25),0_18px_38px_-12px_rgb(11_109_72/0.65)] active:scale-[0.98] disabled:opacity-70"
    >
      {busy ? "Hazırlanıyor…" : "Hemen başla"}
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-[400ms] ease-[var(--ease-drawer)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
        <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
      </span>
    </button>
  );
}
