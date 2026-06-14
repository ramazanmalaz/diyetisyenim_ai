// Satıcı / şirket bilgileri — iyzico mağaza onayı ve mesafeli satış mevzuatı için.
//
// ⚠️ AŞAĞIDAKİ ALANLARI GERÇEK BİLGİLERLE DOLDUR.
// Yasal sayfalardaki metinler STANDART ŞABLONdur, hukuki danışmanlık değildir.
// Yayına almadan önce bir avukata/mali müşavire gözden geçirtmen önerilir.

export const COMPANY = {
  /** Ticari unvan ya da şahıs işletmesinde Ad Soyad */
  name: "[Ticari unvan / Ad Soyad]",
  /** Şahıs Şirketi / Limited Şirket / A.Ş. */
  type: "[Şirket türü]",
  /** Açık adres (cadde, no, ilçe, il) */
  address: "[Açık adres]",
  /** Vergi dairesi */
  taxOffice: "[Vergi Dairesi]",
  /** Vergi/TC Kimlik No (VKN veya TCKN) */
  taxNo: "[VKN / TCKN]",
  /** MERSİS No (şirketler için; şahısta boş bırakılabilir) */
  mersis: "[MERSİS No]",
  /** İletişim telefonu */
  phone: "[Telefon]",
  /** İletişim / destek e-postası */
  email: "[E-posta]",
  /** KEP adresi (varsa) */
  kep: "",
  website: "uzmandiyet.com",
  brand: "UzmanDiyet",
} as const;

/** Yasal metinlerin son güncellenme tarihi (GG.AA.YYYY) */
export const LAST_UPDATED = "[GG.AA.YYYY]";

/** Footer + onay kutusunda kullanılan yasal sayfa bağlantıları. */
export const LEGAL_LINKS: { href: string; label: string }[] = [
  { href: "/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/on-bilgilendirme", label: "Ön Bilgilendirme Formu" },
  { href: "/iptal-iade", label: "İptal, İade ve Cayma Hakkı" },
  { href: "/gizlilik", label: "Gizlilik ve KVKK" },
  { href: "/iletisim", label: "İletişim" },
];
