import Link from "next/link";

import { COMPANY, LEGAL_LINKS } from "@/lib/legal";

export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/60 px-4 py-8 dark:border-white/10 dark:bg-gray-950/40">
      <div className="mx-auto max-w-3xl space-y-4">
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-gray-500 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-gray-400">
          © {COMPANY.brand} · {COMPANY.name} · Tüm hakları saklıdır. Ödeme
          altyapısı <span className="font-medium">iyzico</span> ile sağlanır.
        </p>
      </div>
    </footer>
  );
}
