import { LegalDoc } from "@/components/legal/legal-doc";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "Hesap ve Veri Silme — UzmanDiyet" };

/**
 * Google Play "hesap silme" şartı: uygulamayı kurmadan da açılabilen, silme
 * yolunu ve silinen/saklanan verileri anlatan herkese açık sayfa.
 */
export default function HesapSilmePage() {
  return (
    <LegalDoc title="Hesabını ve Verilerini Silme">
      <p>
        {COMPANY.brand} hesabını ve hesabına bağlı tüm verileri istediğin zaman
        silebilirsin. Silme kalıcıdır ve geri alınamaz.
      </p>

      <h2>Uygulamadan silme</h2>
      <ol>
        <li>
          UzmanDiyet uygulamasında ya da {COMPANY.website} adresinde giriş yap.
        </li>
        <li>
          <strong>Ayarlar</strong> sayfasını aç.
        </li>
        <li>
          En alttaki <strong>Hesabımı sil</strong> düğmesine bas ve onayla.
        </li>
      </ol>

      <h2>Uygulamaya erişemiyorsan</h2>
      <p>
        Kayıtlı e-posta adresinden{" "}
        <a href={`mailto:${COMPANY.email}?subject=Hesap%20silme%20talebi`}>
          {COMPANY.email}
        </a>{" "}
        adresine &quot;Hesap silme talebi&quot; konulu bir e-posta gönder.
        Talebin en geç 30 gün içinde sonuçlandırılır ve sana bilgi verilir.
      </p>

      <h2>Silinen veriler</h2>
      <ul>
        <li>Profil ve giriş bilgilerin (ad, e-posta)</li>
        <li>
          Başlangıç bilgilerin, diyet planın, öğün ve su kayıtların, kilo ve
          ölçülerin, ilerleme fotoğrafların
        </li>
        <li>AI asistan ve grup sohbetlerindeki mesajların</li>
        <li>Spor programın, hatırlatıcıların ve alışveriş listelerin</li>
        <li>
          Apple Sağlık&apos;tan alınan veriler ve bildirim cihaz kayıtların
        </li>
      </ul>

      <h2>Ödeme kayıtları</h2>
      <p>
        UzmanDiyet&apos;teki ödeme geçmişin de hesabınla birlikte silinir. Web
        üzerinden yaptığın ödemelerin işlem kayıtları, ödeme kuruluşu (iyzico)
        tarafından kendi yasal yükümlülükleri kapsamında saklanabilir.
      </p>
    </LegalDoc>
  );
}
