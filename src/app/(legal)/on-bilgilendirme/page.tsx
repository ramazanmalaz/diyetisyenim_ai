import { LegalDoc } from "@/components/legal/legal-doc";
import { COMPANY } from "@/lib/legal";
import { getPricing } from "@/lib/settings";

export const metadata = { title: "Ön Bilgilendirme Formu — UzmanDiyet" };

export default async function OnBilgilendirmePage() {
  const pricing = await getPricing();
  return (
    <LegalDoc title="Ön Bilgilendirme Formu">
      <p>
        İşbu form, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli
        Sözleşmeler Yönetmeliği uyarınca, ödeme işlemi öncesinde tüketicinin
        bilgilendirilmesi amacıyla hazırlanmıştır.
      </p>

      <h2>1. Satıcı</h2>
      <ul>
        <li>
          <strong>Unvan:</strong> {COMPANY.name}
        </li>
        <li>
          <strong>Adres:</strong> {COMPANY.address}
        </li>
        <li>
          <strong>E-posta / Telefon:</strong> {COMPANY.email} · {COMPANY.phone}
        </li>
      </ul>

      <h2>2. Hizmetin nitelikleri ve fiyatı</h2>
      <ul>
        <li>
          <strong>Hizmet:</strong> {pricing.title} — {COMPANY.brand} dijital
          premium üyeliği (sınırsız AI sohbet ve fotoğraf/tabak analizi dahil).
        </li>
        <li>
          <strong>Süre:</strong> {pricing.premiumDays} gün (tek seferlik ödeme;
          otomatik yenileme yoktur).
        </li>
        <li>
          <strong>Fiyat:</strong> {pricing.price} ₺ (KDV dahil).
        </li>
        <li>
          <strong>Ödeme şekli:</strong> Kredi/banka kartı ile iyzico güvenli
          ödeme altyapısı üzerinden tek çekim.
        </li>
      </ul>

      <h2>3. İfa (teslimat)</h2>
      <p>
        Hizmet dijitaldir; ödemenin onaylanmasının hemen ardından premium erişim
        kullanıcı hesabına anında tanımlanır. Fiziksel teslimat yoktur.
      </p>

      <h2>4. Cayma hakkı</h2>
      <p>
        Mesafeli Sözleşmeler Yönetmeliği md. 15/1-(ğ) uyarınca, tüketicinin onayı
        ile ifasına başlanan ve elektronik ortamda anında ifa edilen hizmetlerde
        cayma hakkı kullanılamaz. Hizmeti başlatmadan önce ödemeyi onaylayarak bu
        durumu kabul etmiş olursun. Ayrıntılar için{" "}
        <a href="/iptal-iade">İptal, İade ve Cayma Hakkı</a> sayfasına bak.
      </p>

      <h2>5. Şikayet ve uyuşmazlık</h2>
      <p>
        Şikayetlerini {COMPANY.email} adresine iletebilirsin. Uyuşmazlık halinde
        Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.
      </p>
    </LegalDoc>
  );
}
