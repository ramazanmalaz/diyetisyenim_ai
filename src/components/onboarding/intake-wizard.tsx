"use client";

import { Info, Lightbulb, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import { generatePlan } from "@/app/(app)/baslangic/actions";
import { SignupUpsell } from "@/components/onboarding/signup-upsell";
import { ACTIVITY_LABEL } from "@/lib/diet/calories";
import { createClient } from "@/lib/supabase/client";
import {
  DIET_TYPE_OPTIONS,
  GOAL_OPTIONS,
  type DietType,
} from "@/lib/validations/intake";
import { cn } from "@/lib/utils";
import type { ActivityLevel, Sex } from "@/types/database";

const TOTAL = 9;

type Answers = {
  sex?: Sex;
  age: string;
  heightCm: string;
  currentWeightKg: string;
  activity?: ActivityLevel;
  dietType?: DietType;
  goalLossKg?: number;
  goalWeeks?: number;
  healthNotes: string;
  dislikes: string;
};

type StepConfig = {
  heading: string;
  sub?: string;
  info: string;
  isTip?: boolean;
};

const STEPS: StepConfig[] = [
  {
    heading: "Cinsiyetin nedir?",
    sub: "Biyolojik cinsiyet, kalori hesabı için gerekli.",
    info: "Kalori ihtiyacı kadın ve erkek için farklı hesaplanır.",
  },
  {
    heading: "Kaç yaşındasın?",
    info: "Yaşın, metabolizma hızını ve günlük kalori hedefini belirler.",
  },
  {
    heading: "Boyun kaç?",
    info: "Boy bilgisi vücudunun her gün ne kadar enerji harcadığını hesaplamamıza yardımcı olur.",
  },
  {
    heading: "Şu anki kilonu gir",
    info: "Başlangıç kilonu bilmiyorsan tahmini gir — ileride güncelleyebilirsin.",
  },
  {
    heading: "Ne kadar hareketlisin?",
    sub: "Günlük aktivite düzeyini seç.",
    info: "Emin değilsen bir alt seviyeyi seçmek daha doğru kalori hedefi verir.",
    isTip: true,
  },
  {
    heading: "Beslenme tarzın ne?",
    sub: "Sana en uygun olanı seç.",
    info: "Seçtiğin tarz, planındaki öğünlerin çeşidini belirler.",
  },
  {
    heading: "Hedefin ne?",
    sub: "Ne kadar sürede kaç kilo vermek istiyorsun?",
    info: "Haftada 0,5 kg kayıp hem sağlıklı hem sürdürülebilir tempodur.",
    isTip: true,
  },
  {
    heading: "Sağlık durumun var mı?",
    sub: "Yoksa boş bırakabilirsin.",
    info: "Bu bilgi planını güvenli tutmamıza yardımcı olur.",
  },
  {
    heading: "Sevmediğin besinler?",
    sub: "Yoksa boş bırakabilirsin.",
    info: "Sevmediğin yiyecekleri planına dahil etmeyiz.",
  },
];

const ACTIVITY_META: Record<ActivityLevel, { emoji: string; desc: string }> = {
  sedentary: { emoji: "🪑", desc: "Masa başı iş, çok az yürüyüş" },
  light: { emoji: "🚶", desc: "Haftada 1-3 gün hafif egzersiz" },
  moderate: { emoji: "🏃", desc: "Haftada 3-5 gün orta düzey egzersiz" },
  active: { emoji: "💪", desc: "Haftada 6-7 gün yoğun egzersiz / ağır iş" },
};
const ACTIVITIES: ActivityLevel[] = ["sedentary", "light", "moderate", "active"];

const LOADING_SLIDES = [
  {
    emoji: "🥗",
    title: "Sana özel plan hazırlanıyor",
    desc: "Verdiğin bilgilere göre en uygun beslenme tarzı seçiliyor.",
  },
  {
    emoji: "🔢",
    title: "Günlük kalori hesaplanıyor",
    desc: "Vücudunun gerçek ihtiyacına göre tam hedef kalori belirleniyor.",
  },
  {
    emoji: "📅",
    title: "4 haftalık menü oluşturuluyor",
    desc: "Her gün farklı, dengeli ve sevdiğin yiyeceklerle dolu bir program geliyor.",
  },
  {
    emoji: "✨",
    title: "Son dokunuşlar yapılıyor",
    desc: "Planın neredeyse hazır, biraz daha bekle!",
  },
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
  const [slideIdx, setSlideIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [custom, setCustom] = useState(false);
  const [goalDate, setGoalDate] = useState("");
  const [goalKg, setGoalKg] = useState("");

  // Yükleme slideları — 4sn'de bir otomatik ilerle
  useEffect(() => {
    if (!submitting) {
      setSlideIdx(0);
      return;
    }
    const id = setInterval(() => {
      setSlideIdx((i) => (i < LOADING_SLIDES.length - 1 ? i + 1 : i));
    }, 4000);
    return () => clearInterval(id);
  }, [submitting]);

  async function finish() {
    if (a.goalLossKg === undefined || a.goalWeeks === undefined) return;
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user?.is_anonymous) {
      setShowUpsell(true);
      return;
    }
    void submit();
  }

  function next() {
    setError(null);
    setStep((s) => Math.min(s + 1, TOTAL - 1));
  }

  function pickGoal(goalLossKg: number, goalWeeks: number) {
    setA((prev) => ({ ...prev, goalLossKg, goalWeeks }));
    next();
  }

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
      dietType: a.dietType ?? "balanced",
      goalLossKg: a.goalLossKg,
      goalWeeks: a.goalWeeks,
      healthNotes: a.healthNotes,
      dislikes: a.dislikes,
    });
    setSubmitting(false);
    if (result && "error" in result) setError(result.error);
  }

  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const numberValid = (val: string) => val.trim() !== "" && Number(val) > 0;
  const cfg = STEPS[step];

  // ── YÜKLEME EKRANı ──────────────────────────────────────────────────────────
  if (submitting) {
    const slide = LOADING_SLIDES[slideIdx];
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-between py-6">
        {/* Slide içeriği */}
        <div
          key={slideIdx}
          className="slide-in flex flex-col items-center gap-5 px-4 text-center"
        >
          <div className="text-7xl">{slide.emoji}</div>
          <div>
            <h2 className="text-[22px] font-bold text-gray-900 dark:text-white">
              {slide.title}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              {slide.desc}
            </p>
          </div>
        </div>

        {/* Nokta göstergesi */}
        <div className="mt-8 flex items-center gap-2">
          {LOADING_SLIDES.map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-500",
                i === slideIdx
                  ? "h-2 w-6 bg-emerald-500"
                  : "h-2 w-2 bg-gray-300 dark:bg-gray-600",
              )}
            />
          ))}
        </div>

        <p className="mt-6 text-[12px] text-gray-400">
          Bu işlem 20–40 saniye sürebilir…
        </p>
      </div>
    );
  }

  // ── WIZARD ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Segmentli ilerleme çubuğu */}
      <div className="flex gap-1">
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i <= step
                ? "bg-emerald-500"
                : "bg-gray-200 dark:bg-gray-700",
            )}
          />
        ))}
      </div>

      {/* Adım içeriği */}
      <div key={step} className="step-in space-y-5">
        {/* Başlık */}
        <div>
          <h2 className="text-[26px] font-bold tracking-tight text-gray-900 dark:text-white leading-snug">
            {cfg.heading}
          </h2>
          {cfg.sub && (
            <p className="mt-1.5 text-[15px] text-gray-500 dark:text-gray-400">
              {cfg.sub}
            </p>
          )}
        </div>

        {/* Cevap alanı */}
        <div className="space-y-3">
          {/* Adım 0 — Cinsiyet */}
          {step === 0 && (
            <div className="grid grid-cols-2 gap-3">
              {(["female", "male"] as Sex[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setA({ ...a, sex: s });
                    next();
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-2xl border-2 py-6 text-[16px] font-semibold transition-all duration-200 active:scale-[0.97]",
                    a.sex === s
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white",
                  )}
                >
                  <span className="text-3xl">
                    {s === "female" ? "♀️" : "♂️"}
                  </span>
                  {s === "female" ? "Kadın" : "Erkek"}
                </button>
              ))}
            </div>
          )}

          {/* Adımlar 1-3 — Büyük sayı girişi */}
          {(step === 1 || step === 2 || step === 3) && (
            <BigNumberInput
              value={
                step === 1
                  ? a.age
                  : step === 2
                    ? a.heightCm
                    : a.currentWeightKg
              }
              onChange={(v) =>
                setA({
                  ...a,
                  ...(step === 1
                    ? { age: v }
                    : step === 2
                      ? { heightCm: v }
                      : { currentWeightKg: v }),
                })
              }
              suffix={step === 1 ? "yaş" : step === 2 ? "cm" : "kg"}
              placeholder={step === 1 ? "30" : step === 2 ? "170" : "78"}
              canNext={numberValid(
                step === 1 ? a.age : step === 2 ? a.heightCm : a.currentWeightKg,
              )}
              onNext={next}
            />
          )}

          {/* Adım 4 — Aktivite */}
          {step === 4 && (
            <div className="space-y-2">
              {ACTIVITIES.map((act) => {
                const meta = ACTIVITY_META[act];
                const selected = a.activity === act;
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => {
                      setA({ ...a, activity: act });
                      next();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.98]",
                      selected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900",
                    )}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[15px] text-gray-900 dark:text-white">
                        {ACTIVITY_LABEL[act]}
                      </p>
                      <p className="text-[13px] text-gray-500">{meta.desc}</p>
                    </div>
                    <CheckCircle visible={selected} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Adım 5 — Diyet tipi */}
          {step === 5 && (
            <div className="space-y-2">
              {DIET_TYPE_OPTIONS.map((d) => {
                const selected = a.dietType === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setA({ ...a, dietType: d.value });
                      next();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.98]",
                      selected
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                        : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900",
                    )}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-[15px] text-gray-900 dark:text-white">
                        {d.label}
                      </p>
                      <p className="text-[13px] text-gray-500">{d.desc}</p>
                    </div>
                    <CheckCircle visible={selected} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Adım 6 — Hedef */}
          {step === 6 && (
            <div className="space-y-2">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g.label}
                  type="button"
                  onClick={() => {
                    setCustom(false);
                    pickGoal(g.goalLossKg, g.goalWeeks);
                  }}
                  className="flex w-full items-center rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 text-left text-[15px] font-semibold text-gray-900 transition-all duration-200 hover:border-emerald-400 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  {g.label}
                </button>
              ))}

              {custom ? (
                <div className="space-y-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 dark:bg-emerald-900/20">
                  <p className="font-semibold text-[14px] text-gray-900 dark:text-white">
                    Kendi hedefini gir
                  </p>
                  <div>
                    <label className="mb-1 block text-[13px] text-gray-500">
                      Vermek istediğin kilo (kg)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={goalKg}
                      onChange={(e) => setGoalKg(e.target.value)}
                      placeholder="Örn. 6"
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] text-gray-500">
                      Hedef tarih
                    </label>
                    <input
                      type="date"
                      min={minDate}
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                      className="w-full rounded-xl border-2 border-gray-200 bg-white px-3.5 py-2.5 text-[15px] outline-none focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-900"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <CtaButton
                      onClick={confirmCustomGoal}
                      label="Devam"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setCustom(false)}
                      className="rounded-xl border-2 border-gray-200 px-4 py-2.5 text-[15px] text-gray-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setCustom(true);
                    setError(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 px-4 py-3 text-[14px] font-medium text-emerald-600 transition hover:border-emerald-400 active:scale-[0.98] dark:text-emerald-400"
                >
                  <Pencil className="h-4 w-4" /> Kendim belirleyeyim (tarih + kilo)
                </button>
              )}
              {error && !custom && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          )}

          {/* Adım 7 — Sağlık durumu */}
          {step === 7 && (
            <div className="space-y-3">
              <textarea
                value={a.healthNotes}
                onChange={(e) => setA({ ...a, healthNotes: e.target.value })}
                rows={3}
                placeholder="Örn. Tip-2 diyabet, laktoz hassasiyeti…"
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
              />
              <CtaButton onClick={next} label="Devam" />
            </div>
          )}

          {/* Adım 8 — Sevmedikleri */}
          {step === 8 && (
            <div className="space-y-3">
              <textarea
                value={a.dislikes}
                onChange={(e) => setA({ ...a, dislikes: e.target.value })}
                rows={3}
                placeholder="Örn. balık sevmem, kabağı yemem…"
                className="w-full rounded-2xl border-2 border-gray-200 bg-white px-4 py-3.5 text-[15px] outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <CtaButton onClick={finish} label="Planımı oluştur →" />
            </div>
          )}
        </div>

        {/* Info / Tip kartı */}
        <InfoCard text={cfg.info} isTip={cfg.isTip} />
      </div>

      {step > 0 && step < 8 && (
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="text-[13px] text-gray-400 transition-colors hover:text-gray-600 hover:underline"
        >
          ← Geri
        </button>
      )}

      {showUpsell && (
        <SignupUpsell
          onContinue={() => {
            setShowUpsell(false);
            void submit();
          }}
          onSkip={() => {
            setShowUpsell(false);
            void submit();
          }}
        />
      )}
    </div>
  );
}

// ── ALT BİLEŞENLER ────────────────────────────────────────────────────────────

function BigNumberInput({
  value,
  onChange,
  suffix,
  placeholder,
  canNext,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  suffix: string;
  placeholder: string;
  canNext: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-3">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canNext) onNext();
          }}
          className="min-w-0 flex-1 rounded-2xl border-2 border-gray-200 bg-white px-4 py-3 text-center text-[22px] font-semibold text-gray-900 outline-none transition focus:border-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <div className="flex items-center justify-center rounded-2xl bg-gray-100 px-4 py-3 text-[15px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {suffix}
        </div>
      </div>
      <CtaButton onClick={onNext} disabled={!canNext} label="İleri" />
    </div>
  );
}

function CtaButton({
  onClick,
  label,
  disabled,
  className,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-2xl py-4 text-[16px] font-semibold text-white transition-all duration-200 active:scale-[0.98]",
        disabled
          ? "cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
          : "bg-emerald-600 shadow-[0_4px_16px_-2px_rgba(106,166,33,0.4)] hover:bg-emerald-700",
        className,
      )}
    >
      {label}
    </button>
  );
}

function InfoCard({ text, isTip }: { text: string; isTip?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-2xl border-l-4 px-4 py-3.5",
        isTip
          ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20"
          : "border-blue-400 bg-blue-50 dark:bg-blue-900/20",
      )}
    >
      {isTip ? (
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
      )}
      <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-300">
        {text}
      </p>
    </div>
  );
}

function CheckCircle({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
      <svg
        className="h-3 w-3 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={3}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 13l4 4L19 7"
        />
      </svg>
    </div>
  );
}
