import Link from "next/link";

import {
  IyzicoBand,
  PaymentLegalLinks,
  PaymentNote,
} from "@/components/payments/footer-payment";
import { BASE_LEGAL_LINKS, COMPANY } from "@/lib/legal";

/**
 * Ödemeye dair her şey (iyzico bandı, satış sözleşmeleri, ödeme cümlesi)
 * client tarafında ve yalnızca web'de render edilir: iOS kabuğunda uygulama içi
 * satın alma yok, dolayısıyla ödeme referansı da olamaz (Guideline 3.1.1).
 */
export function Footer() {
  return (
    <footer className="border-t border-black/5 bg-white/60 px-4 py-4 sm:py-8 dark:border-white/10 dark:bg-gray-950/40">
      <div className="mx-auto max-w-3xl space-y-2 sm:space-y-4">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] sm:gap-x-5 sm:gap-y-2 sm:text-sm">
          <PaymentLegalLinks />
          {BASE_LEGAL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-gray-500 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <IyzicoBand />

        <p className="text-xs text-gray-400">
          {/* Şahıs işletmesinde marka ile ticari unvan aynı olabiliyor;
              aynıysa tek kez yazılır. */}
          © {COMPANY.brand}
          {COMPANY.name !== COMPANY.brand ? ` · ${COMPANY.name}` : ""} · Tüm
          hakları saklıdır.
          <PaymentNote />
        </p>
      </div>
    </footer>
  );
}
