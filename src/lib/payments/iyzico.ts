import crypto from "node:crypto";

// iyzico Checkout Form — doğrudan REST + HMAC (IYZWSv2) çağrısı.
//
// Not: Resmî `iyzipay` SDK'sı `postman-request` üzerinden ~70 paketlik bir
// bağımlılık ağacını DİNAMİK require ediyor; Next/Vercel file-tracing bunu
// güvenilir paketleyemiyor (resources/postman-request/psl … "Cannot find module"
// hataları). SDK'nın imza algoritması burada birebir uygulanır; ağ çağrısı fetch
// ile yapılır — hiçbir harici çalışma-zamanı bağımlılığı yok.

const BASE_URL = process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com";
const API_KEY = process.env.IYZICO_API_KEY ?? "";
const SECRET_KEY = process.env.IYZICO_SECRET_KEY ?? "";
const CLIENT_VERSION = "iyzipay-node-2.0.67";

const INIT_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
const DETAIL_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";

/** "99" → "99.0" (iyzico fiyat formatı; SDK formatPrice ile aynı). */
function formatPrice(price: string | number): string {
  const n = parseFloat(String(price));
  if (!isFinite(n)) return String(price);
  const s = n.toString();
  return s.includes(".") ? s : s + ".0";
}

/** IYZWSv2 yetkilendirme başlığı (SDK generateHashV2 ile birebir). */
function authHeaderV2(uriPath: string, bodyStr: string, randomKey: string): string {
  const signature = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(randomKey + uriPath + bodyStr)
    .digest("hex");
  const params = [
    `apiKey:${API_KEY}`,
    `randomKey:${randomKey}`,
    `signature:${signature}`,
  ].join("&");
  return "IYZWSv2 " + Buffer.from(params).toString("base64");
}

async function iyziPost<T>(uriPath: string, body: unknown): Promise<T> {
  // İmza ile gönderilen gövde BİREBİR aynı string olmalı (iyzico randomKey +
  // uri + ham gövde ile yeniden hashler) — bu yüzden tek sefer stringify edip
  // hem imzada hem istekte kullanıyoruz.
  const bodyStr = JSON.stringify(body);
  const randomKey = `${Date.now()}${crypto.randomBytes(6).toString("hex")}`;

  const res = await fetch(BASE_URL + uriPath, {
    method: "POST",
    headers: {
      Authorization: authHeaderV2(uriPath, bodyStr, randomKey),
      "x-iyzi-rnd": randomKey,
      "x-iyzi-client-version": CLIENT_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: bodyStr,
  });
  return (await res.json()) as T;
}

export type CheckoutBuyer = {
  id: string;
  email: string;
  name: string;
  surname: string;
};

type InitResponse = {
  status?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl?: string;
};

/**
 * iyzico Checkout Form başlatır; ödeme sayfası URL'i ve token döndürür.
 * (Callback ile token üzerinden sonuç doğrulanır — ayrı imza/webhook yok.)
 */
export async function initializeCheckout(params: {
  conversationId: string;
  callbackUrl: string;
  buyer: CheckoutBuyer;
  price: string;
  title: string;
}): Promise<{ token: string; paymentPageUrl: string }> {
  const price = formatPrice(params.price);
  const body = {
    locale: "tr",
    conversationId: params.conversationId,
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: params.conversationId,
    paymentGroup: "SUBSCRIPTION",
    callbackUrl: params.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: params.buyer.id,
      name: params.buyer.name,
      surname: params.buyer.surname,
      email: params.buyer.email,
      gsmNumber: "+905350000000",
      identityNumber: "11111111111",
      registrationAddress: "Türkiye",
      ip: "127.0.0.1",
      city: "İstanbul",
      country: "Türkiye",
    },
    billingAddress: {
      contactName: `${params.buyer.name} ${params.buyer.surname}`.trim(),
      city: "İstanbul",
      country: "Türkiye",
      address: "Türkiye",
    },
    basketItems: [
      {
        id: "subscription-monthly",
        name: params.title,
        category1: "Danışmanlık",
        itemType: "VIRTUAL",
        price,
      },
    ],
  };

  const result = await iyziPost<InitResponse>(INIT_PATH, body);
  if (result.status !== "success" || !result.token || !result.paymentPageUrl) {
    throw new Error(result.errorMessage ?? "Ödeme başlatılamadı.");
  }
  return { token: result.token, paymentPageUrl: result.paymentPageUrl };
}

type DetailResponse = { status?: string; paymentStatus?: string };

/** Token ile ödeme sonucunu sorgular. paymentStatus 'SUCCESS' ise ödeme başarılı. */
export async function retrieveCheckout(
  token: string,
): Promise<{ success: boolean }> {
  const result = await iyziPost<DetailResponse>(DETAIL_PATH, {
    locale: "tr",
    token,
  });
  return {
    success: result.status === "success" && result.paymentStatus === "SUCCESS",
  };
}
