// Egzersiz adı yerelleştirme.
//
// AI, egzersizlerin `enName` alanını sabit bir kütüphaneden (yuhonas) BİREBİR
// seçtiği için kümeyi biliyoruz ve İngilizce ada bakıp düzgün bir görünür ad
// türetebiliriz. Türkiye'de spor salonlarında çoğu hareket İngilizce adıyla
// bilinir (Bench Press, Lat Pulldown, Squat, Deadlift) — bunları zorla çevirmek
// kötü sonuç verir. Bu yüzden: yaygın Türkçesi olanları Türkçeleştirir
// (şınav, mekik, barfiks), gerisini bilinen İngilizce/anglicize formda bırakırız.

import type { Exercise } from "@/lib/workout";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Normalize edilmiş İngilizce ad/ifade → görünür ad.
// En uzun eşleşen anahtar kazanır (örn. "incline dumbbell bench press").
const MAP: Record<string, string> = {
  // Göğüs
  "bench press": "Bench Press",
  "barbell bench press": "Bench Press (Barbell)",
  "dumbbell bench press": "Dambıl Bench Press",
  "incline bench press": "Eğik Bench Press",
  "incline dumbbell press": "Eğik Dambıl Press",
  "decline bench press": "Alçalan Bench Press",
  "dumbbell flyes": "Dambıl Fly (göğüs açış)",
  "cable crossover": "Cable Crossover",
  "chest press": "Chest Press (makine)",
  "pec deck": "Pec Deck (göğüs sıkıştırma)",
  "push ups": "Şınav",
  pushups: "Şınav",
  "pushup": "Şınav",
  "incline push up": "Eğik Şınav",
  "decline push up": "Alçalan Şınav",
  dips: "Dips (paralel bar)",
  "chest dip": "Göğüs Dips",

  // Sırt
  "lat pulldown": "Lat Pulldown (tepe çekiş)",
  "wide grip lat pulldown": "Geniş Tutuş Lat Pulldown",
  "pull ups": "Barfiks (pull-up)",
  pullups: "Barfiks (pull-up)",
  "pull up": "Barfiks (pull-up)",
  "chin up": "Ters Tutuş Barfiks (chin-up)",
  "bent over row": "Öne Eğilerek Kürek (row)",
  "barbell row": "Barbell Row (kürek)",
  "bent over barbell row": "Barbell Row (öne eğik kürek)",
  "dumbbell row": "Dambıl Row (tek kol kürek)",
  "one arm dumbbell row": "Tek Kol Dambıl Row",
  "seated cable row": "Oturarak Kablo Kürek (row)",
  "seated row": "Oturarak Kürek (row)",
  "t bar row": "T-Bar Row",
  deadlift: "Deadlift",
  "romanian deadlift": "Romanian Deadlift (RDL)",
  "barbell deadlift": "Deadlift (Barbell)",
  hyperextension: "Bel Ekstansiyonu (hyperextension)",
  "back extension": "Bel Ekstansiyonu",
  "face pull": "Face Pull (yüze çekiş)",

  // Omuz
  "overhead press": "Omuz Press (overhead)",
  "shoulder press": "Omuz Press",
  "military press": "Military Press (omuz)",
  "dumbbell shoulder press": "Dambıl Omuz Press",
  "arnold press": "Arnold Press",
  "lateral raise": "Yana Açış (lateral raise)",
  "side lateral raise": "Yana Açış (lateral raise)",
  "front raise": "Öne Kaldırış (front raise)",
  "rear delt raise": "Arka Omuz Açış",
  "upright row": "Dik Kürek (upright row)",
  shrugs: "Trap Silkme (shrug)",
  "barbell shrug": "Barbell Shrug (trap)",

  // Biceps / Triceps / Kol
  "bicep curl": "Biceps Curl",
  "biceps curl": "Biceps Curl",
  "barbell curl": "Barbell Biceps Curl",
  "dumbbell curl": "Dambıl Biceps Curl",
  "hammer curl": "Çekiç Curl (hammer)",
  "concentration curl": "Konsantrasyon Curl",
  "preacher curl": "Preacher Curl (pulpit)",
  "triceps pushdown": "Triceps Pushdown (kablo)",
  "triceps extension": "Triceps Ekstansiyon",
  "overhead triceps extension": "Tepeden Triceps Ekstansiyon",
  "skull crusher": "Skull Crusher (triceps)",
  "triceps dip": "Triceps Dips",
  "close grip bench press": "Dar Tutuş Bench Press",

  // Bacak
  squat: "Squat (çömelme)",
  "barbell squat": "Barbell Squat",
  "back squat": "Back Squat",
  "front squat": "Front Squat",
  "goblet squat": "Goblet Squat",
  "bodyweight squat": "Vücut Ağırlığı Squat",
  "air squat": "Squat (ağırlıksız)",
  "leg press": "Leg Press",
  lunges: "Lunge (öne hamle)",
  lunge: "Lunge (öne hamle)",
  "walking lunge": "Yürüyen Lunge",
  "bulgarian split squat": "Bulgar Split Squat",
  "leg extension": "Leg Extension (ön bacak)",
  "leg curl": "Leg Curl (arka bacak)",
  "lying leg curl": "Yatarak Leg Curl",
  "calf raise": "Topuk Kaldırma (calf raise)",
  "standing calf raise": "Ayakta Topuk Kaldırma",
  "hip thrust": "Hip Thrust (kalça itiş)",
  "glute bridge": "Glute Bridge (kalça köprüsü)",
  "hack squat": "Hack Squat",
  "step up": "Step-up (basamak çıkış)",

  // Kor / karın
  plank: "Plank",
  "side plank": "Yan Plank",
  crunches: "Mekik (crunch)",
  crunch: "Mekik (crunch)",
  "sit up": "Mekik (sit-up)",
  situps: "Mekik (sit-up)",
  "russian twist": "Russian Twist",
  "leg raise": "Bacak Kaldırma (leg raise)",
  "hanging leg raise": "Asılı Bacak Kaldırma",
  "mountain climber": "Mountain Climber (dağcı)",
  "bicycle crunch": "Bisiklet Mekik",
  "ab wheel": "Karın Tekeri (ab wheel)",

  // Kardiyo / fonksiyonel
  burpees: "Burpee",
  burpee: "Burpee",
  "jumping jack": "Jumping Jack",
  "high knees": "Yüksek Diz Koşusu",
  "jump rope": "İp Atlama",
  "box jump": "Kutuya Sıçrama (box jump)",
  running: "Koşu",
  "treadmill": "Koşu Bandı",
  cycling: "Bisiklet",
  rowing: "Kürek (rowing makinesi)",
  "kettlebell swing": "Kettlebell Swing",
};

// En uzun anahtar önce denensin diye sıralı liste.
const KEYS = Object.keys(MAP).sort((a, b) => b.length - a.length);

function titleCase(s: string): string {
  return s
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Bir egzersiz için görünür (Türkçe/idiomatik) ad. */
export function localizeExercise(ex: Pick<Exercise, "name" | "enName">): string {
  const en = (ex.enName ?? "").trim();
  if (en) {
    const n = norm(en);
    if (MAP[n]) return MAP[n];
    // İçinde geçen en uzun bilinen ifadeyi yakala (tam kelime sınırıyla).
    for (const k of KEYS) {
      if (n === k || n.includes(` ${k} `) || n.startsWith(`${k} `) || n.endsWith(` ${k}`)) {
        return MAP[k];
      }
    }
    // Bilinmiyorsa standart İngilizce ad (Türk salon dilinde kabul gören) — AI'nın
    // bozuk Türkçesinden iyidir.
    return titleCase(n);
  }
  // enName yoksa AI'nın ürettiği Türkçe ada düş.
  return ex.name;
}
