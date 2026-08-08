import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * App Store Guideline 3.1.1 regresyon testi (08.08.2026 reddi):
 * iOS kabuğundan gelen isteklerde uygulama ne ücretli içerik açabilir ne de
 * kullanıcıyı IAP dışı bir ödeme yöntemine yönlendirebilir.
 */

const userAgent = vi.hoisted(() => ({ value: "" }));

vi.mock("next/headers", () => ({
  headers: () =>
    Promise.resolve({ get: (k: string) => (k === "user-agent" ? userAgent.value : null) }),
}));

const profile = vi.hoisted(() => ({ premium_until: null as string | null }));

vi.mock("@/lib/supabase/admin", () => {
  const maybeSingle = () => Promise.resolve({ data: profile });
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle,
  };
  return {
    createAdminClient: () => ({
      from: (table: string) =>
        table === "profiles" ? chain : { ...chain, maybeSingle: () => Promise.resolve({ data: null }) },
    }),
  };
});

const NATIVE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) UzmanDiyetiOS";
const WEB_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15";

const { getEntitlement, upgradeMessage } = await import("@/lib/entitlements");

describe("iOS kabuğunda premium", () => {
  beforeEach(() => {
    // Web'de satın alınmış, hâlâ geçerli bir abonelik.
    profile.premium_until = new Date(Date.now() + 7 * 864e5).toISOString();
  });

  it("web'de açık kalır", async () => {
    userAgent.value = WEB_UA;
    const ent = await getEntitlement("u1");
    expect(ent.isPremium).toBe(true);
    expect(ent.premiumUntil).not.toBeNull();
  });

  it("native'de kapalıdır — uygulama dışı satın alma uygulamada açılamaz", async () => {
    userAgent.value = NATIVE_UA;
    const ent = await getEntitlement("u1");
    expect(ent.isPremium).toBe(false);
    expect(ent.premiumUntil).toBeNull();
  });
});

describe("kota dolduğunda gösterilen metin", () => {
  it("web'de premium sayfasına yönlendirir", async () => {
    userAgent.value = WEB_UA;
    expect(await upgradeMessage("chat")).toContain("/abonelik");
  });

  it("native'de ödemeye dair hiçbir iz taşımaz", async () => {
    userAgent.value = NATIVE_UA;
    const msg = await upgradeMessage("vision");
    expect(msg).not.toMatch(/abonelik|premium|₺|satın al|öde/i);
    expect(msg).toContain("yenilenecek");
  });
});
