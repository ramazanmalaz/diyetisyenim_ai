"use client";

/**
 * Uygulama içi belirgin uyarı sesi (Web Audio). Tarayıcılar ses çalmayı bir
 * kullanıcı jestine bağladığı için: önce bir dokunuşta `armAlertSound()` ile
 * AudioContext açılır/devam ettirilir; sonra zamanlayıcıyla tetiklenen
 * hatırlatıcılar `playAlertChime()` çağırınca ses gerçekten duyulur.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Kullanıcı jestinde çağır: ses motorunu açar/uyandırır. */
export function armAlertSound(): void {
  void getCtx()?.resume();
}

/**
 * Net, yükselen 3 notalı "diiing" + titreşim. Pomodoro bip'inden daha belirgin
 * (üçgen dalga, daha uzun ve biraz daha yüksek) ki hatırlatıcı kaçmasın.
 */
export function playAlertChime(): void {
  const c = getCtx();
  if (c) {
    void c.resume();
    const now = c.currentTime;
    // Do–Mi–Sol yükselen üçlü (C5–E5–G5) — tanınır, dikkat çeker.
    [523, 659, 784].forEach((freq, i) => {
      const offset = i * 0.16;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.6, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.34);
      osc.connect(gain).connect(c.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.36);
    });
  }
  navigator.vibrate?.([200, 100, 200, 100, 300]);
}
