import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude API istemcisi. API anahtarı YALNIZCA sunucuda kullanılır
 * (Route Handler / Server Action). Asla client'a sızdırma.
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Varsayılan model — maliyet/kalite dengesi (bkz. CLAUDE.md §2). */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Tek yanıtta üretilecek maksimum token. */
export const MAX_TOKENS = 1024;
