"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { createPlan } from "@/app/(admin)/yonetim/planlar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createPlanSchema,
  type CreatePlanInput,
} from "@/lib/validations/plan";

type ClientOption = { id: string; full_name: string | null };

export function CreatePlanForm({ clients }: { clients: ClientOption[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePlanInput>({ resolver: zodResolver(createPlanSchema) });

  async function onSubmit(values: CreatePlanInput) {
    setServerError(null);
    const result = await createPlan(values);
    if (result && "error" in result) setServerError(result.error);
    // Başarılıysa server action plan detayına yönlendirir.
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="clientId">Danışan</Label>
        <select
          id="clientId"
          {...register("clientId")}
          className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-950"
          defaultValue=""
        >
          <option value="" disabled>
            Danışan seç…
          </option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name ?? c.id}
            </option>
          ))}
        </select>
        {errors.clientId && (
          <p className="mt-1 text-sm text-red-600">{errors.clientId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="title">Plan başlığı</Label>
        <Input
          id="title"
          placeholder="Örn. Haziran Dengeli Beslenme"
          {...register("title")}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="validFrom">Başlangıç (ops.)</Label>
          <Input id="validFrom" type="date" {...register("validFrom")} />
        </div>
        <div>
          <Label htmlFor="validTo">Bitiş (ops.)</Label>
          <Input id="validTo" type="date" {...register("validTo")} />
        </div>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Oluşturuluyor…" : "Plan oluştur"}
      </Button>
    </form>
  );
}
