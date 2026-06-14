import { LegalDoc } from "@/components/legal/legal-doc";
import { COMPANY } from "@/lib/legal";

export const metadata = { title: "İletişim — UzmanDiyet" };

export default function IletisimPage() {
  return (
    <LegalDoc title="İletişim ve Satıcı Bilgileri">
      <p>
        Aşağıdaki bilgiler, {COMPANY.brand} ({COMPANY.website}) üzerinden sunulan
        hizmetlerin satıcısına aittir. Her türlü soru, talep ve şikayet için bize
        ulaşabilirsin.
      </p>

      <h2>Satıcı bilgileri</h2>
      <ul>
        <li>
          <strong>Unvan / Ad Soyad:</strong> {COMPANY.name}
        </li>
        <li>
          <strong>İşletme türü:</strong> {COMPANY.type}
        </li>
        <li>
          <strong>Adres:</strong> {COMPANY.address}
        </li>
        <li>
          <strong>Vergi dairesi / No:</strong> {COMPANY.taxOffice} /{" "}
          {COMPANY.taxNo}
        </li>
        {COMPANY.mersis && (
          <li>
            <strong>MERSİS No:</strong> {COMPANY.mersis}
          </li>
        )}
        <li>
          <strong>Telefon:</strong> {COMPANY.phone}
        </li>
        <li>
          <strong>E-posta:</strong>{" "}
          <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
        </li>
        {COMPANY.kep && (
          <li>
            <strong>KEP:</strong> {COMPANY.kep}
          </li>
        )}
        <li>
          <strong>Web sitesi:</strong> {COMPANY.website}
        </li>
      </ul>

      <h2>Şikayet ve başvuru</h2>
      <p>
        Hizmetle ilgili şikayetlerini yukarıdaki e-posta veya telefon üzerinden
        iletebilirsin. Çözüme ulaşılamaması halinde Tüketici Hakem Heyetleri ve
        Tüketici Mahkemeleri’ne başvurabilirsin.
      </p>
    </LegalDoc>
  );
}
