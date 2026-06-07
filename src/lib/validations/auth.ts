import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalı."),
  email: z.string().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
});

export const resetRequestSchema = z.object({
  email: z.string().email("Geçerli bir e-posta girin."),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
    confirm: z.string().min(6, "Şifre en az 6 karakter olmalı."),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Şifreler eşleşmiyor.",
    path: ["confirm"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
