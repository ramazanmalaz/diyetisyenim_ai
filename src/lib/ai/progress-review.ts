import { anthropic, DEFAULT_MODEL } from "./client";
import { SAFETY_GUARDRAILS } from "./guardrails";

import type { PeriodSummary } from "@/lib/health/summary";

/**
 * Gelişim ekranındaki "Değerlendirme" — diyet, spor, hareket, uyku ve kilo
 * verisini birlikte yorumlar. Sayılar sunucuda hesaplanır; model yalnızca
 * yorumlar (sayı uydurmasın diye ham değerler açıkça verilir).
 */

const SYSTEM = `Sen UzmanDiyet'in diyet asistanısın. Kullanıcının son dönem verilerini birlikte yorumlarsın: yenen kalori ve hedef, hareketle yakılan kalori, antrenmanlar, adım, uyku, dinlenik nabız ve kilo.

Yazım:
- Türkçe, samimi, kısa. En fazla 6 madde, her madde tek-iki cümle. Başlık yazma.
- İlk madde genel tablo: bu dönem nasıl geçti (diyet + hareket birlikte).
- Sonra güçlü yanlar ve en fazla 2 somut öneri (örn. "akşam yürüyüşünü 20 dakikaya çıkar", "kahvaltıyı kaçırma").
- Yalnızca VERİLEN sayıları kullan; olmayan veri için tahmin yürütme, "veri yok" de ya da hiç değinme.
- Kilo dalgalanmasını su, tuz, regl, kabızlık gibi normal etkenlerle açıkla; haftalık küçük değişimi abartma.
- Yenen kalori yalnızca kullanıcının "yedim" işaretlediği öğünlerdir; az kayıt varsa bunu nazikçe söyle, "çok az yiyorsun" sonucu çıkarma.
- Dinlenik nabız ve uyku hakkında tıbbi yorum yapma; yalnızca "toparlanma/dinlenme" diliyle ve genel tavsiyeyle değin. Belirgin bir anormallik görürsen doktora danışmasını öner.
- Suçlayıcı olma, motive et.

${SAFETY_GUARDRAILS}`;

function line(
  label: string,
  value: string | number | null,
  unit = "",
): string | null {
  return value == null ? null : `- ${label}: ${value}${unit}`;
}

export function summaryToPrompt(s: PeriodSummary, goal: string | null): string {
  const lines = [
    `Dönem: son ${s.days} gün`,
    goal ? `Kullanıcının hedefi: ${goal}` : null,
    line("Günlük kalori hedefi", s.target, " kcal"),
    `- Yenen kalori kaydı olan gün: ${s.loggedDays}/${s.days}`,
    line("Ortalama yenen (kayıtlı günler)", s.avgConsumed, " kcal"),
    line("Ortalama hareketle yakılan (aktif)", s.avgActive, " kcal"),
    line("Ortalama yenen − aktif yakılan", s.avgNet, " kcal"),
    line("Ortalama adım", s.avgSteps),
    `- Antrenman: ${s.workoutCount} kez, toplam ${s.workoutMinutes} dk`,
    `- Aktif gün (antrenman ya da 7.000+ adım): ${s.activeDays}/${s.days}`,
    line("Ortalama uyku", s.avgSleepHours, " saat"),
    s.restingHrStart != null && s.restingHrEnd != null
      ? `- Dinlenik nabız: dönem başı ~${s.restingHrStart}, dönem sonu ~${s.restingHrEnd} bpm`
      : null,
    s.weightDelta != null
      ? `- Kilo: ${s.weightStart} → ${s.weightEnd} kg (${s.weightDelta > 0 ? "+" : ""}${s.weightDelta} kg)`
      : line("Son tartı", s.weightEnd, " kg"),
    s.hasHealthData
      ? null
      : "- Apple Sağlık verisi yok (adım/uyku/aktif kalori bilinmiyor).",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function reviewProgress(
  s: PeriodSummary,
  goal: string | null,
): Promise<string> {
  const response = await anthropic.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 700,
    system: [
      { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: `${summaryToPrompt(s, goal)}\n\nBu verilere göre kısa değerlendirmemi yaz.`,
      },
    ],
  });
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Değerlendirme üretilemedi.");
  return text;
}
