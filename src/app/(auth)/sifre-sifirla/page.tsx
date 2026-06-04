"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetRequestSchema,
  type ResetRequestInput,
} from "@/lib/validations/auth";

export default function ResetPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetRequestInput>({ resolver: zodResolver(resetRequestSchema) });

  async function onSubmit(values: ResetRequestInput) {
    setServerError(null);
    const result = await requestPasswordReset(values);
    if (result && "error" in result) {
      setServerError(result.error);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-2xl border border-gray-200 p-6 text-center dark:border-gray-800">
        <h1 className="text-xl font-semibold">Bağlantı gönderildi</h1>
        <p className="text-sm text-gray-500">
          Şifre sıfırlama bağlantısını e-postana gönderdik.
        </p>
        <Link href="/giris" className="text-sm text-emerald-600 hover:underline">
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-[var(--shadow-soft)] dark:border-gray-800 dark:bg-gray-950">
      <div>
        <h1 className="text-xl font-semibold">Şifreni sıfırla</h1>
        <p className="text-sm text-gray-500">
          E-postanı gir, sana sıfırlama bağlantısı gönderelim.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="email">E-posta</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Gönderiliyor..." : "Bağlantı gönder"}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        <Link href="/giris" className="text-emerald-600 hover:underline">
          Giriş sayfasına dön
        </Link>
      </p>
    </div>
  );
}
