import { type NextRequest } from "next/server";

import { streamDietAnswer } from "@/lib/ai/respond";
import { getActiveDietitianRules } from "@/lib/ai/rules";
import { getUser } from "@/lib/auth";
import {
  getAssistantConversationId,
  logAssistantMessage,
} from "@/lib/chat/assistant";
import { consumeAiCredit, upgradeMessage } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatRequestSchema } from "@/lib/validations/ai";

/**
 * Diyet asistanı streaming endpoint'i.
 * Yalnızca oturum açmış kullanıcılar erişebilir. Yanıt düz metin akışı olarak döner.
 *
 * Kullanıcı mesajı ve üretilen AI yanıtı denetlenebilirlik için (§5) kullanıcının
 * asistan konuşmasına kaydedilir (best-effort; akışı bozmaz).
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

  // Kalıcılık (denetlenebilirlik) — başarısız olursa yanıt yine de döner.
  const admin = createAdminClient();
  const conversationId = await getAssistantConversationId(admin, user.id).catch(
    () => null,
  );
  if (conversationId) {
    const lastUser = [...parsed.data.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUser) {
      await logAssistantMessage(admin, conversationId, {
        type: "user",
        content: lastUser.content,
        senderId: user.id,
      });
    }
  }

  const rules = await getActiveDietitianRules();
  const stream = streamDietAnswer(parsed.data.messages, rules);

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            answer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (e) {
        console.error("[ai] yanıt akışı hatası:", e instanceof Error ? e.message : e);
        controller.enqueue(
          encoder.encode("\n\n[Yanıt üretilirken bir hata oluştu.]"),
        );
      } finally {
        // AI yanıtını kapatmadan ÖNCE kaydet ki invocation sonlanmasın.
        if (conversationId && answer.trim()) {
          await logAssistantMessage(admin, conversationId, {
            type: "ai",
            content: answer,
            senderId: null,
          });
        }
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
