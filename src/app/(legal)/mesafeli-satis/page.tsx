import { LegalDoc } from "@/components/legal/legal-doc";
import { COMPANY } from "@/lib/legal";
import { getPricing } from "@/lib/settings";

export const metadata = { title: "Mesafeli Satış Sözleşmesi — UzmanDiyet" };

export default async function MesafeliSatisPage() {
  const pricing = await getPricing();
  return (
    <LegalDoc title="Mesafeli Satış Sözleşmesi">
      <h2>1. Taraflar</h2>
      <p>
        İşbu sözleşme; bir tarafta <strong>SATICI</strong> ({COMPANY.name},{" "}
        {COMPANY.address}, {COMPANY.email}, {COMPANY.phone}) ile diğer tarafta,
        {COMPANY.website} üzerinden hizmet satın alan <strong>ALICI</strong>{" "}
        (tüketici) arasında, aşağıdaki şartlarla elektronik ortamda
        akdedilmiştir.
      </p>

      <h2>2. Konu</h2>
      <p>
        İşbu sözleşmenin konusu, ALICI’nın {COMPANY.brand} platformu üzerinden
        elektronik ortamda satın aldığı, aşağıda nitelikleri ve satış fiyatı
        belirtilen dijital hizmetin satışı ve ifasına ilişkin tarafların hak ve
        yükümlülüklerinin belirlenmesidir.
      </p>

      <h2>3. Hizmet bilgileri</h2>
      <ul>
        <li>
          <strong>Hizmet:</strong> {pricing.title} — dijital premium üyelik.
        </li>
        <li>
          <strong>Süre:</strong> {pricing.premiumDays} gün (tek seferlik;
          otomatik yenileme yoktur).
        </li>
        <li>
          <strong>Fiyat:</strong> {pricing.price} ₺ (KDV dahil).
        </li>
        <li>
          <strong>Ödeme:</strong> Kredi/banka kartı ile iyzico üzerinden tek
          çekim.
        </li>
      </ul>

      <h2>4. Genel hükümler</h2>
      <ul>
        <li>
          ALICI, hizmetin temel niteliklerini, satış fiyatını ve ödeme şeklini
          okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli teyidi
          verdiğini kabul eder.
        </li>
        <li>
          ALICI, işbu sözleşmeyi ve Ön Bilgilendirme Formu’nu elektronik ortamda
          onayladığını kabul eder.
        </li>
      </ul>

      <h2>5. İfa (teslimat)</h2>
      <p>
        Hizmet dijitaldir. Ödemenin onaylanmasının hemen ardından premium erişim
        ALICI’nın hesabına anında tanımlanır; fiziki teslimat söz konusu
        değildir.
      </p>

      <h2>6. Cayma hakkı</h2>
      <p>
        Mesafeli Sözleşmeler Yönetmeliği md. 15/1-(ğ) gereğince, tüketicinin onayı
        ile ifasına başlanan ve elektronik ortamda anında ifa edilen hizmetlerde
        cayma hakkı bulunmamaktadır. ALICI, hizmeti başlatmak için ödemeyi
        onaylayarak cayma hakkının kullanılamayacağını kabul eder. İptal ve iade
        koşulları <a href="/iptal-iade">İptal, İade ve Cayma Hakkı</a> sayfasında
        düzenlenmiştir.
      </p>

      <h2>7. Mücbir sebep</h2>
      <p>
        Tarafların kontrolü dışında gelişen, makul önlemlerle önlenemeyen olaylar
        (doğal afet, altyapı/iletişim kesintileri, hukuki düzenlemeler vb.)
        nedeniyle yükümlülüklerin ifa edilememesi halinde taraflar sorumlu
        tutulamaz.
      </p>

      <h2>8. Uyuşmazlıkların çözümü</h2>
      <p>
        İşbu sözleşmeden doğabilecek uyuşmazlıklarda, Gümrük ve Ticaret
        Bakanlığı’nca ilan edilen parasal sınırlar dahilinde ALICI’nın yerleşim
        yerindeki Tüketici Hakem Heyetleri ile Tüketici Mahkemeleri yetkilidir.
      </p>

      <h2>9. Yürürlük</h2>
      <p>
        ALICI’nın elektronik ortamda ödemeyi onaylaması ile işbu sözleşme
        taraflar arasında yürürlüğe girer.
      </p>
    </LegalDoc>
  );
}
