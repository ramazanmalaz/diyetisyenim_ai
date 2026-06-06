"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const result = await login(values);
    if (result && "error" in result) setServerError(result.error);
    // Başarılıysa server action /panel veya /yonetim'e yönlendirir.
  }

  return (
    <div className="space-y-5 glass rounded-3xl p-6 shadow-[var(--shadow-float)]">
      <div>
        <h1 className="text-xl font-semibold">Giriş yap</h1>
        <p className="text-sm text-gray-500">Hesabına erişmek için giriş yap.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link href="/sifre-sifirla" className="text-emerald-600 hover:underline">
          Şifremi unuttum
        </Link>
        <Link href="/kayit" className="text-emerald-600 hover:underline">
          Hesap oluştur
        </Link>
      </div>
    </div>
  );
}
