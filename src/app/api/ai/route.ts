import { type NextRequest } from "next/server";

import { streamDietAnswer } from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import { consumeAiCredit, upgradeMessage } from "@/lib/entitlements";
import { chatRequestSchema } from "@/lib/validations/ai";

/**
 * Diyet asistanı streaming endpoint'i.
 * Yalnızca oturum açmış kullanıcılar erişebilir. Yanıt düz metin akışı olarak döner.
 *
 * TODO (Aşama 2): Kullanıcı ve AI mesajları `messages` tablosuna (type='user'/'ai')
 * kaydedilecek; şu an sohbet tabloları henüz yok.
 */
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response("Yetkisiz erişim.", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Geçersiz istek.", { status: 400 });
  }

  // Freemium: ücretsiz kullanıcının günlük mesaj hakkı (premium sınırsız).
  const credit = await consumeAiCredit(user.id, "chat");
  if (!credit.ok) {
    return new Response(upgradeMessage("chat"), {
      status: 402,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const rules = await getActiveDietitianRules();
  const stream = streamDietAnswer(parsed.data.messages, rules);

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode("\n\n[Yanıt üretilirken bir hata oluştu.]"),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
