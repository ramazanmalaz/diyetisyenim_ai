// iyzipay paketi TS tipleri içermez. Kullandığımız yüzeyin minimal bildirimi.
declare module "iyzipay" {
  interface IyzipayOptions {
    apiKey?: string;
    secretKey?: string;
    uri?: string;
  }

  interface IyzipayResult {
    status?: string; // "success" | "failure"
    errorMessage?: string;
    errorCode?: string;
    conversationId?: string;
    token?: string;
    checkoutFormContent?: string;
    paymentPageUrl?: string;
    paymentStatus?: string; // "SUCCESS" | "FAILURE" | ...
    [key: string]: unknown;
  }

  type IyzipayCallback = (err: Error | null, result: IyzipayResult) => void;

  class Iyzipay {
    constructor(options: IyzipayOptions);
    checkoutFormInitialize: {
      create(request: Record<string, unknown>, cb: IyzipayCallback): void;
    };
    checkoutForm: {
      retrieve(request: Record<string, unknown>, cb: IyzipayCallback): void;
    };

    static LOCALE: { TR: string; EN: string };
    static CURRENCY: { TRY: string; EUR: string; USD: string; GBP: string };
    static PAYMENT_GROUP: {
      PRODUCT: string;
      LISTING: string;
      SUBSCRIPTION: string;
    };
    static BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string };
  }

  export = Iyzipay;
}
