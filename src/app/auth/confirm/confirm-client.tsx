"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * E-posta onay / şifre sıfırlama bağlantısının indiği client handler.
 * Üç olası formatı da ele alır:
 *  - implicit: token URL FRAGMENT'ında (#access_token=...) → setSession
 *  - PKCE: ?code=... → exchangeCodeForSession
 *  - OTP: ?token_hash=...&type=... → verifyOtp
 * Başarılı olursa `next`e gider; olmazsa tanılama bilgisini gösterir.
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
  const [diag, setDiag] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const supabase = createClient();

    (async () => {
      const hashRaw =
        typeof window !== "undefined" && window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
      const hp = new URLSearchParams(hashRaw);
      const qp =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();

      // Supabase hata yollamış mı? (fragment ya da query)
      const errDesc =
        hp.get("error_description") ||
        qp.get("error_description") ||
        hp.get("error") ||
        qp.get("error");

      const accessToken = hp.get("access_token");
      const refreshToken = hp.get("refresh_token");

      // Tanılama özeti
      const seen = `code=${code ? "var" : "yok"} · token_hash=${
        tokenHash ? "var" : "yok"
      } · fragment=[${[...hp.keys()].join(",") || "boş"}]`;

      try {
        if (errDesc) throw new Error(errDesc);

        if (accessToken && refreshToken) {
          const { error: e } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (e) throw e;
          router.replace(next);
          return;
        }
        if (code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) throw new Error(`code: ${e.message}`);
          router.replace(next);
          return;
        }
        if (tokenHash && type) {
          const { error: e } = await supabase.auth.verifyOtp({
            type: type as EmailOtpType,
            token_hash: tokenHash,
          });
          if (e) throw new Error(`otp: ${e.message}`);
          router.replace(next);
          return;
        }
        throw new Error("Bağlantıda doğrulama bilgisi bulunamadı.");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "bilinmeyen hata";
        setDiag(`${msg}\n${seen}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass space-y-3 rounded-3xl p-8 text-center shadow-[var(--shadow-float)]">
      {diag ? (
        <>
          <h1 className="text-lg font-semibold">Bağlantı doğrulanamadı</h1>
          <p className="text-sm text-gray-500">
            Bağlantının süresi dolmuş ya da geçersiz olabilir.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-gray-100 p-2 text-left text-[11px] whitespace-pre-wrap text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {diag}
          </pre>
          <a
            href="/sifre-sifirla"
            className="inline-block text-sm text-emerald-600 hover:underline"
          >
            Yeni bağlantı iste
          </a>
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
