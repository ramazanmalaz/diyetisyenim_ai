"use client";

import { useState } from "react";

import { setPlanStatus } from "@/app/(admin)/yonetim/planlar/actions";
import { cn } from "@/lib/utils";
import type { PlanStatus } from "@/types/database";

const OPTIONS: { value: PlanStatus; label: string }[] = [
  { value: "draft", label: "Taslak" },
  { value: "active", label: "Aktif" },
  { value: "archived", label: "Arşiv" },
];

export function PlanStatusControl({
  planId,
  current,
}: {
  planId: string;
  current: PlanStatus;
}) {
  const [status, setStatus] = useState<PlanStatus>(current);
  const [pending, setPending] = useState(false);

  async function change(next: PlanStatus) {
    if (next === status || pending) return;
    setPending(true);
    const result = await setPlanStatus({ planId, status: next });
    setPending(false);
    if (!("error" in result)) setStatus(next);
  }

  return (
    <div className="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-700">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => change(o.value)}
          disabled={pending}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition disabled:opacity-50",
            status === o.value
              ? "bg-emerald-600 text-white"
              : "hover:bg-gray-100 dark:hover:bg-gray-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
