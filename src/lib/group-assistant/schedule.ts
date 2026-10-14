/**
 * Grup asistanının zamanlanmış mesajları — saf fonksiyonlar (DB/AI yok).
 *
 * Gerçek gruptaki ritim: sabah selamı, öğleden sonra su yoklaması, akşamüstü
 * haber vermeyenlere hatırlatma, akşam tabak çağrısı; Cumartesi hafta sonu
 * uyarısı, Pazartesi haftaya başlangıç, tartıdan önceki akşam hatırlatma,
 * tartı günü sıralama. Pazar sessiz.
 *
 * Şablonlar LLM'siz: ucuz, tutarlı ve gerçek diyetisyen de her gün aynı
 * kalıpları kullanıyordu. Varyant tarihe göre seçilir ki gün içinde sabit kalsın.
 */

export type IstanbulNow = {
  date: string; // YYYY-MM-DD
  hhmm: string; // HH:MM
  dow: number; // 0=Pazar ... 6=Cumartesi
};

export function istanbulNow(at: Date = new Date()): IstanbulNow {
  const ist = new Date(at.getTime() + 3 * 3600 * 1000);
  const hh = String(ist.getUTCHours()).padStart(2, "0");
  const mm = String(ist.getUTCMinutes()).padStart(2, "0");
  return {
    date: ist.toISOString().slice(0, 10),
    hhmm: `${hh}:${mm}`,
    dow: ist.getUTCDay(),
  };
}

export const DAY_NAMES = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

export type ScheduledKind =
  | "morning"
  | "weekend_warning"
  | "week_start"
  | "weigh_call"
  | "water_call"
  | "nudge"
  | "dinner_call"
  | "weigh_reminder"
  | "weigh_results";

/** Bu dakikada bu grup için hangi zamanlanmış mesajlar atılmalı? */
export function dueKinds(now: IstanbulNow, weighInDow: number): ScheduledKind[] {
  const kinds: ScheduledKind[] = [];
  const isWeighDay = now.dow === weighInDow;
  const isEveOfWeigh = now.dow === (weighInDow + 6) % 7;
  const sunday = now.dow === 0;

  // Tartı hatırlatması Pazar'a denk gelse de atılır — kaçırılırsa tören bozulur.
  if (isEveOfWeigh && now.hhmm === "19:30") kinds.push("weigh_reminder");
  if (isWeighDay && now.hhmm === "12:00") kinds.push("weigh_results");

  if (sunday) {
    // Tartı Pazar'a ayarlandıysa çağrısı yine yapılmalı.
    if (isWeighDay && now.hhmm === "09:00") kinds.push("weigh_call");
    return kinds;
  }

  if (now.hhmm === "09:00") {
    if (isWeighDay) kinds.push("weigh_call");
    else if (now.dow === 6) kinds.push("weekend_warning");
    else if (now.dow === 1) kinds.push("week_start");
    else kinds.push("morning");
  }
  if (now.hhmm === "14:00") kinds.push("water_call");
  if (now.hhmm === "17:00" && !isWeighDay) kinds.push("nudge");
  if (now.hhmm === "19:00") kinds.push("dinner_call");

  return kinds;
}

const TEMPLATES: Record<
  Exclude<ScheduledKind, "nudge" | "weigh_results">,
  string[]
> = {
  morning: [
    "Günaydınlarr 😍 Kaçamaksız, bol aktif bir gün bizim olsun 💐 Öğünleri bekliyorum!",
    "Günaydınlaaar 🌸 Sirkeli suyunuzu içip güne başladınız mı? Öğünlerde buluşalım mı 😍",
    "Hafta ortasından herkese merhabalarr 😍 Öğünleri eksiksiz bekliyorum 💐",
    "Günaydınlarr ☀️ Bugün de birebir listeye uyuyoruz değil mi? Tabakları görmek istiyorum 😍",
  ],
  weekend_warning: [
    "Günaydınlarrr 😍 Hafta sonuna giriyoruz — diyetin en tehlikeli günleri! Sıfır kaçamakla ilerleyelim olur mu? Öğünleri bekliyorum 💐",
    "Hafta sonu geldi 🌸 Davetler, misafirlikler… Dışarıdaysanız tabağınızı listeye en yakın kurun, çiğ sebze her zaman serbest 😍",
  ],
  week_start: [
    "Günaydınlarr 😍 Haftaya bomba gibi başlamaya hazır mıyız? 💪🏻 Öğünleri bekliyorum!",
    "Yeni hafta, yeni başlangıç 💃 Hafta sonu ne olduysa geride kaldı, bugün listeye birebir dönüyoruz 😍",
  ],
  weigh_call: [
    "Günaydınlarr 😍 Bugün tartı günümüz! Aç karnına, tuvaletten sonra, hafif kıyafetle tartılalım ve herkes TEK mesajda yazsın:\n\nProgram başlangıcı: …\nBugün: …\n\nRegl/kabızlık varsa yanına not düşün 💐 Sonuçları öğlen toplu açıklayacağım 💪🏻",
  ],
  water_call: [
    "Su raporu zamanı 💧 Kimler kaç litre içti, hadi dökülün bakalım 😍",
    "Herkes benim için bir bardak daha su içsin 🥳 Şu ana kadar kaç litre oldu?",
    "Sular içiliyor mu? 💧 Hedefimiz 2,5–3 litre, raporları alayım 😍",
  ],
  dinner_call: [
    "Akşam yemeklerimizi görebilir miyim? 😍 Tabakları eksiksiz bekliyorum 💐",
    "Akşam yemeklerinde buluşalım 💃 Menüde ne var, ben de göreyim 😍",
    "Günü güzel kapatalım 🌸 Akşam tabaklarını bekliyorum, beni unutmayın 😍",
  ],
  weigh_reminder: [
    "Yarın sabah tartı günümüz 💐 Aç karnına tartılıp sonucu yazın; ben mesaj atınca paylaşalım. Bu akşam tuzlu ve geç yemek yok, suyu ihmal etmiyoruz 😍",
  ],
};

function pick<T>(list: T[], seed: string): T {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

/** Sabit şablonlu zamanlanmış mesaj. Aynı gün aynı varyant döner. */
export function templateFor(
  kind: Exclude<ScheduledKind, "nudge" | "weigh_results">,
  date: string,
): string {
  return pick(TEMPLATES[kind], `${kind}:${date}`);
}

/** Akşamüstü yoklaması: bugün hiç haber vermeyenleri nazikçe çağırır. */
export function nudgeMessage(silentNames: string[], date: string): string | null {
  if (silentNames.length === 0) return null;
  const tags = silentNames.map((n) => `@${n}`).join(" ");
  const tail = pick(
    [
      "bugün sizden haber alamadım 🌸 Öğünlerinizi ve suyunuzu görebilir miyim?",
      "sizi özledim 😍 Bugün tabaklar nasıl gidiyor, bir fotoğraf atar mısınız?",
      "her şey yolunda mı? 💐 Zorlandığınız bir şey varsa yazın, birlikte çözelim.",
    ],
    `nudge:${date}`,
  );
  return `${tags} ${tail}`;
}

// ---------------------------------------------------------------------------
// Tartı sıralaması
// ---------------------------------------------------------------------------

export type WeighMember = { id: string; name: string };
export type WeighEntry = { client_id: string; date: string; weight_kg: number };

export type WeighResult = {
  ranked: { id: string; name: string; start: number; current: number; delta: number }[];
  missing: WeighMember[];
};

/**
 * Programın başından toplam değişim. Başlangıç = programın ilk tartısı,
 * güncel = bugünkü (yoksa dünkü) tartı. Bugün/dün tartısı olmayanlar "missing".
 */
export function computeWeighResults(
  members: WeighMember[],
  entries: WeighEntry[],
  today: string,
): WeighResult {
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yday = yesterday.toISOString().slice(0, 10);

  const ranked: WeighResult["ranked"] = [];
  const missing: WeighMember[] = [];

  for (const m of members) {
    const mine = entries
      .filter((e) => e.client_id === m.id)
      .sort((a, b) => a.date.localeCompare(b.date));
    const recent =
      mine.filter((e) => e.date === today).at(-1) ??
      mine.filter((e) => e.date === yday).at(-1);
    if (!recent || mine.length === 0) {
      missing.push(m);
      continue;
    }
    const start = mine[0].weight_kg;
    const delta = Math.round((recent.weight_kg - start) * 10) / 10;
    ranked.push({ id: m.id, name: m.name, start, current: recent.weight_kg, delta });
  }

  ranked.sort((a, b) => a.delta - b.delta);
  return { ranked, missing };
}

function formatDelta(delta: number): string {
  if (delta === 0) return "±0";
  const s = Math.abs(delta).toFixed(1).replace(/\.0$/, "");
  return delta < 0 ? `-${s} kg` : `+${s} kg`;
}

/** Tartı günü öğlen mesajı: sıralama + normalleştirme + ödül + eksikler. */
export function weighResultsMessage(result: WeighResult): string | null {
  if (result.ranked.length === 0 && result.missing.length === 0) return null;

  const parts: string[] = [];

  if (result.ranked.length > 0) {
    const lines = result.ranked.map(
      (r) => `${r.name} 👉🏻 ${formatDelta(r.delta)}`,
    );
    parts.push(
      `Tartı sonuçlarımız geldi 😍 (programın başından toplam)\n\n${lines.join("\n")}\n\nHepinizi tebrik ederiiim 💐`,
    );
    parts.push(
      "Regl veya kabızlık tartıya +1–1,5 kg yansır, regl bittikten 2–3 gün sonra net kilonuz çıkar — moral bozmak yok 💪🏻 Haftalığa değil toplam sonuca odaklanalım; listeye birebir uyan herkes ay sonunda hedefini görür.",
    );
    parts.push(
      "🎁 Bugün herkesin TEK bir ödül hakkı var (kızartma ve asitli içecek hariç). Tatlıysa ara öğün yerine, yemekse akşam yemeği yerine. Sadece bugün geçerli 😍",
    );
  }

  if (result.missing.length > 0) {
    const tags = result.missing.map((m) => `@${m.name}`).join(" ");
    parts.push(
      `${tags} tartınızı henüz göremedim 🌸 Aç karnına tartılıp yazdığınızda size ayrıca yorum yapacağım.`,
    );
  }

  return parts.join("\n\n");
}
