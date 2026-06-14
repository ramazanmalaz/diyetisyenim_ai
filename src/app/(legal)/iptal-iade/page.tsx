import { LegalDoc } from "@/components/legal/legal-doc";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "İptal, İade ve Cayma Hakkı — UzmanDiyet" };

export default function IptalIadePage() {
  return (
    <LegalDoc title="İptal, İade ve Cayma Hakkı">
      <p>
        {COMPANY.brand} premium üyeliği <strong>dijital bir hizmettir</strong> ve
        ödemenin onaylanmasının hemen ardından kullanıcı hesabına anında
        tanımlanır.
      </p>

      <h2>Cayma hakkı</h2>
      <p>
        Mesafeli Sözleşmeler Yönetmeliği md. 15/1-(ğ) uyarınca, tüketicinin onayı
        ile ifasına başlanan ve elektronik ortamda anında ifa edilen hizmetlerde{" "}
        <strong>cayma hakkı kullanılamaz</strong>. Premium erişim ödeme sonrası
        anında açıldığından, hizmet başladıktan sonra 14 günlük cayma hakkı
        uygulanmaz. Kullanıcı, ödemeyi onaylayarak bunu kabul eder.
      </p>

      <h2>Üyelik iptali</h2>
      <ul>
        <li>
          Premium üyelik tek seferlik ödeme ile 30 gün geçerlidir ve{" "}
          <strong>otomatik yenilenmez</strong>; ayrıca iptal işlemine gerek
          kalmadan süre sonunda kendiliğinden ücretsiz plana döner.
        </li>
        <li>
          Süre dolmadan kullanmayı bırakmak istersen premium özelliklerini
          kullanmamayı seçebilirsin; kalan süre için kısmi ücret iadesi yapılmaz
          (hizmet anında ifa edilen dijital hizmet niteliğindedir).
        </li>
      </ul>

      <h2>İade yapılabilecek haller</h2>
      <p>Aşağıdaki durumlarda ücret iadesi yapılır:</p>
      <ul>
        <li>
          Teknik bir hata nedeniyle ödeme alındığı halde premium erişimin
          tanımlanmaması.
        </li>
        <li>Aynı hizmet için mükerrer (çift) çekim yapılması.</li>
        <li>Yetkisiz/hatalı çekim yapıldığının tespit edilmesi.</li>
      </ul>

      <h2>İade süreci</h2>
      <p>
        İade talebini{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> adresine, ödeme
        tarihini ve hesabını belirterek iletebilirsin. Uygun bulunan iadeler,
        ödemenin yapıldığı karta/banka hesabına, talebin onaylanmasından itibaren
        yasal süre içinde (genellikle 14 gün içinde) iyzico üzerinden yansıtılır.
        Bankadan kaynaklı yansıma süreleri değişebilir.
      </p>

      <h2>İletişim</h2>
      <p>
        İptal/iade ile ilgili her soru için: {COMPANY.email} · {COMPANY.phone}.
      </p>
    </LegalDoc>
  );
}
