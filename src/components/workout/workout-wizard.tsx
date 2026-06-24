"use client";

import {
  Camera,
  Check,
  Dumbbell,
  Home,
  Loader2,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { analyzeGym, generateWorkout } from "@/app/(app)/spor/actions";
import { triggerPremiumWall } from "@/lib/premium-wall";
import { cn } from "@/lib/utils";
import {
  DAYS_OPTIONS,
  EQUIPMENT_OPTIONS,
  GOAL_OPTIONS,
  LEVEL_OPTIONS,
  SESSION_OPTIONS,
  STYLE_OPTIONS,
} from "@/lib/workout";

type Step =
  | "level"
  | "goal"
  | "sex"
  | "days"
  | "session"
  | "style"
  | "injuries"
  | "mode"
  | "gympath"
  | "equipment"
  | "photo";

export function WorkoutWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("level");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [sex, setSex] = useState<"female" | "male" | null>(null);
  const [days, setDays] = useState(3);
  const [sessionMin, setSessionMin] = useState(60);
  const [style, setStyle] = useState("any");
  const [injuries, setInjuries] = useState("");
  const [mode, setMode] = useState<"bodyweight" | "gym" | null>(null);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleEquip(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
  }

  async function runGenerate(eq: string[], m: "bodyweight" | "gym") {
    setGenerating(true);
    setError(null);
    try {
      const res = await generateWorkout({
        mode: m,
        level,
        goal,
        daysPerWeek: days,
        equipment: eq,
        sex: sex ?? undefined,
        sessionMin,
        style,
        injuries: injuries.trim() || undefined,
      });
      if ("ok" in res) {
        router.push("/spor");
        router.refresh();
        return;
      }
      setGenerating(false);
      if ("quota" in res) {
        triggerPremiumWall("chat");
        return;
      }
      setError(res.error);
    } catch {
      // Zaman aşımı / ağ hatası → spinner'da takılı kalma.
      setGenerating(false);
      setError(
        "Program hazırlanırken zaman aşımına uğradı. Lütfen tekrar dene.",
      );
    }
  }

  async function scanGym() {
    const files = Array.from(fileRef.current?.files ?? []);
    if (files.length === 0) {
      setError("Önce salonun fotoğrafını seç.");
      return;
    }
    setScanning(true);
    setError(null);
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));
    const res = await analyzeGym(fd);
    setScanning(false);
    if ("quota" in res) {
      triggerPremiumWall("vision");
      return;
    }
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setEquipment(res.equipment);
    setScanNote(
      res.equipment.length
        ? "Tanınan aletleri kontrol et, ekle/çıkar, sonra programı oluştur."
        : "Net alet tanınamadı. Aşağıdan elle ekleyebilir ya da karışık program oluşturabilirsin.",
    );
  }

  if (generating) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
          <p className="font-medium">Antrenman programın hazırlanıyor…</p>
          <p className="text-sm text-zinc-400">Bu birkaç saniye sürebilir.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/15 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-lime-300 uppercase">
          <Dumbbell className="h-3.5 w-3.5" /> Spor Asistanı
        </span>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          Sana özel antrenman programı
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Birkaç soru, sonra programını oluşturalım.
        </p>
      </div>

      {error && (step === "mode" || step === "gympath") && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* SORULAR */}
      {step === "level" && (
        <Question title="Spor geçmişin nasıl?">
          {LEVEL_OPTIONS.map((o) => (
            <Choice
              key={o.value}
              active={level === o.value}
              onClick={() => {
                setLevel(o.value);
                setStep("goal");
              }}
            >
              {o.label}
            </Choice>
          ))}
        </Question>
      )}

      {step === "goal" && (
        <Question title="Hedefin ne?" onBack={() => setStep("level")}>
          {GOAL_OPTIONS.map((o) => (
            <Choice
              key={o.value}
              active={goal === o.value}
              onClick={() => {
                setGoal(o.value);
                setStep("sex");
              }}
            >
              {o.label}
            </Choice>
          ))}
        </Question>
      )}

      {step === "sex" && (
        <Question title="Biyolojik cinsiyetin?" onBack={() => setStep("goal")}>
          <div className="grid grid-cols-2 gap-2">
            {(["female", "male"] as const).map((s) => (
              <Choice
                key={s}
                active={sex === s}
                onClick={() => {
                  setSex(s);
                  setStep("days");
                }}
              >
                {s === "female" ? "Kadın" : "Erkek"}
              </Choice>
            ))}
          </div>
        </Question>
      )}

      {step === "days" && (
        <Question title="Haftada kaç gün antrenman?" onBack={() => setStep("sex")}>
          <div className="grid grid-cols-5 gap-2">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDays(d);
                  setStep("session");
                }}
                className={cn(
                  "rounded-xl border py-3 text-lg font-bold transition active:scale-95",
                  days === d
                    ? "border-lime-400 bg-lime-400/15 text-lime-300"
                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500",
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </Question>
      )}

      {step === "session" && (
        <Question
          title="Bir antrenman ne kadar sürsün?"
          onBack={() => setStep("days")}
        >
          {SESSION_OPTIONS.map((o) => (
            <Choice
              key={o.value}
              active={sessionMin === o.value}
              onClick={() => {
                setSessionMin(o.value);
                setStep("style");
              }}
            >
              {o.label}
            </Choice>
          ))}
        </Question>
      )}

      {step === "style" && (
        <Question
          title="Nasıl bir antrenman tarzı?"
          onBack={() => setStep("session")}
        >
          {STYLE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setStyle(o.value);
                setStep("injuries");
              }}
              className={cn(
                "w-full rounded-xl border px-4 py-3 text-left transition active:scale-[0.98]",
                style === o.value
                  ? "border-lime-400 bg-lime-400/15"
                  : "border-zinc-700 bg-zinc-900 hover:border-zinc-500",
              )}
            >
              <span className="block text-sm font-medium">{o.label}</span>
              <span className="block text-xs text-zinc-400">{o.desc}</span>
            </button>
          ))}
        </Question>
      )}

      {step === "injuries" && (
        <Question
          title="Dikkat etmemiz gereken bir sakatlık/kısıt var mı?"
          onBack={() => setStep("style")}
        >
          <textarea
            value={injuries}
            onChange={(e) => setInjuries(e.target.value)}
            rows={2}
            placeholder="Örn. diz ağrısı, bel fıtığı… (yoksa boş geç)"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={() => setStep("mode")}
            className="w-full rounded-xl bg-lime-400 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:brightness-105 active:scale-[0.98]"
          >
            Devam →
          </button>
        </Question>
      )}

      {/* MOD */}
      {step === "mode" && (
        <Question title="Nerede antrenman yapacaksın?" onBack={() => setStep("injuries")}>
          <BigChoice
            icon={Home}
            title="Kendi ağırlığımla (ev)"
            desc="Alet gerektirmeyen, vücut ağırlığı hareketleri"
            onClick={() => {
              setMode("bodyweight");
              void runGenerate([], "bodyweight");
            }}
          />
          <BigChoice
            icon={Dumbbell}
            title="Spor salonunda"
            desc="Aletlerle program oluşturalım"
            onClick={() => {
              setMode("gym");
              setStep("gympath");
            }}
          />
        </Question>
      )}

      {/* SALON ALT-YOLLARI */}
      {step === "gympath" && (
        <Question title="Salonda nasıl ilerleyelim?" onBack={() => setStep("mode")}>
          <BigChoice
            icon={Shuffle}
            title="Karışık program hazırla"
            desc="Tipik salon aletleriyle dengeli bir program kur"
            onClick={() => void runGenerate([], "gym")}
          />
          <BigChoice
            icon={Check}
            title="Aletleri kendim seçeyim"
            desc="Kullanacağın aletleri listeden işaretle"
            onClick={() => {
              setEquipment([]);
              setStep("equipment");
            }}
          />
          <BigChoice
            icon={Camera}
            title="Salonu fotoğrafla"
            desc="Fotoğraf çek, aletleri AI tanısın"
            onClick={() => {
              setEquipment([]);
              setScanNote(null);
              setStep("photo");
            }}
          />
        </Question>
      )}

      {/* EKİPMAN SEÇİMİ */}
      {step === "equipment" && (
        <Question
          title="Hangi aletleri kullanacaksın?"
          onBack={() => setStep("gympath")}
        >
          <div className="space-y-4">
            {EQUIPMENT_OPTIONS.map((grp) => (
              <div key={grp.group}>
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  {grp.group}
                </p>
                <div className="flex flex-wrap gap-2">
                  {grp.items.map((item) => (
                    <Chip
                      key={item}
                      active={equipment.includes(item)}
                      onClick={() => toggleEquip(item)}
                    >
                      {item}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button
            type="button"
            disabled={equipment.length === 0}
            onClick={() => void runGenerate(equipment, "gym")}
            className="mt-5 w-full rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:brightness-105 active:scale-[0.98] disabled:opacity-40"
          >
            {equipment.length} alet seçildi · Programı oluştur →
          </button>
        </Question>
      )}

      {/* FOTOĞRAF */}
      {step === "photo" && (
        <Question title="Salonun fotoğrafını çek" onBack={() => setStep("gympath")}>
          <p className="text-sm text-zinc-400">
            Aletlerin göründüğü 1-4 fotoğraf seç; AI tanıyıp programa katsın.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="mt-3 block w-full text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-lime-400 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-900"
          />
          <button
            type="button"
            onClick={scanGym}
            disabled={scanning}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-lime-400/40 bg-lime-400/10 px-4 py-2.5 text-sm font-semibold text-lime-300 transition hover:bg-lime-400/20 disabled:opacity-60"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {scanning ? "Aletler taranıyor…" : "Fotoğraftan aletleri tanı"}
          </button>

          {scanNote && <p className="mt-3 text-xs text-zinc-400">{scanNote}</p>}

          {equipment.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {equipment.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 rounded-full bg-lime-400/15 px-2.5 py-1 text-xs font-medium text-lime-200"
                >
                  {item}
                  <button
                    type="button"
                    onClick={() => toggleEquip(item)}
                    aria-label={`${item} kaldır`}
                    className="text-lime-300/70 hover:text-lime-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          {scanNote !== null && (
            <button
              type="button"
              onClick={() =>
                void runGenerate(equipment, "gym")
              }
              className="mt-5 w-full rounded-2xl bg-lime-400 px-4 py-3 text-sm font-bold text-zinc-900 transition hover:brightness-105 active:scale-[0.98]"
            >
              {equipment.length > 0
                ? `${equipment.length} aletle programı oluştur →`
                : "Karışık program oluştur →"}
            </button>
          )}
        </Question>
      )}

      {error && step === "mode" && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-7rem)] bg-zinc-950 text-zinc-100">
      <div className="mx-auto w-full max-w-md px-4 py-8">{children}</div>
    </div>
  );
}

function Question({
  title,
  children,
  onBack,
}: {
  title: string;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="step-in space-y-3">
      <div className="rounded-2xl rounded-tl-sm bg-zinc-800 px-4 py-3 text-sm">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-zinc-500 transition hover:text-zinc-300 hover:underline"
        >
          ← Geri
        </button>
      )}
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
        active
          ? "border-lime-400 bg-lime-400/15 text-lime-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500",
      )}
    >
      {children}
    </button>
  );
}

function BigChoice({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-left transition hover:border-lime-400/50 hover:bg-zinc-800/80 active:scale-[0.98]"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-400/15 text-lime-300">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-zinc-400">{desc}</span>
      </span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm font-medium transition active:scale-95",
        active
          ? "border-lime-400 bg-lime-400/20 text-lime-200"
          : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500",
      )}
    >
      {children}
    </button>
  );
}
