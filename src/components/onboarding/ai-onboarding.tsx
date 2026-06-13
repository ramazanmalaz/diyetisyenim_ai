"use client";

import { ClipboardList, MessageSquare } from "lucide-react";
import { useState } from "react";

import { ExistingPlanWizard } from "@/components/onboarding/existing-plan-wizard";
import { IntakeWizard } from "@/components/onboarding/intake-wizard";

type Mode = "choose" | "questions" | "existing";

export function AiOnboarding() {
  const [mode, setMode] = useState<Mode>("choose");

  if (mode === "questions") {
    return (
      <div className="space-y-4">
        <BackToChoose onClick={() => setMode("choose")} />
        <IntakeWizard />
      </div>
    );
  }

  if (mode === "existing") {
    return (
      <div className="space-y-4">
        <BackToChoose onClick={() => setMode("choose")} />
        <ExistingPlanWizard />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm dark:bg-gray-800">
        Merhaba! Ben diyet asistanın. Nasıl ilerleyelim — sana sıfırdan bir plan
        mı hazırlayayım, yoksa elinde hazır bir plan mı var?
      </div>

      <OptionCard
        icon={<MessageSquare className="h-6 w-6" strokeWidth={1.5} />}
        title="Bana plan hazırla"
        desc="Birkaç soruyla seni tanıyıp sana özel program ve günlük kalori hesabını çıkarayım."
        onClick={() => setMode("questions")}
      />
      <OptionCard
        icon={<ClipboardList className="h-6 w-6" strokeWidth={1.5} />}
        title="Hazır planım var"
        desc="Diyetisyeninden aldığın planı gir ya da fotoğrafını yükle; ben kalorileri hesaplayıp takip edeyim."
        onClick={() => setMode("existing")}
      />
    </div>
  );
}

function OptionCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group block w-full rounded-[1.5rem] bg-white/40 p-1.5 text-left ring-1 ring-black/5 transition-[transform,box-shadow] duration-300 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] active:scale-[0.99] dark:bg-white/5 dark:ring-white/10"
    >
      <span className="flex items-center gap-4 rounded-[calc(1.5rem-0.375rem)] bg-white/80 p-4 dark:bg-gray-900/70">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="mt-0.5 block text-sm text-gray-500 dark:text-gray-400">
            {desc}
          </span>
        </span>
      </span>
    </button>
  );
}

function BackToChoose({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs text-gray-400 transition-colors duration-200 ease-[var(--ease-out)] hover:text-gray-600 hover:underline"
    >
      ← Seçeneklere dön
    </button>
  );
}
