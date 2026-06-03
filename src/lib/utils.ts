import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind sınıflarını koşullu birleştirip çakışmaları çözer (shadcn standardı). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
