"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { register as registerAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setServerError(null);
    const result = await registerAction(values);
    if (result && "error" in result) {
      setServerError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-2xl border border-gray-200 p-6 text-center dark:border-gray-800">
        <h1 className="text-xl font-semibold">E-postanı kontrol et</h1>
        <p className="text-sm text-gray-500">
          Hesabını doğrulamak için sana bir bağlantı gönderdik. Bağlantıya
          tıkladıktan sonra giriş yapabilirsin.
        </p>
        <Link href="/giris" className="text-sm text-emerald-600 hover:underline">
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 glass rounded-3xl p-6 shadow-[var(--shadow-float)]">
      <div>
        <h1 className="text-xl font-semibold">Hesap oluştur</h1>
        <p className="text-sm text-gray-500">Birkaç saniyede başlayalım.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="fullName">Ad soyad</Label>
          <Input id="fullName" autoComplete="name" {...register("fullName")} />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
          )}
        </div>

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
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Oluşturuluyor..." : "Hesap oluştur"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Zaten hesabın var mı?{" "}
        <Link href="/giris" className="text-emerald-600 hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  );
}
