"use client";

import {
  Dumbbell,
  Home,
  LineChart,
  ListChecks,
  MessageCircle,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import { cn } from "@/lib/utils";

const ITEMS: {
  href: string;
  label: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { href: "/panel", label: "Ana", icon: Home },
  { href: "/plan", label: "Plan", icon: UtensilsCrossed },
  { href: "/spor", label: "Spor", icon: Dumbbell },
  { href: "/sohbet", label: "Sohbet", icon: MessageCircle },
  { href: "/ilerleme", label: "İlerleme", icon: LineChart },
  { href: "/pomodoro", label: "Odak", icon: Timer },
  { href: "/hatirlatici", label: "Hatırlatıcı", icon: ListChecks },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass mx-auto flex max-w-md items-stretch justify-around rounded-2xl px-2 py-1.5 shadow-[var(--shadow-float)]">
        {ITEMS.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-[color,transform] duration-200 ease-[var(--ease-out)] active:scale-[0.94]",
                active
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-[background-color,transform] duration-200 ease-[var(--ease-out)]",
                  active
                    ? "scale-105 bg-emerald-100 dark:bg-emerald-900/50"
                    : "scale-100",
                )}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
