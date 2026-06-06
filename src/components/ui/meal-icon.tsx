import {
  Apple,
  Cookie,
  Egg,
  Salad,
  UtensilsCrossed,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

import type { MealType } from "@/types/database";

const ICONS: Record<MealType, ComponentType<LucideProps>> = {
  breakfast: Egg,
  snack_morning: Apple,
  lunch: Salad,
  snack_afternoon: Cookie,
  dinner: UtensilsCrossed,
};

export function MealIcon({
  type,
  className,
}: {
  type: MealType;
  className?: string;
}) {
  const Icon = ICONS[type];
  return <Icon className={className} strokeWidth={2} />;
}
