"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * E-posta onay / şifre sıfırlama bağlantısının indiği client handler.
 * Üç olası formatı da ele alır:
 *  - implicit: token URL FRAGMENT'ında (#access_token=...) → setSession
 *    (fragment sunucuya ulaşmaz; bu yüzden işlem client'ta yapılır)
 *  - PKCE: ?code=... → exchangeCodeForSession (verifier tarayıcı çerezinde)
 *  - OTP: ?token_hash=...&type=... → verifyOtp
 * Başarılı olursa `next`e, olmazsa /giris'e yönlendirir.
 */
export function ConfirmClient({
  code,
  tokenHash,
  type,
  next,
}: {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  next: string;
}) {
  const router = useRouter();
  const ran = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const supabase = createClient();

    (async () => {
      try {
        // 1) Implicit akış — token'lar URL fragment'ında.
        const hash =
          typeof window !== "undefined" && window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : "";
        const hp = new URLSearchParams(hash);
        const accessToken = hp.get("access_token");
        const refreshToken = hp.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: e } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (e) throw e;
          router.replace(next);
          return;
        }

        // 2) PKCE akış — ?code=...
        if (code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) throw e;
          router.replace(next);
          return;
        }

        // 3) OTP akış — ?token_hash=...&type=...
        if (tokenHash && type) {
          const { error: e } = await supabase.auth.verifyOtp({
            type: type as EmailOtpType,
            token_hash: tokenHash,
          });
          if (e) throw e;
          router.replace(next);
          return;
        }

        throw new Error("Doğrulama bilgisi yok.");
      } catch {
        setError(true);
        setTimeout(() => router.replace("/giris?hata=onay"), 1800);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass space-y-3 rounded-3xl p-8 text-center shadow-[var(--shadow-float)]">
      {error ? (
        <>
          <h1 className="text-lg font-semibold">Bağlantı doğrulanamadı</h1>
          <p className="text-sm text-gray-500">
            Bağlantının süresi dolmuş olabilir. Giriş sayfasına
            yönlendiriliyorsun…
          </p>
        </>
      ) : (
        <>
          <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Doğrulanıyor…</p>
        </>
      )}
    </div>
  );
}
