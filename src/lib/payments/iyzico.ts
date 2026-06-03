import Iyzipay from "iyzipay";

import { SUBSCRIPTION_PRICE, SUBSCRIPTION_TITLE } from "./constants";

let client: Iyzipay | null = null;

function getClient(): Iyzipay {
  if (!client) {
    client = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
    });
  }
  return client;
}

export type CheckoutBuyer = {
  id: string;
  email: string;
  name: string;
  surname: string;
};

/**
 * iyzico Checkout Form başlatır; ödeme sayfası URL'i ve token döndürür.
 * (Callback ile token üzerinden sonuç doğrulanır — ayrı imza/webhook yok.)
 */
export function initializeCheckout(params: {
  conversationId: string;
  callbackUrl: string;
  buyer: CheckoutBuyer;
}): Promise<{ token: string; paymentPageUrl: string }> {
  const iyzipay = getClient();

  const request: Record<string, unknown> = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: params.conversationId,
    price: SUBSCRIPTION_PRICE,
    paidPrice: SUBSCRIPTION_PRICE,
    currency: Iyzipay.CURRENCY.TRY,
    basketId: params.conversationId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
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
        name: SUBSCRIPTION_TITLE,
        category1: "Danışmanlık",
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: SUBSCRIPTION_PRICE,
      },
    ],
  };

  return new Promise((resolve, reject) => {
    iyzipay.checkoutFormInitialize.create(request, (err, result) => {
      if (err) return reject(err);
      if (result.status !== "success" || !result.token || !result.paymentPageUrl) {
        return reject(
          new Error(result.errorMessage ?? "Ödeme başlatılamadı."),
        );
      }
      resolve({ token: result.token, paymentPageUrl: result.paymentPageUrl });
    });
  });
}

/** Token ile ödeme sonucunu sorgular. paymentStatus 'SUCCESS' ise ödeme başarılı. */
export function retrieveCheckout(
  token: string,
): Promise<{ success: boolean }> {
  const iyzipay = getClient();
  return new Promise((resolve, reject) => {
    iyzipay.checkoutForm.retrieve(
      { locale: Iyzipay.LOCALE.TR, token },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          success:
            result.status === "success" && result.paymentStatus === "SUCCESS",
        });
      },
    );
  });
}
