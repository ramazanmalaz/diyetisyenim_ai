"use client";

import { ArrowRight, Bot, Sparkles, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import type {
  ComponentType,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import type { LucideProps } from "lucide-react";

type Theme = {
  /** açık tint yüzey + aksan rampası */
  blob: string;
  iconWrap: string;
  eyebrow: string;
  cta: string;
  ring: string;
};

const THEMES: Record<"ai" | "human", Theme> = {
  ai: {
    blob: "bg-emerald-300/45",
    iconWrap: "bg-emerald-100 text-emerald-700",
    eyebrow: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    cta: "bg-emerald-600 text-white",
    ring: "hover:ring-emerald-500/30",
  },
  human: {
    blob: "bg-amber-300/45",
    iconWrap: "bg-amber-100 text-amber-700",
    eyebrow: "bg-amber-50 text-amber-700 ring-amber-600/15",
    cta: "bg-amber-500 text-white",
    ring: "hover:ring-amber-500/30",
  },
};

type Choice = {
  href: string;
  eyebrow: string;
  title: string;
  desc: string;
  cta: string;
  icon: ComponentType<LucideProps>;
  theme: "ai" | "human";
  withSparkle?: boolean;
};

const CHOICES: Choice[] = [
  {
    href: "/baslangic/ai",
    eyebrow: "Yapay Zekâ",
    title: "AI Asistanla\nDiyete Başla",
    desc: "Birkaç soruyla sana özel program ve günlük kalori hedefi anında hazırlanır.",
    cta: "Hemen başla",
    icon: Bot,
    theme: "ai",
    withSparkle: true,
  },
  {
    href: "/diyetisyen-bul",
    eyebrow: "Uzman Kadro",
    title: "Diyetisyen\nBul",
    desc: "Uzman diyetisyenleri incele, uygun saate randevu al ve süreci birlikte yürüt.",
    cta: "Diyetisyenleri gör",
    icon: Stethoscope,
    theme: "human",
  },
];

export function HomeChoices() {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {CHOICES.map((c, i) => (
        <ChoiceCard key={c.href} choice={c} index={i} />
      ))}
    </div>
  );
}

function ChoiceCard({ choice, index }: { choice: Choice; index: number }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const Icon = choice.icon;
  const t = THEMES[choice.theme];

  // İnce 3D eğilme — fareyle (JS, --rx/--ry). Hareket azaltmada devre dışı.
  function onMove(e: ReactPointerEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(px - 0.5) * 6}deg`);
    el.style.setProperty("--ry", `${(0.5 - py) * 5}deg`);
  }

  function onLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <Link
      ref={ref}
      href={choice.href}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={
        {
          "--rx": "0deg",
          "--ry": "0deg",
          animationDelay: `${index * 90}ms`,
        } as CSSProperties
      }
      className={`tilt-card group reveal relative block overflow-hidden rounded-[1.75rem] bg-white p-7 shadow-[var(--shadow-float)] ring-1 ring-black/5 transition-[box-shadow,transform] duration-[400ms] ease-[var(--ease-drawer)] dark:bg-gray-900/70 dark:ring-white/10 ${t.ring}`}
    >
      {/* Süzülen yumuşak aksan halesi */}
      <span
        aria-hidden
        className={`orb-a pointer-events-none absolute -top-16 -right-10 h-48 w-48 rounded-full blur-3xl ${t.blob}`}
      />

      <div className="relative flex h-full flex-col">
        {/* İkon + eyebrow */}
        <div className="flex items-center justify-between">
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-transform duration-[400ms] ease-[var(--ease-drawer)] group-hover:-translate-y-0.5 group-hover:scale-105 ${t.iconWrap}`}
          >
            <Icon style={{ width: 28, height: 28 }} strokeWidth={1.5} />
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.16em] uppercase ring-1 ${t.eyebrow}`}
          >
            {choice.withSparkle && (
              <Sparkles className="h-3 w-3" strokeWidth={1.5} />
            )}
            {choice.eyebrow}
          </span>
        </div>

        {/* Başlık + açıklama */}
        <h2 className="mt-7 text-2xl leading-tight font-extrabold tracking-tight whitespace-pre-line">
          {choice.title}
        </h2>
        <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">
          {choice.desc}
        </p>

        {/* CTA — aksan dolgulu pill, hover'da ok kayar */}
        <span
          className={`mt-7 inline-flex w-fit items-center gap-2 rounded-full py-2 pr-2 pl-4 text-sm font-semibold shadow-[0_8px_20px_-10px_rgb(0_0_0/0.4)] ${t.cta}`}
        >
          {choice.cta}
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-[400ms] ease-[var(--ease-drawer)] group-hover:translate-x-1">
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </span>
        </span>
      </div>
    </Link>
  );
}
