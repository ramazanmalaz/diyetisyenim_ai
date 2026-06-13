"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

import { generatePlan } from "@/app/(app)/baslangic/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_LABEL } from "@/lib/diet/calories";
import { GOAL_OPTIONS } from "@/lib/validations/intake";
import { cn } from "@/lib/utils";
import type { ActivityLevel, Sex } from "@/types/database";

const TOTAL = 8;

type Answers = {
  sex?: Sex;
  age: string;
  heightCm: string;
  currentWeightKg: string;
  activity?: ActivityLevel;
  goalLossKg?: number;
  goalWeeks?: number;
  healthNotes: string;
  dislikes: string;
};

const QUESTIONS = [
  "Öncelikle, biyolojik cinsiyetin nedir? (kalori hesabı için)",
  "Kaç yaşındasın?",
  "Boyun kaç cm?",
  "Şu anki kilon kaç kg?",
  "Günlük hareket düzeyin nasıl?",
  "Hedefin ne? Ne kadar sürede kaç kilo vermek istersin?",
  "Bilmem gereken bir sağlık durumun var mı? (varsa yaz, yoksa boş geç)",
  "Sevmediğin ya da yemediğin besinler var mı? (yoksa boş geç)",
];

const ACTIVITIES: ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "active",
];

export function IntakeWizard() {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({
    age: "",
    heightCm: "",
    currentWeightKg: "",
    healthNotes: "",
    dislikes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Kendim belirleyeyim" — hedef tarih + kilo
  const [custom, setCustom] = useState(false);
  const [goalDate, setGoalDate] = useState("");
  const [goalKg, setGoalKg] = useState("");

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  }

  // Hedef seç (hazır şık) → kilo + hafta ata ve ilerle.
  function pickGoal(goalLossKg: number, goalWeeks: number) {
    setA((prev) => ({ ...prev, goalLossKg, goalWeeks }));
    next();
  }

  // Özel hedef: tarihten hafta hesapla, kilo ile birlikte ata ve ilerle.
  function confirmCustomGoal() {
    const kg = Number(goalKg);
    if (!goalDate || !(kg > 0)) {
      setError("Lütfen geçerli bir tarih ve kilo gir.");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(goalDate);
    const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
    if (days < 1) {
      setError("Hedef tarih ileri bir tarih olmalı.");
      return;
    }
    const weeks = Math.min(104, Math.max(1, Math.round(days / 7)));
    setA((prev) => ({ ...prev, goalLossKg: kg, goalWeeks: weeks }));
    next();
  }

  async function submit() {
    if (a.goalLossKg === undefined || a.goalWeeks === undefined) return;
    setSubmitting(true);
    setError(null);
    const result = await generatePlan({
      sex: a.sex,
      age: a.age,
      heightCm: a.heightCm,
      currentWeightKg: a.currentWeightKg,
      activity: a.activity,
      goalLossKg: a.goalLossKg,
      goalWeeks: a.goalWeeks,
      healthNotes: a.healthNotes,
      dislikes: a.dislikes,
    });
    // Başarılıysa action /plan'a yönlendirir; buraya yalnızca hata dönerse gelinir.
    setSubmitting(false);
    if (result && "error" in result) setError(result.error);
  }

  // Date input için minimum (yarın).
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const numberValid = (val: string) => val.trim() !== "" && Number(val) > 0;

  if (submitting) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent [animation-duration:0.7s]" />
        <p className="font-medium">Diyet asistanın planını hazırlıyor…</p>
        <p className="text-sm text-gray-500">Bu birkaç saniye sürebilir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* İlerleme */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-emerald-600 transition-[width] duration-500 ease-[var(--ease-out)]"
          style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
        />
      </div>

      {/* Soru + cevap — adım değişiminde birlikte yumuşakça gelir (key=step) */}
      <div key={step} className="step-in space-y-5">
        {/* Soru balonu */}
        <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm dark:bg-gray-800">
          {QUESTIONS[step]}
        </div>

        {/* Cevap alanı */}
        <div className="space-y-3">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-2">
              {(["female", "male"] as Sex[]).map((s) => (
                <Button
                  key={s}
                  variant={a.sex === s ? "primary" : "outline"}
                  onClick={() => {
                    setA({ ...a, sex: s });
                    next();
                  }}
                >
                  {s === "female" ? "Kadın" : "Erkek"}
                </Button>
              ))}
            </div>
          )}

          {step === 1 && (
            <NumberStep
              value={a.age}
              onChange={(v) => setA({ ...a, age: v })}
              placeholder="Örn. 30"
              suffix="yaş"
              canNext={numberValid(a.age)}
              onNext={next}
            />
          )}
          {step === 2 && (
            <NumberStep
              value={a.heightCm}
              onChange={(v) => setA({ ...a, heightCm: v })}
              placeholder="Örn. 170"
              suffix="cm"
              canNext={numberValid(a.heightCm)}
              onNext={next}
            />
          )}
          {step === 3 && (
            <NumberStep
              value={a.currentWeightKg}
              onChange={(v) => setA({ ...a, currentWeightKg: v })}
              placeholder="Örn. 78"
              suffix="kg"
              canNext={numberValid(a.currentWeightKg)}
              onNext={next}
            />
          )}

          {step === 4 && (
            <div className="grid gap-2">
              {ACTIVITIES.map((act) => (
                <Button
                  key={act}
                  variant={a.activity === act ? "primary" : "outline"}
                  className="justify-start"
                  onClick={() => {
                    setA({ ...a, activity: act });
                    next();
                  }}
                >
                  {ACTIVITY_LABEL[act]}
                </Button>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="grid gap-2">
              {GOAL_OPTIONS.map((g) => (
                <Button
                  key={g.label}
                  variant="outline"
                  className="justify-start"
                  onClick={() => {
                    setCustom(false);
                    pickGoal(g.goalLossKg, g.goalWeeks);
                  }}
                >
                  {g.label}
                </Button>
              ))}

              {/* Kendi tarih + kilo hedefini gir */}
              {custom ? (
                <div className="space-y-3 rounded-lg border border-emerald-200 p-3 dark:border-emerald-900">
                  <p className="text-sm font-medium">Kendi hedefini gir</p>
                  <div>
                    <Label htmlFor="goalKg">Vermek istediğin kilo (kg)</Label>
                    <Input
                      id="goalKg"
                      type="number"
                      step="0.5"
                      value={goalKg}
                      onChange={(e) => setGoalKg(e.target.value)}
                      placeholder="Örn. 6"
                    />
                  </div>
                  <div>
                    <Label htmlFor="goalDate">Hedef tarih</Label>
                    <Input
                      id="goalDate"
                      type="date"
                      min={minDate}
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={confirmCustomGoal}>Devam</Button>
                    <Button variant="ghost" onClick={() => setCustom(false)}>
                      Vazgeç
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="justify-start gap-1.5 text-emerald-600"
                  onClick={() => {
                    setCustom(true);
                    setError(null);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Kendim belirleyeyim (tarih +
                  kilo)
                </Button>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}

          {step === 6 && (
            <TextStep
              value={a.healthNotes}
              onChange={(v) => setA({ ...a, healthNotes: v })}
              placeholder="Örn. Tip-2 diyabet, laktoz hassasiyeti…"
              onNext={next}
            />
          )}

          {step === 7 && (
            <div className="space-y-3">
              <textarea
                value={a.dislikes}
                onChange={(e) => setA({ ...a, dislikes: e.target.value })}
                rows={2}
                placeholder="Örn. balık sevmem, kabağı yemem…"
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button onClick={submit} className="w-full">
                Planımı oluştur →
              </Button>
            </div>
          )}
        </div>
      </div>

      {step > 0 && step < 7 && (
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="text-xs text-gray-400 transition-colors duration-200 ease-[var(--ease-out)] hover:text-gray-600 hover:underline"
        >
          ← Geri
        </button>
      )}
    </div>
  );
}

function NumberStep({
  value,
  onChange,
  placeholder,
  suffix,
  canNext,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  suffix: string;
  canNext: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-12"
          onKeyDown={(e) => {
            if (e.key === "Enter" && canNext) onNext();
          }}
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-gray-400">
          {suffix}
        </span>
      </div>
      <Button onClick={onNext} disabled={!canNext}>
        İleri
      </Button>
    </div>
  );
}

function TextStep({
  value,
  onChange,
  placeholder,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onNext: () => void;
}) {
  return (
    <div className={cn("space-y-2")}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-950"
      />
      <Button onClick={onNext} variant="outline" className="w-full">
        Devam
      </Button>
    </div>
  );
}
