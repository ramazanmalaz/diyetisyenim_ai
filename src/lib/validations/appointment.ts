import { z } from "zod";

export const appointmentSchema = z.object({
  scheduledAt: z.string().min(1, "Tarih ve saat seçin."),
  notes: z
    .string()
    .max(500)
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export const appointmentStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["requested", "confirmed", "cancelled", "completed"]),
});

export type AppointmentInput = z.infer<typeof appointmentSchema>;
