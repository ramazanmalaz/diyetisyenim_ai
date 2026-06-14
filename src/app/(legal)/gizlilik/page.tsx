import { LegalDoc } from "@/components/legal/legal-doc";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "Gizlilik ve KVKK — UzmanDiyet" };

export default function GizlilikPage() {
  return (
    <LegalDoc title="Gizlilik Politikası ve KVKK Aydınlatma Metni">
      <p>
        {COMPANY.brand} olarak kişisel verilerinin güvenliğine önem veriyoruz. Bu
        metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında
        veri işleme faaliyetlerimiz hakkında seni bilgilendirmek için
        hazırlanmıştır.
      </p>

      <h2>1. Veri sorumlusu</h2>
      <p>
        {COMPANY.name} — {COMPANY.address} · {COMPANY.email}
      </p>

      <h2>2. İşlenen kişisel veriler</h2>
      <ul>
        <li>
          <strong>Kimlik & iletişim:</strong> ad-soyad, e-posta.
        </li>
        <li>
          <strong>Sağlık ve beslenme verileri (özel nitelikli):</strong> yaş,
          boy, kilo, ölçüler, aktivite düzeyi, sağlık notları, diyet planı,
          öğün/ilerleme fotoğrafları, su tüketimi gibi veriler.
        </li>
        <li>
          <strong>Kullanım verileri:</strong> uygulama içi etkileşimler, AI
          sohbet içerikleri.
        </li>
        <li>
          <strong>Ödeme verileri:</strong> ödeme işlemi iyzico üzerinden yürütülür;
          kart bilgilerin tarafımızca <strong>saklanmaz</strong>.
        </li>
      </ul>

      <h2>3. İşleme amaçları</h2>
      <ul>
        <li>Kişiye özel diyet/kalori takibi ve AI asistan hizmetinin sunulması.</li>
        <li>Üyelik, ödeme ve premium erişimin yönetilmesi.</li>
        <li>Destek taleplerinin karşılanması ve yasal yükümlülüklerin yerine getirilmesi.</li>
      </ul>

      <h2>4. Hukuki sebep ve açık rıza</h2>
      <p>
        Sağlık verileri <strong>özel nitelikli kişisel veri</strong> olup, yalnızca{" "}
        <strong>açık rızan</strong> ile, sana beslenme/diyet takip hizmeti sunmak
        amacıyla işlenir. Açık rızanı dilediğin zaman geri çekebilirsin; bu
        durumda ilgili hizmet sunulamayabilir.
      </p>

      <h2>5. Aktarım ve yurt dışı aktarım</h2>
      <p>
        Hizmetin sunulabilmesi için verilerin aşağıdaki tedarikçilerin altyapısında
        işlenebilir/saklanabilir; bu aktarımlar KVKK md. 9 kapsamında ve açık rızan
        doğrultusunda gerçekleştirilir:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — veritabanı, kimlik doğrulama ve dosya
          depolama (yurt dışı sunucular).
        </li>
        <li>
          <strong>Anthropic (Claude)</strong> — AI sohbet ve fotoğraf analizi için
          gönderilen içerik (yurt dışı).
        </li>
        <li>
          <strong>iyzico</strong> — ödeme işlemleri.
        </li>
        <li>
          <strong>Vercel</strong> — uygulama barındırma.
        </li>
      </ul>

      <h2>6. Saklama süresi</h2>
      <p>
        Veriler, hizmetin sunulduğu süre boyunca ve ilgili yasal saklama süreleri
        kadar tutulur; hesabını sildirdiğinde veya talebin üzerine mevzuata uygun
        şekilde silinir/anonim hale getirilir.
      </p>

      <h2>7. Haklarınız (KVKK md. 11)</h2>
      <p>
        Kişisel verilerine ilişkin; işlenip işlenmediğini öğrenme, bilgi talep
        etme, düzeltilmesini/silinmesini isteme, aktarıldığı üçüncü kişileri
        öğrenme ve işleme itiraz etme haklarına sahipsin. Taleplerini{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> adresine
        iletebilirsin.
      </p>

      <h2>8. Çerezler</h2>
      <p>
        Uygulama; oturum açma ve temel işlevler için zorunlu çerezler/yerel
        depolama kullanır. Bunlar hizmetin çalışması için gereklidir.
      </p>
    </LegalDoc>
  );
}
