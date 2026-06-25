import type AnthropicNS from "@anthropic-ai/sdk";
import { z } from "zod";

import type { ImageMediaType } from "@/lib/ai/respond";
import type { WorkoutProgram } from "@/lib/workout";

import { anthropic, DEFAULT_MODEL } from "./client";

// Sınırlar geçerli AI içeriğini reddetmeyecek kadar geniş tutulur (dar cap'ler
// "Program oluşturulamadı" hatasına yol açıyordu — özellikle uzun genel not).
const exerciseSchema = z.object({
  name: z.string().min(1).max(200),
  enName: z.string().max(120).optional().default(""),
  sets: z.coerce.number().int().min(1).max(20),
  reps: z.string().min(1).max(80),
  rest: z.string().max(80).optional().default("60 sn"),
  note: z.string().max(600).optional().default(""),
});
const programSchema = z.object({
  days: z
    .array(
      z.object({
        day: z.string().min(1).max(120),
        focus: z.string().max(200).optional().default(""),
        exercises: z.array(exerciseSchema).min(1).max(15),
      }),
    )
    .min(1)
    .max(7),
  note: z.string().max(4000).optional().default(""),
});

const PROGRAM_TOOL: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    days: {
      type: "array",
      description: "Haftalık antrenman günleri.",
      items: {
        type: "object",
        properties: {
          day: { type: "string", description: "Örn. '1. Gün'" },
          focus: { type: "string", description: "Günün odağı, örn. 'İtiş — göğüs/omuz'" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Egzersiz adı (Türkçe)" },
                enName: {
                  type: "string",
                  description:
                    "Egzersizin kısa, standart İngilizce adı (GIF/video araması için). Örn. 'incline bench press', 'lat pulldown'.",
                },
                sets: { type: "integer", description: "Set sayısı" },
                reps: { type: "string", description: "Tekrar, örn. '8-12' ya da '30 sn'" },
                rest: { type: "string", description: "Setler arası dinlenme, örn. '60 sn'" },
                note: { type: "string", description: "Kısa form ipucu (opsiyonel)" },
              },
              required: ["name", "sets", "reps"],
            },
          },
        },
        required: ["day", "exercises"],
      },
    },
    note: { type: "string", description: "Programa dair kısa genel not (ısınma, ilerleme vb.)" },
  },
  required: ["days"],
};

export type WorkoutGenInput = {
  mode: "bodyweight" | "gym";
  level: string;
  goal: string;
  daysPerWeek: number;
  equipment: string[]; // gym + ekipman seçildiyse; boşsa AI serbest kurar
  intakeSummary: string;
};

/** AI ile yapılandırılmış haftalık antrenman programı üretir. */
export async function generateWorkoutProgram(
  p: WorkoutGenInput,
): Promise<WorkoutProgram> {
  const equipLine =
    p.mode === "gym"
      ? p.equipment.length > 0
        ? `Spor salonu. SADECE şu mevcut aletleri/ekipmanı kullan: ${p.equipment.join(", ")}. Bunların dışında alet gerektiren hareket verme.`
        : "Spor salonu. Tipik bir salonda bulunan serbest ağırlık + makinelerden dengeli, karışık bir program kur."
      : "Ev / kendi vücut ağırlığı. Hiçbir alet gerektirmeyen (gerekirse direnç bandı) hareketler kullan.";

  const system =
    "Sen deneyimli bir antrenman koçusun. Güvenli, kademeli ilerleyen, kişiye uygun programlar kurarsın. Tıbbi tavsiye vermezsin; ağrı/sakatlık sinyalinde profesyonele yönlendirirsin. Yanıtı YALNIZCA save_workout aracıyla ver.";

  const prompt = `Aşağıdaki kişi için haftada ${p.daysPerWeek} günlük bir antrenman programı kur.
- Yer/ekipman: ${equipLine}
- Her gün için odak + 4-6 egzersiz (set, tekrar, dinlenme).
- Her egzersiz için "enName" alanına kısa, standart İngilizce adını yaz (GIF/video araması için; örn. "incline bench press").
- ÖZ VE KISA yaz: egzersiz "note" alanlarını boş bırak ya da en fazla 5-6 kelimelik tek ipucu. Genel "note" en fazla 2 kısa cümle (ısınma + ilerleme).
- Seviyeye ve hedefe uygun, gerçekçi ol.

Kişi: ${p.intakeSummary}
Programı save_workout ile döndür.`;

  const res = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    // 5-7 günlük programlar 4096'yı aşıp JSON kesiliyordu (parse hatası →
    // "program oluşturulamadı"). 8192 ile güvenli pay bırakılır.
    max_tokens: 8192,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    tools: [{ name: "save_workout", description: "Antrenman programını kaydeder.", input_schema: PROGRAM_TOOL }],
    tool_choice: { type: "tool", name: "save_workout" },
    messages: [{ role: "user", content: prompt }],
  });
  const tool = res.content.find((b) => b.type === "tool_use");
  if (tool?.type !== "tool_use") throw new Error("Program üretilemedi.");
  return programSchema.parse(tool.input);
}

const EQUIP_TOOL: AnthropicNS.Tool.InputSchema = {
  type: "object",
  properties: {
    equipment: {
      type: "array",
      description: "Fotoğraf(lar)da net görünen spor aleti/ekipman adları (Türkçe).",
      items: { type: "string" },
    },
    note: { type: "string", description: "Kısa not (okuma güveni vb.)" },
  },
  required: ["equipment"],
};

const equipResultSchema = z.object({
  equipment: z.array(z.string().min(1).max(160)).max(40),
  note: z.string().max(400).optional().default(""),
});

/** Spor salonu fotoğraf(lar)ından alet/ekipman adlarını çıkarır (vision). */
export async function analyzeGymEquipment(params: {
  images: { base64: string; mediaType: ImageMediaType }[];
}): Promise<{ equipment: string[]; note: string }> {
  const res = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 1024,
    tools: [{ name: "save_equipment", description: "Görülen ekipmanı kaydeder.", input_schema: EQUIP_TOOL }],
    tool_choice: { type: "tool", name: "save_equipment" },
    messages: [
      {
        role: "user",
        content: [
          ...params.images.map(
            (img) =>
              ({
                type: "image",
                source: { type: "base64", media_type: img.mediaType, data: img.base64 },
              }) as const,
          ),
          {
            type: "text",
            text: "Bu fotoğraf(lar) bir spor salonunu gösteriyor. Net görebildiğin spor aletlerini/ekipmanı Türkçe adlarıyla listele (örn. leg press, koşu bandı, dambıl, lat pulldown). Emin olmadıklarını ekleme. Yalnızca save_equipment aracını çağır.",
          },
        ],
      },
    ],
  });
  const tool = res.content.find((b) => b.type === "tool_use");
  if (tool?.type !== "tool_use") throw new Error("Aletler okunamadı.");
  return equipResultSchema.parse(tool.input);
}
