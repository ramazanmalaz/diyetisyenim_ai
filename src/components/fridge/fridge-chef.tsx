"use client";

import {
  ChefHat,
  ChevronDown,
  Clock,
  Flame,
  ImagePlus,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingBasket,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import { suggestRecipes } from "@/app/(app)/dolap/actions";
import type { FridgeRecipe, FridgeResult } from "@/lib/ai/fridge";
import {
  FRIDGE_MAX_PHOTOS,
  FRIDGE_MEAL_OPTIONS,
  type FridgeMeal,
} from "@/lib/fridge-options";
import { downscaleImage } from "@/lib/image-downscale";
import { triggerPremiumWall } from "@/lib/premium-wall";
import { cn } from "@/lib/utils";

type Photo = { id: string; blob: Blob; url: string };

// Fotoğrafların hepsi tek istekte gidiyor; sunucu gövde sınırının altında
// kalsın diye her biri 1024 px'e küçültülür.
const PHOTO_EDGE = 1024;

export function FridgeChef() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [meal, setMeal] = useState<FridgeMeal>("any");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FridgeResult | null>(null);
  const [open, setOpen] = useState<number | null>(0);

  function addDraft() {
    const parts = draft
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length === 0) return;
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.toLocaleLowerCase("tr")));
      const next = [...prev];
      for (const p of parts) {
        if (!seen.has(p.toLocaleLowerCase("tr"))) {
          next.push(p);
          seen.add(p.toLocaleLowerCase("tr"));
        }
      }
      return next;
    });
    setDraft("");
  }

  function removeItem(name: string) {
    setItems((prev) => prev.filter((p) => p !== name));
  }

  async function onPickPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const picked = files.slice(
      0,
      Math.max(0, FRIDGE_MAX_PHOTOS - photos.length),
    );
    const added: Photo[] = [];
    let failed = false;
    for (const file of picked) {
      try {
        const blob = await downscaleImage(file, PHOTO_EDGE);
        added.push({
          id: crypto.randomUUID(),
          blob,
          url: URL.createObjectURL(blob),
        });
      } catch {
        failed = true;
      }
    }
    setPhotos((prev) => [...prev, ...added].slice(0, FRIDGE_MAX_PHOTOS));
    if (failed) {
      setError("Bazı fotoğraflar okunamadı, başka bir fotoğraf dene.");
    } else if (files.length > picked.length) {
      setError(`En fazla ${FRIDGE_MAX_PHOTOS} fotoğraf ekleyebilirsin.`);
    } else {
      setError(null);
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
  }

  async function submit() {
    if (loading) return;
    // Yazılıp eklenmemiş metni de dahil et.
    const all = [...items];
    const pending = draft.trim();
    if (pending) all.push(pending);
    if (all.length === 0 && photos.length === 0) {
      setError("Birkaç malzeme yaz ya da dolabının fotoğrafını ekle.");
      return;
    }

    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("ingredients", all.join(", "));
    fd.set("meal", meal);
    photos.forEach((p, i) => fd.append("photo", p.blob, `dolap-${i + 1}.jpg`));

    try {
      const res = await suggestRecipes(fd);
      if ("quota" in res) {
        triggerPremiumWall(photos.length > 0 ? "vision" : "chat");
        return;
      }
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setResult(res.result);
      setOpen(res.result.recipes.length > 0 ? 0 : null);
      // Fotoğraftan okunanlar artık çip: yanlışı silip yeniden önerebilir
      // (tekrar fotoğraf göndermeye gerek yok).
      if (res.result.ingredients.length > 0) setItems(res.result.ingredients);
      setDraft("");
      clearPhotos();
    } catch {
      setError("Şu anda tarif önerilemiyor, lütfen tekrar dene.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-6 px-4 py-8">
      <div className="text-center">
        <span className="reveal inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-emerald-700 uppercase ring-1 ring-black/5 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-white/10">
          <ChefHat className="h-3.5 w-3.5" strokeWidth={1.75} /> Dolabımda ne
          var?
        </span>
        <h1 className="reveal mt-3 text-3xl font-extrabold tracking-tight text-balance">
          Elindekilerle diyetine uygun ne pişer?
        </h1>
        <p className="reveal mx-auto mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
          Malzemeleri yaz ya da dolabının fotoğraflarını çek; kalori hedefine
          uygun tarifler önereyim.
        </p>
      </div>

      {/* Öğün */}
      <div className="reveal">
        <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
          Hangi öğün için?
        </p>
        <div className="flex flex-wrap gap-2">
          {FRIDGE_MEAL_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setMeal(o.value)}
              aria-pressed={meal === o.value}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.96]",
                meal === o.value
                  ? "bg-emerald-600 text-white shadow-[0_8px_18px_-10px_rgb(11_109_72/0.7)]"
                  : "bg-white/70 text-gray-600 ring-1 ring-black/5 hover:bg-white dark:bg-white/5 dark:text-gray-300 dark:ring-white/10",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Malzemeler */}
      <div className="reveal space-y-3 rounded-[1.5rem] bg-white/70 p-4 shadow-[var(--shadow-soft)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
        <label
          htmlFor="fridge-input"
          className="block text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          Malzemeler
        </label>
        <div className="flex gap-2">
          <input
            id="fridge-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addDraft();
              }
            }}
            placeholder="ör. yumurta, domates, lor"
            maxLength={200}
            className="min-w-0 flex-1 rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm ring-1 ring-black/5 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 dark:bg-white/5 dark:ring-white/10"
          />
          <button
            type="button"
            onClick={addDraft}
            aria-label="Malzemeyi ekle"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-500 active:scale-[0.94] dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {items.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((it) => (
              <li key={it}>
                <button
                  type="button"
                  onClick={() => removeItem(it)}
                  aria-label={`${it} malzemesini çıkar`}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 py-1 pr-2 pl-3 text-sm text-emerald-900 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-500 active:scale-[0.96] dark:bg-emerald-950/40 dark:text-emerald-100"
                >
                  {it}
                  <X className="h-3.5 w-3.5 opacity-60" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Fotoğraflar: dolabın, kilerin, tezgâhın farklı bölümleri */}
        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 px-4 py-3 text-sm font-medium text-emerald-700 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-500 active:scale-[0.98] dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
            Dolabın fotoğraflarını ekle
          </button>
        ) : (
          <div>
            <ul className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <li key={p.id} className="relative aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={`Dolap fotoğrafı ${i + 1}`}
                    className="h-full w-full rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label={`${i + 1}. fotoğrafı kaldır`}
                    className="absolute -top-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/80 text-white ring-2 ring-white transition-transform duration-200 ease-[var(--ease-out)] hover:bg-gray-900 focus-visible:outline-2 focus-visible:outline-emerald-500 active:scale-[0.9] dark:ring-gray-900"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </li>
              ))}
              {photos.length < FRIDGE_MAX_PHOTOS && (
                <li className="aspect-square">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label="Fotoğraf ekle"
                    className="flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-emerald-300 text-emerald-700 transition-[background-color,transform] duration-200 ease-[var(--ease-out)] hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-500 active:scale-[0.96] dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                  >
                    <Plus className="h-5 w-5" strokeWidth={2} />
                    <span className="text-[10px] font-medium">Ekle</span>
                  </button>
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {photos.length}/{FRIDGE_MAX_PHOTOS} fotoğraf · dolabın, kilerin,
              tezgâhın farklı yerlerini çekebilirsin
            </p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={onPickPhotos}
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="reveal flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_1px_2px_rgb(7_40_29/0.2),0_12px_28px_-10px_rgb(11_109_72/0.6)] transition-[transform,opacity] duration-200 ease-[var(--ease-out)] hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            Tarifler hazırlanıyor…
          </>
        ) : result ? (
          <>
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Bu malzemelerle yeniden öner
          </>
        ) : (
          <>
            <ChefHat className="h-4 w-4" strokeWidth={2} />
            Tarif öner
          </>
        )}
      </button>

      {loading && (
        <p className="-mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          Malzemelerine bakıp 3 tarif hazırlıyorum, yarım dakika sürebilir.
        </p>
      )}

      {error && (
        <p className="reveal rounded-2xl bg-rose-50 px-4 py-3 text-center text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3">
          {result.ingredients.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Yanlış okunan malzeme varsa yukarıdan çıkarıp yeniden öner.
            </p>
          )}
          {result.note && (
            <p className="step-in flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              {result.note}
            </p>
          )}
          {result.recipes.map((r, i) => (
            <RecipeCard
              key={`${r.title}-${i}`}
              recipe={r}
              open={open === i}
              onToggle={() => setOpen((v) => (v === i ? null : i))}
            />
          ))}
          {result.recipes.length > 0 && (
            <p className="px-1 text-center text-[11px] text-gray-400">
              Kalori ve besin değerleri yaklaşıktır; tıbbi tavsiye değildir.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RecipeCard({
  recipe: r,
  open,
  onToggle,
}: {
  recipe: FridgeRecipe;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="step-in overflow-hidden rounded-[1.5rem] bg-white/70 shadow-[var(--shadow-float)] ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full p-5 text-left transition-[background-color] duration-200 ease-[var(--ease-out)] hover:bg-black/[0.02] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-emerald-500 dark:hover:bg-white/[0.03]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg leading-snug font-bold">{r.title}</h2>
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform duration-200 ease-[var(--ease-out)]",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <Flame className="h-3.5 w-3.5" strokeWidth={2} />
            {r.kcal_per_serving} kcal / porsiyon
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
            {r.time_min} dk
          </span>
          <span className="tabular-nums">
            P {Math.round(r.protein_g)} · K {Math.round(r.carb_g)} · Y{" "}
            {Math.round(r.fat_g)} g
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {r.why_fits}
        </p>
        {r.missing.length > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <ShoppingBasket className="h-3.5 w-3.5" strokeWidth={1.75} />
            Eksik: {r.missing.join(", ")}
          </p>
        )}
      </button>

      {open && (
        <div className="step-in space-y-4 border-t border-black/5 px-5 pt-4 pb-5 dark:border-white/10">
          <div>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Malzemeler{r.servings > 1 ? ` (${r.servings} porsiyon)` : ""}
            </h3>
            <ul className="space-y-1 text-sm">
              {r.ingredients.map((ing, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-500" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
              Yapılışı
            </h3>
            <ol className="space-y-2 text-sm">
              {r.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 dark:text-gray-200">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </article>
  );
}
