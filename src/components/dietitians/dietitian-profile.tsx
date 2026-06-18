"use client";

import {
  AtSign,
  CalendarDays,
  Leaf,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { useId, useRef, useState } from "react";

import { DietitianAvatar } from "@/components/dietitians/dietitian-avatar";
import { SlotPicker } from "@/components/dietitians/slot-picker";
import {
  isOpenHours,
  todayDayKey,
  WORKING_DAYS,
  type PublicDietitian,
  type Slot,
} from "@/lib/dietitians";
import { cn } from "@/lib/utils";

type TabKey = "hizmetler" | "hakkinda" | "saatler" | "iletisim" | "randevu";

/**
 * Diyetisyen profilini gruplandırılmış, erişilebilir sekmeler içinde gösterir.
 * Tüm bilgiler tek ekranda kalabalık yapmadan; içeriği olmayan sekme gizlenir.
 */
export function DietitianProfile({
  d,
  slots,
}: {
  d: PublicDietitian;
  slots: Slot[];
}) {
  const tabs = (
    [
      { key: "hizmetler", label: "Hizmetler", show: d.services.length > 0 },
      { key: "hakkinda", label: "Hakkında", show: !!d.bio },
      { key: "saatler", label: "Çalışma Saatleri", show: !!d.working_hours },
      {
        key: "iletisim",
        label: "İletişim",
        show: !!(d.address || d.instagram || d.whatsapp),
      },
      { key: "randevu", label: "Randevu", show: true },
    ] as { key: TabKey; label: string; show: boolean }[]
  ).filter((t) => t.show);

  const [active, setActive] = useState<TabKey>(tabs[0].key);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const ni = (i + dir + tabs.length) % tabs.length;
    setActive(tabs[ni].key);
    tabRefs.current[ni]?.focus();
  }

  const wa = d.whatsapp?.replace(/\D/g, "");
  const igHandle = d.instagram?.replace(/^@/, "");
  const igUrl = igHandle ? `https://instagram.com/${igHandle}` : null;
  const mapUrl = d.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`
    : null;
  const today = todayDayKey();

  return (
    <div className="space-y-6">
      {/* Başlık kartı */}
      <header className="glass reveal relative overflow-hidden rounded-3xl p-6 shadow-[var(--shadow-soft)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl"
        />
        <div className="relative flex items-start gap-4">
          <DietitianAvatar
            name={d.full_name}
            photoUrl={d.photo_url}
            className="h-24 w-24 text-xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-[family-name:var(--font-jakarta)] text-2xl font-extrabold tracking-tight">
              {d.full_name}
            </h1>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {d.title}
              {d.years_experience ? ` · ${d.years_experience} yıl deneyim` : ""}
            </p>
            {d.city && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" /> {d.city}
              </p>
            )}
          </div>
        </div>

        {d.slogan && (
          <p className="relative mt-4 border-l-2 border-emerald-400 pl-3 text-sm text-gray-600 italic dark:text-gray-300">
            “{d.slogan}”
          </p>
        )}

        {d.specialties.length > 0 && (
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {d.specialties.map((s) => (
              <span
                key={s}
                className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/40"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {(wa || igUrl) && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.97]"
              >
                <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> WhatsApp
              </a>
            )}
            {igUrl && (
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.97] dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <AtSign className="h-3.5 w-3.5" strokeWidth={2} /> Instagram
              </a>
            )}
          </div>
        )}
      </header>

      {/* Sekme çubuğu */}
      <div
        role="tablist"
        aria-label="Diyetisyen bilgileri"
        className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t, i) => {
          const selected = active === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(t.key)}
              onKeyDown={(e) => onKey(e, i)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition active:scale-[0.97]",
                selected
                  ? "bg-emerald-600 text-white shadow-[0_6px_16px_-8px_rgb(11_109_72/0.8)]"
                  : "bg-white/60 text-gray-600 ring-1 ring-black/5 hover:bg-white dark:bg-white/5 dark:text-gray-300 dark:ring-white/10",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Paneller */}
      <div className="glass rounded-3xl p-5 shadow-[var(--shadow-soft)]">
        {tabs.map((t) => (
          <div
            key={t.key}
            role="tabpanel"
            id={`${baseId}-panel-${t.key}`}
            aria-labelledby={`${baseId}-tab-${t.key}`}
            hidden={active !== t.key}
            className="reveal"
          >
            {t.key === "hizmetler" && (
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {d.services.map((s) => (
                  <li
                    key={s}
                    className="flex items-start gap-2.5 rounded-2xl bg-emerald-50/60 px-3.5 py-3 text-sm font-medium text-gray-700 ring-1 ring-emerald-100/70 dark:bg-emerald-950/20 dark:text-gray-200 dark:ring-emerald-900/30"
                  >
                    <Leaf
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                      strokeWidth={1.75}
                    />
                    {s}
                  </li>
                ))}
              </ul>
            )}

            {t.key === "hakkinda" && (
              <p className="text-sm leading-7 text-gray-600 dark:text-gray-300">
                {d.bio}
              </p>
            )}

            {t.key === "saatler" && d.working_hours && (
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {WORKING_DAYS.map((day) => {
                  const v = d.working_hours?.[day.key];
                  const open = isOpenHours(v);
                  const isToday = day.key === today;
                  return (
                    <li
                      key={day.key}
                      className={cn(
                        "flex items-center justify-between py-2.5 text-sm",
                        isToday && "font-semibold",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        )}
                        <span
                          className={
                            isToday
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-gray-600 dark:text-gray-300"
                          }
                        >
                          {day.label}
                          {isToday ? " (bugün)" : ""}
                        </span>
                      </span>
                      <span
                        className={
                          open
                            ? "text-gray-700 tabular-nums dark:text-gray-200"
                            : "text-gray-400"
                        }
                      >
                        {v ?? "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {t.key === "iletisim" && (
              <div className="space-y-3 text-sm">
                {d.address && (
                  <a
                    href={mapUrl ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-2xl bg-white/50 px-3.5 py-3 ring-1 ring-black/5 transition hover:bg-white dark:bg-white/5 dark:ring-white/10"
                  >
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-gray-700 dark:text-gray-200">
                      {d.address}
                      <span className="mt-0.5 block text-xs text-emerald-700 dark:text-emerald-400">
                        Haritada aç →
                      </span>
                    </span>
                  </a>
                )}
                {wa && (
                  <a
                    href={`https://wa.me/${wa}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl bg-white/50 px-3.5 py-3 ring-1 ring-black/5 transition hover:bg-white dark:bg-white/5 dark:ring-white/10"
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-gray-700 dark:text-gray-200">
                      WhatsApp ile randevu / iletişim
                    </span>
                  </a>
                )}
                {igUrl && (
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl bg-white/50 px-3.5 py-3 ring-1 ring-black/5 transition hover:bg-white dark:bg-white/5 dark:ring-white/10"
                  >
                    <AtSign className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="text-gray-700 dark:text-gray-200">
                      @{igHandle}
                    </span>
                  </a>
                )}
              </div>
            )}

            {t.key === "randevu" && (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-emerald-600" /> Uygun
                  randevu saatleri
                </p>
                <SlotPicker dietitianId={d.id} slots={slots} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
