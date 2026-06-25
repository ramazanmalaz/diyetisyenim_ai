// Spor asistanı — paylaşılan tipler ve sabitler (UI + AI ortak).

export type WorkoutMode = "bodyweight" | "gym";

export type Exercise = {
  name: string;
  enName?: string; // GIF/video araması için kısa İngilizce karşılık
  sets: number;
  reps: string; // "12", "8-10", "30 sn" gibi esnek
  rest: string; // "60 sn"
  note?: string;
};

export type WorkoutDay = {
  day: string; // "1. Gün"
  focus: string; // "İtiş (göğüs/omuz/triceps)"
  exercises: Exercise[];
};

export type WorkoutProgram = {
  days: WorkoutDay[];
  note: string;
};

export const LEVEL_OPTIONS = [
  { value: "beginner", label: "Yeni başlıyorum" },
  { value: "intermediate", label: "Orta seviye" },
  { value: "advanced", label: "İleri seviye" },
] as const;

export const GOAL_OPTIONS = [
  { value: "fatloss", label: "Yağ yakımı / zayıflama" },
  { value: "muscle", label: "Kas kazanımı" },
  { value: "strength", label: "Güç / kuvvet" },
  { value: "endurance", label: "Dayanıklılık / kondisyon" },
  { value: "general", label: "Genel form / sağlık" },
] as const;

export const DAYS_OPTIONS = [2, 3, 4, 5, 6] as const;

export const SESSION_OPTIONS = [
  { value: 30, label: "~30 dk (kısa)" },
  { value: 45, label: "~45 dk" },
  { value: 60, label: "~60 dk" },
  { value: 90, label: "~90 dk (uzun)" },
] as const;

/** Antrenman tarzı tercihi (diyet tipinin spor karşılığı). */
export const STYLE_OPTIONS = [
  { value: "fullbody", label: "Tüm vücut (full body)", desc: "Her gün tüm bedeni çalış" },
  { value: "split", label: "Bölgesel (split)", desc: "Her gün farklı kas grubu" },
  { value: "ppl", label: "İtiş / Çekiş / Bacak", desc: "Klasik push-pull-legs" },
  { value: "functional", label: "Fonksiyonel / atletik", desc: "Hareket kabiliyeti, denge" },
  { value: "hiit", label: "HIIT / yağ yakım", desc: "Yoğun tempo, kardiyo ağırlıklı" },
  { value: "any", label: "Fark etmez", desc: "Hedefe göre sen karar ver" },
] as const;

export const LEVEL_LABEL: Record<string, string> = Object.fromEntries(
  LEVEL_OPTIONS.map((o) => [o.value, o.label]),
);
export const GOAL_LABEL: Record<string, string> = Object.fromEntries(
  GOAL_OPTIONS.map((o) => [o.value, o.label]),
);
export const STYLE_LABEL: Record<string, string> = Object.fromEntries(
  STYLE_OPTIONS.map((o) => [o.value, o.label]),
);

/** Spor salonunda sık bulunan aletler (elle seçim için). */
export const EQUIPMENT_OPTIONS: { group: string; items: string[] }[] = [
  {
    group: "Serbest ağırlık",
    items: ["Dambıl", "Halter / bar", "Ağırlık plakaları", "Kettlebell", "Sabit bar (smith)"],
  },
  {
    group: "Makineler",
    items: [
      "Leg press",
      "Lat pulldown",
      "Chest press",
      "Pec deck",
      "Leg extension",
      "Leg curl",
      "Seated row",
      "Shoulder press makinesi",
      "Cable (kablo) istasyonu",
      "Hack squat",
      "Smith machine",
    ],
  },
  {
    group: "Kardiyo",
    items: ["Koşu bandı", "Eliptik", "Kondisyon bisikleti", "Kürek (rowing)", "Merdiven (stair)"],
  },
  {
    group: "Diğer",
    items: ["Squat rack / kafes", "Bench (sehpa)", "Direnç bandı", "TRX askı", "Pull-up barı", "Dip standı"],
  },
];

export const ALL_EQUIPMENT = EQUIPMENT_OPTIONS.flatMap((g) => g.items);
