import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  CreditCard,
  Crown,
  Stethoscope,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type Section = {
  title: string;
  desc: string;
  href: string;
  icon: ComponentType<LucideProps>;
  tint: string;
};

const SECTIONS: Section[] = [
  {
    title: "AI Kuralları",
    desc: "Yapay zekâ diyetisyenin davranışını ayarla.",
    href: "/yonetim/ai-kurallari",
    icon: Bot,
    tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    title: "Diyetisyenler",
    desc: "Profilleri ve randevu saatlerini yönet.",
    href: "/yonetim/diyetisyenler",
    icon: Stethoscope,
    tint: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  {
    title: "Randevular",
    desc: "Gelen randevu taleplerini onayla / yönet.",
    href: "/yonetim/randevular",
    icon: CalendarClock,
    tint: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  {
    title: "Kullanıcılar & Premium",
    desc: "Premium erişim ver, uzat veya kaldır.",
    href: "/yonetim/kullanicilar",
    icon: Users,
    tint: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
  {
    title: "Ödemeler",
    desc: "Abonelik ödemelerini görüntüle.",
    href: "/yonetim/odemeler",
    icon: CreditCard,
    tint: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
  },
  {
    title: "Tarife & Fiyatlandırma",
    desc: "Premium fiyatını ve süresini düzenle.",
    href: "/yonetim/ayarlar",
    icon: Tag,
    tint: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
  },
];

export default async function YonetimPage() {
  const profile = await requireStaff();
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const [users, premium, dietitians, appts] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gt("premium_until", nowIso),
    admin
      .from("dietitians")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", nowIso),
  ]);

  const stats = [
    { label: "Kullanıcı", value: users.count ?? 0, icon: Users },
    { label: "Premium", value: premium.count ?? 0, icon: Crown },
    { label: "Diyetisyen", value: dietitians.count ?? 0, icon: Stethoscope },
    { label: "Yaklaşan randevu", value: appts.count ?? 0, icon: CalendarClock },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 px-4 py-8">
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Yönetim Paneli
        </p>
        <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight">
          Merhaba, {profile.full_name ?? "Diyetisyen"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Uygulamayı ve yapay zekâ diyetisyenini buradan yönet.
        </p>
      </div>

      {/* Hızlı istatistikler */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-900"
            >
              <Icon
                className="h-5 w-5 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2}
              />
              <p className="mt-2 text-2xl font-extrabold tabular-nums">
                {s.value}
              </p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Bölümler */}
      <div>
        <h2 className="mb-3 px-1 text-xs font-semibold tracking-[0.14em] text-gray-400 uppercase">
          Yönetim bölümleri
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.title}
                href={c.href}
                className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-[var(--shadow-soft)] transition-[transform,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-xl ${c.tint}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-gray-300 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-gray-600" />
                </div>
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500">{c.desc}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
