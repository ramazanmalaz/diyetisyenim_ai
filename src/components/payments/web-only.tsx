"use client";

import type { ReactNode } from "react";

import { useShowPayments } from "@/lib/use-native-platform";

/**
 * Çocuklarını YALNIZCA web tarayıcısında render eder; native (iOS) kabukta
 * `fallback` gösterir. Ödeme/premium arayüzünü App Store incelemesinden
 * tamamen uzak tutmak için kullanılır — bkz. useShowPayments (fail-closed).
 */
export function WebOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useShowPayments() ? <>{children}</> : <>{fallback}</>;
}
