import type { ActivityLevel, Sex } from "@/types/database";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

const KCAL_PER_KG = 7700; // ~1 kg yağ
const MAX_WEEKLY_LOSS_KG = 1.0; // güvenli üst sınır
const MIN_CALORIES: Record<Sex, number> = { female: 1200, male: 1500 };

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: "Hareketsiz (masa başı)",
  light: "Hafif aktif (haftada 1-3 gün)",
  moderate: "Orta aktif (haftada 3-5 gün)",
  active: "Çok aktif (haftada 6-7 gün)",
};

export type CaloriePlan = {
  tdee: number; // günlük enerji ihtiyacı
  dailyTarget: number; // hedef günlük kalori
  weeklyLossKg: number; // uygulanan güvenli haftalık kayıp
  estimatedWeeks: number; // hedefe ulaşma süresi
  capped: boolean; // istenen hız güvenli sınıra çekildi mi
};

/**
 * Mifflin-St Jeor ile TDEE, ardından güvenli kalori açığı ve tahmini süre.
 * İstenen kayıp hızı haftada 1 kg'ı aşarsa güvenli sınıra çekilir (capped).
 */
export function computeCaloriePlan(input: {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goalLossKg: number;
  goalWeeks: number;
}): CaloriePlan {
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.age +
    (input.sex === "male" ? 5 : -161);
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[input.activity]);

  const requestedWeekly = input.goalLossKg / input.goalWeeks;
  const weeklyLoss = Math.min(requestedWeekly, MAX_WEEKLY_LOSS_KG);
  const capped = requestedWeekly > MAX_WEEKLY_LOSS_KG;

  const dailyDeficit = (weeklyLoss * KCAL_PER_KG) / 7;
  let dailyTarget = Math.round((tdee - dailyDeficit) / 10) * 10;
  const floor = MIN_CALORIES[input.sex];
  if (dailyTarget < floor) dailyTarget = floor;

  // Kalori tabana çekildiyse gerçek haftalık kayıp daha düşük olur.
  const realDailyDeficit = Math.max(tdee - dailyTarget, 0);
  const realWeekly = (realDailyDeficit * 7) / KCAL_PER_KG;
  const estimatedWeeks =
    realWeekly > 0 ? Math.ceil(input.goalLossKg / realWeekly) : input.goalWeeks;

  return {
    tdee,
    dailyTarget,
    weeklyLossKg: Math.round(realWeekly * 10) / 10,
    estimatedWeeks,
    capped,
  };
}
