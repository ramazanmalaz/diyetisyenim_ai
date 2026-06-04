"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  resetRequestSchema,
} from "@/lib/validations/auth";

export type ActionResult = { error: string } | { success: true };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function login(values: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş." };
  }

  const supabase = await createClient();
  const { data: signInData, error } =
    await supabase.auth.signInWithPassword(parsed.data);
  if (error || !signInData.user) {
    return { error: "E-posta veya şifre hatalı." };
  }

  // Role göre yönlendir. Personel tüm profilleri görebildiği için (RLS),
  // sorguyu mutlaka kullanıcının kendi id'siyle filtrele — aksi halde .single() patlar.
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", signInData.user.id)
    .single();

  const role = data?.role ?? "client";
  redirect(role === "client" ? "/panel" : "/yonetim");
}

export async function register(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz giriş." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${APP_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: "Kayıt başarısız. Bu e-posta zaten kayıtlı olabilir." };
  }

  return { success: true };
}

export async function requestPasswordReset(
  values: unknown,
): Promise<ActionResult> {
  const parsed = resetRequestSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Geçersiz e-posta." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${APP_URL}/auth/confirm?next=/sifre-yenile` },
  );

  if (error) {
    return { error: "İşlem başarısız. Lütfen tekrar deneyin." };
  }

  return { success: true };
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}
