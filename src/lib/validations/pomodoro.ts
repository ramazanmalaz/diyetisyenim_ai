import { z } from "zod";

import { hhmmToMin } from "@/lib/pomodoro";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Pomodoro plan formu — sunucu tarafında doğrulanır. */
export const pomodoroPlanSchema = z
  .object({
    start: z.string().regex(TIME_RE, "Geçerli bir başlangıç saati gir."),
    end: z.string().regex(TIME_RE, "Geçerli bir bitiş saati gir."),
    workMin: z.coerce
      .number()
      .int()
      .min(5, "Çalışma süresi en az 5 dk olmalı.")
      .max(180, "Çalışma süresi en fazla 180 dk olabilir."),
    breakMin: z.coerce
      .number()
      .int()
      .min(0)
      .max(60, "Mola en fazla 60 dk olabilir."),
  })
  .refine((v) => hhmmToMin(v.end) > hhmmToMin(v.start), {
    message: "Bitiş saati başlangıçtan sonra olmalı.",
    path: ["end"],
  })
  .refine((v) => hhmmToMin(v.end) - hhmmToMin(v.start) >= v.workMin, {
    message: "Pencere en az bir çalışma seansına yetmeli.",
    path: ["workMin"],
  });

export type PomodoroPlanInput = z.infer<typeof pomodoroPlanSchema>;
