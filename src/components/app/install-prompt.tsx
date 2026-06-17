"use client";

import { Download, Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  dismissInstall,
  isInstallDismissed,
  isIosSafari,
  isStandalone,
} from "@/lib/install-client";

// Chromium'a özel; TS lib tiplerinde yok — minimal tanım.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * "Uygulamayı yükle" çağrısı. Tüm sayfalarda (giriş yapmamış ziyaretçiler dahil)
 * görünür; root layout'ta mount edilir.
 *
 * - Android/masaüstü Chromium: `beforeinstallprompt` yakalanır, butona basınca
 *   yerel kurulum diyaloğu açılır.
 * - iOS Safari: otomatik istem yoktur → "Ana Ekrana Ekle" için görsel talimat.
 * Zaten kuruluysa ya da yakın zamanda kapatıldıysa gösterilmez.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Android/masaüstü: olayı erkenden yakalamak için listener'ı senkron kaydet.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      if (isStandalone() || isInstallDismissed()) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      dismissInstall();
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari: otomatik istem yok → talimat kolunu mount sonrası göster.
    // (microtask: effect içinde senkron setState'ten kaçın.)
    queueMicrotask(() => {
      if (!mounted || isStandalone() || isInstallDismissed()) return;
      if (isIosSafari()) {
        setIos(true);
        setVisible(true);
      }
    });

    return () => {
      mounted = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  function close() {
    setVisible(false);
    setIosHelp(false);
    dismissInstall();
  }

  async function install() {
    if (ios) {
      setIosHelp(true);
      return;
    }
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    dismissInstall();
  }

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300">
          <Download className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          {!iosHelp ? (
            <>
              <p className="text-sm font-semibold">Uygulamayı yükle 📲</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                UzmanDiyet&apos;i ana ekranına ekle — tek dokunuşla aç,
                bildirimleri kaçırma.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={install}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.96]"
                >
                  {ios ? "Nasıl?" : "Yükle"}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100 active:scale-[0.96] dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Şimdi değil
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">Ana ekrana ekle</p>
              <ol className="mt-1.5 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    1.
                  </span>
                  Altta <Share className="h-3.5 w-3.5 shrink-0" /> Paylaş&apos;a
                  dokun
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    2.
                  </span>
                  <Plus className="h-3.5 w-3.5 shrink-0" /> &quot;Ana Ekrana
                  Ekle&quot;yi seç
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700 dark:text-gray-200">
                    3.
                  </span>
                  Sağ üstte &quot;Ekle&quot;ye dokun
                </li>
              </ol>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Kapat"
          className="shrink-0 text-gray-400 transition hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
