"use client";

import { Crown, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/**
 * Sorular bitince çıkan üyelik çağrısı. Anonim kullanıcıyı kalıcı hesaba
 * dönüştürür (e-posta + şifre). "Geç" derse anonim olarak devam eder.
 * Her iki durumda da `onContinue()` çağrılır → plan üretilir.
 */
export function SignupUpsell({
  onContinue,
  onSkip,
  title = "Planın hazır! Kaydedelim mi?",
  desc = "Ücretsiz bir hesapla planını kalıcı yap, ilerlemeni ve geçmişini kaybetme.",
  skipLabel = "Şimdilik geç, üye olmadan devam et",
}: {
  onContinue: () => void; // hesap oluşturulduktan sonra devam
  onSkip: () => void; // üye olmadan devam / vazgeç
  title?: string;
  desc?: string;
  skipLabel?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createAccount() {
    setError(null);
    if (!email.trim() || password.length < 6) {
      setError("Geçerli bir e-posta ve en az 6 karakter şifre gir.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      // Anonim kullanıcıyı kalıcı hesaba yükselt.
      const { data, error: upErr } = await supabase.auth.updateUser({
        email: email.trim(),
        password,
      });
      if (upErr) {
        setBusy(false);
        setError(
          upErr.message.includes("registered")
            ? "Bu e-posta zaten kayıtlı. Giriş yapmayı dene."
            : "Hesap oluşturulamadı. Lütfen tekrar dene.",
        );
        return;
      }
      // Ad'ı profile yaz (RLS: self update).
      const uid = data.user?.id;
      if (uid && name.trim()) {
        await supabase
          .from("profiles")
          .update({ full_name: name.trim() })
          .eq("id", uid);
      }
      onContinue();
    } catch {
      setBusy(false);
      setError("Bir hata oluştu. Lütfen tekrar dene.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div
        className="reveal w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-float)] dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pt-6 pb-7 text-white">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
            <Sparkles className="h-6 w-6" strokeWidth={2} />
          </span>
          <h2 className="mt-3 text-xl font-extrabold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 text-sm text-emerald-50/90">{desc}</p>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="space-y-1">
            <Label htmlFor="su-name">Ad (opsiyonel)</Label>
            <Input
              id="su-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adın"
              autoComplete="name"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-email">E-posta</Label>
            <Input
              id="su-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="su-pass">Şifre</Label>
            <Input
              id="su-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="button"
            onClick={createAccount}
            disabled={busy}
            className="w-full gap-2"
          >
            <Crown className="h-4 w-4" />
            {busy ? "Oluşturuluyor…" : "Hesabımı oluştur ve devam et"}
          </Button>
          <button
            type="button"
            onClick={onSkip}
            disabled={busy}
            className="w-full text-center text-sm text-gray-400 transition hover:text-gray-600 disabled:opacity-50"
          >
            {skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
