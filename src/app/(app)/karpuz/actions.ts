"use server";

import { z } from "zod";

import type { ImageMediaType } from "@/lib/ai/respond";
import { analyzeWatermelon, type WatermelonResult } from "@/lib/ai/watermelon";
import { getUser } from "@/lib/auth";

const schema = z.object({
  // data URL değil, saf base64 (öneki client'ta ayrılır)
  imageBase64: z.string().min(100).max(9_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  servings: z.string().min(1).max(40),
});

export type WatermelonActionResult =
  | { error: string }
  | { ok: true; result: WatermelonResult };

export async function scanWatermelon(
  values: unknown,
): Promise<WatermelonActionResult> {
  const user = await getUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    return { error: "Geçersiz görüntü." };
  }

  try {
    const result = await analyzeWatermelon({
      imageBase64: parsed.data.imageBase64,
      mediaType: parsed.data.mediaType as ImageMediaType,
      servings: parsed.data.servings,
    });
    return { ok: true, result };
  } catch (err) {
    console.error("[karpuz] analiz hatası:", err);
    return { error: "Şu anda analiz yapılamıyor, lütfen tekrar dene." };
  }
}
