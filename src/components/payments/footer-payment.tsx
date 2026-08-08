"use client";

import Link from "next/link";

import { PAYMENT_LEGAL_LINKS } from "@/lib/legal";
import { useShowPayments } from "@/lib/use-native-platform";

/**
 * Footer'ın ödemeye dair parçaları. Markup bilerek client tarafında duruyor:
 * <WebOnly> ile server'dan children geçirilirse öğeler RSC payload'ına giriyor
 * ve Next iyzico logosu için <head>'e preload ekliyor — native kabukta görünmese
 * de sayfa kaynağında ödeme izi kalıyordu. Burada sunucu çıktısı tamamen boş.
 */

export function PaymentLegalLinks() {
  if (!useShowPayments()) return null;

  return (
    <>
      {PAYMENT_LEGAL_LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="text-gray-500 transition-colors hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          {l.label}
        </Link>
      ))}
    </>
  );
}

/** iyzico ile Öde — Visa / Mastercard logo bandı (iyzico mağaza onayı kriteri). */
export function IyzicoBand() {
  if (!useShowPayments()) return null;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/iyzico/logo_band_colored.svg"
        alt="iyzico ile Öde — Visa, Mastercard ile güvenli ödeme"
        className="h-7 w-auto dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/iyzico/logo_band_white.svg"
        alt="iyzico ile Öde — Visa, Mastercard ile güvenli ödeme"
        className="hidden h-7 w-auto dark:block"
      />
    </>
  );
}

export function PaymentNote() {
  if (!useShowPayments()) return null;

  return (
    <>
      {" "}
      Ödeme altyapısı <span className="font-medium">iyzico</span> ile sağlanır.
    </>
  );
}
