import { describe, expect, it } from "vitest";

import { SAFETY_GUARDRAILS } from "@/lib/ai/guardrails";
import { buildSystemPrompt } from "@/lib/ai/prompt";

describe("buildSystemPrompt", () => {
  it("kural olmasa da güvenlik guardrail'lerini her zaman içerir", () => {
    expect(buildSystemPrompt(null)).toContain(SAFETY_GUARDRAILS);
  });

  it("diyetisyen kurallarını guardrail'lerden ÖNCE koyar (guardrail son söz)", () => {
    const out = buildSystemPrompt("Az tuz öner.");
    expect(out).toContain("Az tuz öner.");
    expect(out.indexOf("Az tuz öner.")).toBeLessThan(
      out.indexOf(SAFETY_GUARDRAILS),
    );
  });

  it("boş/whitespace kuralları yok sayar", () => {
    expect(buildSystemPrompt("   ")).toBe(SAFETY_GUARDRAILS);
  });
});
