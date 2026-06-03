import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/lib/validations/auth";

describe("auth şemaları", () => {
  it("geçerli girişi kabul eder", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "gizli123" }).success,
    ).toBe(true);
  });

  it("kısa şifreyi reddeder", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "123" }).success,
    ).toBe(false);
  });

  it("geçersiz e-postayı reddeder", () => {
    expect(
      loginSchema.safeParse({ email: "gecersiz", password: "gizli123" }).success,
    ).toBe(false);
  });

  it("kayıt için ad soyad ister", () => {
    expect(
      registerSchema.safeParse({
        fullName: "a",
        email: "a@b.com",
        password: "gizli123",
      }).success,
    ).toBe(false);
  });
});
