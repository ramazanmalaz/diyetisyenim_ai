"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteAccount } from "@/app/(app)/ayarlar/actions";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/10">
      <div>
        <h2 className="font-semibold text-red-900 dark:text-red-200">
          Hesabı sil
        </h2>
        <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/80">
          Hesabın, planın, sohbet geçmişin, ilerleme kayıtların ve ödeme
          geçmişin kalıcı olarak silinir. Bu işlem geri alınamaz.
        </p>
      </div>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      {!confirming ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(true)}
          className="gap-2 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" /> Hesabımı sil
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-300 bg-white p-4 dark:border-red-800 dark:bg-gray-900">
          <p className="flex items-start gap-2 text-sm font-medium text-red-800 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Emin misin? Tüm verilerin kalıcı olarak silinecek ve bu geri
            alınamayacak.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {pending ? "Siliniyor…" : "Evet, kalıcı olarak sil"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
