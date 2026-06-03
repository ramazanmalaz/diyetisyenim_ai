import { expect, test } from "@playwright/test";

test("ana sayfa açılır ve harekete geçirici bağlantıları gösterir", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hemen başla" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Giriş yap" })).toBeVisible();
});

test("giriş sayfası açılır", async ({ page }) => {
  await page.goto("/giris");
  await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
  await expect(page.getByLabel("E-posta")).toBeVisible();
});

test("kayıt sayfası açılır", async ({ page }) => {
  await page.goto("/kayit");
  await expect(
    page.getByRole("heading", { name: "Hesap oluştur" }),
  ).toBeVisible();
});

test("oturumsuz panel ziyareti girişe yönlendirir", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/giris/);
});
