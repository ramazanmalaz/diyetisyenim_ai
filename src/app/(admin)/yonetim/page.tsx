import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Crown,
  Stethoscope,
  Tag,
  UserPlus,
  Users,
  UsersRound,
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
  adminOnly?: boolean;
};

const SECTIONS: Section[] = [
  {
    title: "Danışanlarım",
    desc: "Danışan ekle, plan ata, ilerlemesini takip et.",
    href: "/yonetim/danisanlar",
    icon: UserPlus,
    tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    title: "Gruplar",
    desc: "Danışanları grupla, gruba toplu mesaj at.",
    href: "/yonetim/gruplar",
    icon: UsersRound,
    tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    title: "Planlar",
    desc: "Diyet programı oluştur ve öğünlerini düzenle.",
    href: "/yonetim/planlar",
    icon: ClipboardList,
    tint: "bg-lime-100 text-lime-700 dark:bg-lime-950/50 dark:text-lime-300",
  },
  {
    title: "Randevular",
    desc: "Gelen randevu taleplerini onayla / yönet.",
    href: "/yonetim/randevular",
    icon: CalendarClock,
    tint: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  {
    title: "AI Kuralları",
    desc: "Yapay zekâ asistanın davranışını ayarla.",
    href: "/yonetim/ai-kurallari",
    icon: Bot,
    tint: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    adminOnly: true,
  },
  {
    title: "Diyetisyen Kataloğu",
    desc: "Herkese açık diyetisyen profillerini yönet.",
    href: "/yonetim/diyetisyenler",
    icon: Stethoscope,
    tint: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    adminOnly: true,
  },
  {
    title: "Kullanıcılar & Premium",
    desc: "Rol değiştir, premium erişim ver veya kaldır.",
    href: "/yonetim/kullanicilar",
    icon: Users,
    tint: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    adminOnly: true,
  },
  {
    title: "Ödemeler",
    desc: "Abonelik ödemelerini görüntüle.",
    href: "/yonetim/odemeler",
    icon: CreditCard,
    tint: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    adminOnly: true,
  },
  {
    title: "Tarife & Fiyatlandırma",
    desc: "Premium fiyatını ve süresini düzenle.",
    href: "/yonetim/ayarlar",
    icon: Tag,
    tint: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300",
    adminOnly: true,
  },
];

export default async function YonetimPage() {
  const profile = await requireStaff();
  const isAdmin = profile.role === "admin";
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Diyetisyen kendi danışanlarının, admin sistemin tamamının sayılarını görür.
  const clientsQuery = admin
    .from("profiles")
    .select("id", { count: "exact", head: true });
  const premiumQuery = admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gt("premium_until", nowIso);
  const groupsQuery = admin
    .from("client_groups")
    .select("id", { count: "exact", head: true });
  const apptQuery = admin
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .gte("scheduled_at", nowIso);

  if (!isAdmin) {
    clientsQuery.eq("dietitian_id", profile.id);
    premiumQuery.eq("dietitian_id", profile.id);
    groupsQuery.eq("dietitian_id", profile.id);
    apptQuery.eq("dietitian_id", profile.id);
  } else {
    clientsQuery.eq("role", "client");
  }

  const [clients, premium, groups, appts] = await Promise.all([
    clientsQuery,
    premiumQuery,
    groupsQuery,
    apptQuery,
  ]);

  const stats = [
    { label: isAdmin ? "Danışan" : "Danışanım", value: clients.count ?? 0, icon: Users },
    { label: "Premium", value: premium.count ?? 0, icon: Crown },
    { label: "Grup", value: groups.count ?? 0, icon: UsersRound },
    { label: "Yaklaşan randevu", value: appts.count ?? 0, icon: CalendarClock },
  ];

  const sections = SECTIONS.filter((s) => isAdmin || !s.adminOnly);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 px-4 py-8">
      <div>
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {isAdmin ? "Yönetim Paneli" : "Diyetisyen Paneli"}
        </p>
        <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight">
          Merhaba, {profile.full_name ?? "Diyetisyen"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin
            ? "Uygulamayı ve yapay zekâ asistanını buradan yönet."
            : "Danışanlarını, gruplarını ve programlarını buradan yönet."}
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
          {sections.map((c) => {
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
