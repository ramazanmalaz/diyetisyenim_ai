import { PricingEditor } from "@/components/admin/pricing-editor";
import { requireStaff } from "@/lib/auth";
import { getPricing } from "@/lib/settings";

export const metadata = { title: "Tarife & Fiyatlandırma — Yönetim" };

export default async function AyarlarPage() {
  await requireStaff();
  const pricing = await getPricing();

  return (
    <div className="mx-auto w-full max-w-lg space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">Tarife & Fiyatlandırma</h1>
        <p className="text-gray-500">
          Premium fiyatını, başlığını ve erişim süresini buradan ayarla.
          Değişiklik abonelik ve sözleşme sayfalarına anında yansır.
        </p>
      </div>
      <PricingEditor
        initial={{
          price: pricing.price,
          title: pricing.title,
          premiumDays: pricing.premiumDays,
        }}
      />
    </div>
  );
}
