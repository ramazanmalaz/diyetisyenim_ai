// Satıcı / şirket bilgileri — iyzico mağaza onayı ve mesafeli satış mevzuatı için.
//
// ⚠️ AŞAĞIDAKİ ALANLARI GERÇEK BİLGİLERLE DOLDUR.
// Yasal sayfalardaki metinler STANDART ŞABLONdur, hukuki danışmanlık değildir.
// Yayına almadan önce bir avukata/mali müşavire gözden geçirtmen önerilir.

export const COMPANY = {
  /** Ticari unvan ya da şahıs işletmesinde Ad Soyad */
  name: "UzmanDiyet",
  /** Şahıs Şirketi / Limited Şirket / A.Ş. */
  type: "Şahıs Şirketi",
  /** Açık adres (cadde, no, ilçe, il) */
  address: "ASIK VEYSEL MAH. BAGLARBASI CAD. BÜYÜKSARAY APT NO 69/71 IÇ KAPI NO 32 MAMAK /ANKARA",
  /** Vergi dairesi */
  taxOffice: "DİKİMEVİ",
  /** Vergi/TC Kimlik No (VKN veya TCKN) */
  taxNo: "52294422808",
  /** MERSİS No (şirketler için; şahısta boş bırakılabilir) */
  mersis: "",
  /** İletişim telefonu */
  phone: "+905539151278",
  /** İletişim / destek e-postası */
  email: "ramazanmalaz@gmail.com",
  /** KEP adresi (varsa) */
  kep: "",
  website: "uzmandiyet.com",
  brand: "UzmanDiyet",
} as const;

/** Yasal metinlerin son güncellenme tarihi (GG.AA.YYYY) */
export const LAST_UPDATED = "14.06.2026";

type LegalLink = { href: string; label: string };

/**
 * Satışa/ödemeye dair yasal sayfalar. iOS kabuğunda GÖSTERİLMEZ — uygulamada
 * ödeme yoktur, bu bağlantılar reviewer'a "IAP dışı ödeme yönlendirmesi" olarak
 * görünür (Guideline 3.1.1).
 */
export const PAYMENT_LEGAL_LINKS: LegalLink[] = [
  { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/on-bilgilendirme", label: "Ön Bilgilendirme Formu" },
  { href: "/iptal-iade", label: "İptal, İade ve Cayma Hakkı" },
];

/** Her platformda gösterilen yasal sayfalar. */
export const BASE_LEGAL_LINKS: LegalLink[] = [
  { href: "/gizlilik", label: "Gizlilik ve KVKK" },
  { href: "/iletisim", label: "İletişim" },
];

/** Footer + onay kutusunda kullanılan yasal sayfa bağlantıları (web). */
export const LEGAL_LINKS: LegalLink[] = [
  ...PAYMENT_LEGAL_LINKS,
  ...BASE_LEGAL_LINKS,
];
