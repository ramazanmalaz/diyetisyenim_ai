import { z } from "zod";

// Sağlık'tan gelen kilo kayıtları bu notla işaretlenir: hem kullanıcı görsün
// hem de Sağlık'a geri yazarken kendi verisini geri göndermeyelim.
export const HEALTH_WEIGHT_NOTE = "Apple Sağlık";

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optInt = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).nullable().optional();

/** Apple Sağlık'tan gelen senkron paketi (en fazla ~5 haftalık veri). */
export const healthSyncSchema = z.object({
  days: z
    .array(
      z.object({
        day: dayKey,
        steps: optInt(0, 200_000),
        activeKcal: optInt(0, 20_000),
        sleepMinutes: optInt(0, 1440),
        restingHr: optInt(20, 250),
      }),
    )
    .max(40),
  workouts: z
    .array(
      z.object({
        platformId: z.string().min(1).max(100),
        type: z.string().min(1).max(60),
        startedAt: z.string().datetime({ offset: true }),
        durationMin: z.coerce.number().min(0).max(1440),
        kcal: optInt(0, 20_000),
        distanceM: optInt(0, 1_000_000),
        source: z.string().max(100).nullable().optional(),
      }),
    )
    .max(300),
  weights: z
    .array(z.object({ day: dayKey, kg: z.coerce.number().min(30).max(300) }))
    .max(60),
});

export type HealthSyncInput = z.infer<typeof healthSyncSchema>;

/** Sağlık'a geri yazılacak günlük değerler. */
export type HealthWriteback = {
  kcal: { day: string; value: number }[];
  weights: { day: string; value: number }[];
};
