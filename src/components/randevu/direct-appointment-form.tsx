"use client";

import { CalendarCheck, Send } from "lucide-react";
import { useActionState } from "react";

import {
  requestDirectAppointment,
  type DirectApptState,
} from "@/app/(app)/randevu/actions";

export function DirectAppointmentForm({
  dietitianName,
}: {
  dietitianName: string;
}) {
  const [state, formAction, pending] = useActionState<DirectApptState, FormData>(
    requestDirectAppointment,
    null,
  );

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1);
  const minStr = minDate.toISOString().slice(0, 16);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200">
          <CalendarCheck className="h-5 w-5" />
          <p className="font-semibold">Randevu talebin iletildi!</p>
        </div>
        <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-300/70">
          {dietitianName} tarafından onaylandıktan sonra bildirileceksin.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900"
    >
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold">Randevu Talep Et</h3>
      </div>
      <p className="text-sm text-gray-500">
        Diyetisyen:{" "}
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {dietitianName}
        </span>
      </p>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tarih ve Saat
          <input
            type="datetime-local"
            name="scheduled_at"
            min={minStr}
            required
            className="mt-1 block w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Not (isteğe bağlı)
          <textarea
            name="notes"
            rows={2}
            maxLength={500}
            placeholder="Konu veya isteğini kısaca belirt…"
            className="mt-1 block w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
      </div>
      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(5,150,105,0.5)] transition-[background-color,opacity,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {pending ? "Gönderiliyor…" : "Talep gönder"}
      </button>
    </form>
  );
}
