"use client";

import {
  Bot,
  CalendarClock,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Stethoscope,
  Tag,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
  adminOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/yonetim", label: "Panel", icon: LayoutDashboard },
  { href: "/yonetim/danisanlar", label: "Danışanlar", icon: UserPlus },
  { href: "/yonetim/gruplar", label: "Gruplar", icon: UsersRound },
  { href: "/yonetim/planlar", label: "Planlar", icon: ClipboardList },
  { href: "/yonetim/randevular", label: "Randevular", icon: CalendarClock },
  { href: "/yonetim/ai-kurallari", label: "AI", icon: Bot, adminOnly: true },
  {
    href: "/yonetim/diyetisyenler",
    label: "Katalog",
    icon: Stethoscope,
    adminOnly: true,
  },
  {
    href: "/yonetim/kullanicilar",
    label: "Kullanıcılar",
    icon: Users,
    adminOnly: true,
  },
  {
    href: "/yonetim/odemeler",
    label: "Ödemeler",
    icon: CreditCard,
    adminOnly: true,
  },
  { href: "/yonetim/ayarlar", label: "Tarife", icon: Tag, adminOnly: true },
];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => isAdmin || !i.adminOnly);

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 py-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          // "/yonetim" yalnızca tam eşleşmede aktif; diğerleri alt rotalarda da.
          const active =
            href === "/yonetim"
              ? pathname === "/yonetim"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
