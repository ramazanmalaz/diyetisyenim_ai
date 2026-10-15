"use client";

import { Heart, Loader2, RefreshCw, Unplug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { disconnectHealth } from "@/app/(app)/gelisim/actions";
import {
  connectHealth,
  forgetHealthLocally,
  isHealthAvailable,
  syncHealth,
} from "@/lib/native-health";

function ago(iso: string | null): string {
  if (!iso) return "henüz senkronlanmadı";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "az önce senkronlandı";
  if (min < 60) return `${min} dk önce senkronlandı`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} saat önce senkronlandı`;
  return `${Math.round(h / 24)} gün önce senkronlandı`;
}

/**
 * Apple Sağlık bağlantı kartı. iPhone uygulamasında bağlanma/senkron;
 * web'de yalnızca durum (HealthKit yalnızca cihazda okunabilir).
 */
export function HealthConnect({
  connected,
  syncedAt,
}: {
  connected: boolean;
  syncedAt: string | null;
}) {
  const router = useRouter();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  useEffect(() => {
    let alive = true;
    void isHealthAvailable().then((v) => alive && setAvailable(v));
    return () => {
      alive = false;
    };
  }, []);

  async function run(kind: "connect" | "sync") {
    setBusy(kind);
    setError(null);
    const res =
      kind === "connect" ? await connectHealth() : await syncHealth(30);
    setBusy(null);
    if (!res.ok) setError(res.error ?? "Apple Sağlık verisi okunamadı.");
    router.refresh();
  }

  async function disconnect(deleteData: boolean) {
    setBusy("disconnect");
    setError(null);
    const res = await disconnectHealth({ deleteData });
    setBusy(null);
    setConfirmOff(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    forgetHealthLocally();
    router.refresh();
  }

  const btn =
    "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,transform,opacity] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:scale-[0.97] disabled:opacity-60";

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 text-white shadow-[0_8px_18px_-10px_rgba(225,29,72,0.7)]">
          <Heart className="h-5 w-5" strokeWidth={2} fill="currentColor" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">Apple Sağlık</h2>
          {connected ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Bağlı · {ago(syncedAt)}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Adım, aktif kalori, antrenman (Apple Watch dahil), uyku, dinlenik
              nabız ve kilon diyetinle birlikte değerlendirilsin. Girdiğin kilo
              ve yediğin kalori de Sağlık&apos;a yazılır.
            </p>
          )}
        </div>
      </div>

      {available === true && (
        <div className="mt-4 flex flex-wrap gap-2">
          {!connected ? (
            <button
              type="button"
              onClick={() => run("connect")}
              disabled={busy !== null}
              className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}
            >
              {busy === "connect" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Apple Sağlık&apos;ı bağla
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => run("sync")}
                disabled={busy !== null}
                className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700`}
              >
                {busy === "sync" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Şimdi senkronla
              </button>
              <button
                type="button"
                onClick={() => setConfirmOff((v) => !v)}
                disabled={busy !== null}
                aria-expanded={confirmOff}
                className={`${btn} text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800`}
              >
                <Unplug className="h-4 w-4" /> Bağlantıyı kes
              </button>
            </>
          )}
        </div>
      )}

      {/* Web'de ya da Sağlık olmayan cihazda yönlendirme */}
      {available === false && !connected && (
        <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
          Apple Sağlık&apos;ı iPhone&apos;daki UzmanDiyet uygulamasından
          bağlayabilirsin.
        </p>
      )}

      {confirmOff && (
        <div className="step-in mt-3 space-y-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-gray-800/60">
          <p className="text-gray-600 dark:text-gray-300">
            Bağlantı kesilince yeni veri alınmaz. Şimdiye kadar alınan Sağlık
            verileri de silinsin mi?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => disconnect(true)}
              disabled={busy !== null}
              className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}
            >
              {busy === "disconnect" && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Kes ve verileri sil
            </button>
            <button
              type="button"
              onClick={() => disconnect(false)}
              disabled={busy !== null}
              className={`${btn} bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700`}
            >
              Yalnızca kes
            </button>
          </div>
          <p className="text-xs text-gray-400">
            İzinleri tamamen kaldırmak için: iPhone Ayarlar → Sağlık → Veri
            Erişimi ve Aygıtlar → UzmanDiyet.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}
    </section>
  );
}
