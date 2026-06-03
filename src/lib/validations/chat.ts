import { z } from "zod";

export const messageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1, "Mesaj boş olamaz.").max(4000),
});

export type MessageInput = z.infer<typeof messageSchema>;
