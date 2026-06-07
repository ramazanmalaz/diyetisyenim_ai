"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { updatePassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  newPasswordSchema,
  type NewPasswordInput,
} from "@/lib/validations/auth";

export default function NewPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordInput>({ resolver: zodResolver(newPasswordSchema) });

  async function onSubmit(values: NewPasswordInput) {
    setServerError(null);
    const result = await updatePassword(values);
    if (result && "error" in result) {
      setServerError(result.error);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/panel"), 1500);
  }

  if (done) {
    return (
      <div className="space-y-3 glass rounded-3xl p-6 text-center shadow-[var(--shadow-float)]">
        <h1 className="text-xl font-semibold">Şifren güncellendi</h1>
        <p className="text-sm text-gray-500">
          Yeni şifrenle giriş yaptın, yönlendiriliyorsun…
        </p>
        <Link href="/panel" className="text-sm text-emerald-600 hover:underline">
          Panele git
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 glass rounded-3xl p-6 shadow-[var(--shadow-float)]">
      <div>
        <h1 className="text-xl font-semibold">Yeni şifre belirle</h1>
        <p className="text-sm text-gray-500">
          Hesabın için yeni bir şifre gir.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="password">Yeni şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm">Yeni şifre (tekrar)</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            {...register("confirm")}
          />
          {errors.confirm && (
            <p className="mt-1 text-sm text-red-600">{errors.confirm.message}</p>
          )}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Güncelleniyor…" : "Şifreyi güncelle"}
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
