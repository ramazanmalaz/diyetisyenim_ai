"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/panel", label: "Ana", icon: "🏠" },
  { href: "/plan", label: "Plan", icon: "🍽️" },
  { href: "/sohbet", label: "Sohbet", icon: "💬" },
  { href: "/ilerleme", label: "İlerleme", icon: "📊" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="glass mx-auto flex max-w-md items-stretch justify-around rounded-2xl px-2 py-1.5 shadow-[var(--shadow-float)]">
        {ITEMS.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition",
                active
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-base transition",
                  active && "bg-emerald-100 dark:bg-emerald-900/50",
                )}
              >
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
