"use client";

import {
  Book,
  Briefcase,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Gift,
  Inbox,
  List as ListIcon,
  Mail,
  MapPin,
  MinusCircle,
  Music,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

import {
  createList,
  createReminder,
  deleteList,
  deleteReminder,
  toggleFlag,
  toggleReminder,
  updateList,
  updateReminder,
} from "@/app/(app)/hatirlatici/actions";
import { cn } from "@/lib/utils";

type ReminderList = {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
};
type Reminder = {
  id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  url: string | null;
  due_at: string | null;
  has_time: boolean;
  flagged: boolean;
  priority: number;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
};

const COLOR_BG: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  brown: "bg-amber-700",
  gray: "bg-gray-500",
  cyan: "bg-cyan-400",
  pink: "bg-pink-500",
};
const COLOR_TEXT: Record<string, string> = {
  red: "text-red-500",
  orange: "text-orange-500",
  yellow: "text-yellow-500",
  green: "text-green-500",
  blue: "text-blue-500",
  indigo: "text-indigo-500",
  purple: "text-purple-500",
  brown: "text-amber-700",
  gray: "text-gray-500",
  cyan: "text-cyan-500",
  pink: "text-pink-500",
};
const COLOR_BORDER: Record<string, string> = {
  red: "border-red-500",
  orange: "border-orange-500",
  yellow: "border-yellow-400",
  green: "border-green-500",
  blue: "border-blue-500",
  indigo: "border-indigo-500",
  purple: "border-purple-500",
  brown: "border-amber-700",
  gray: "border-gray-500",
  cyan: "border-cyan-400",
  pink: "border-pink-500",
};
const COLORS = Object.keys(COLOR_BG);

const ICONS: Record<string, ComponentType<LucideProps>> = {
  list: ListIcon,
  calendar: Calendar,
  clock: Clock,
  flag: Flag,
  mail: Mail,
  location: MapPin,
  briefcase: Briefcase,
  book: Book,
  gift: Gift,
  cart: ShoppingCart,
  music: Music,
  camera: Camera,
};
const ICON_KEYS = Object.keys(ICONS);

type SmartKey = "today" | "scheduled" | "all" | "flagged";
const SMART: {
  key: SmartKey;
  label: string;
  bg: string;
  icon: ComponentType<LucideProps>;
}[] = [
  { key: "today", label: "Bugün", bg: "bg-blue-500", icon: CalendarDays },
  { key: "scheduled", label: "Planlı", bg: "bg-red-500", icon: Calendar },
  { key: "all", label: "Tümü", bg: "bg-gray-500", icon: Inbox },
  { key: "flagged", label: "Bayraklı", bg: "bg-orange-500", icon: Flag },
];

function dueLabel(iso: string, hasTime: boolean, todayKey: string): string {
  const key = iso.slice(0, 10);
  const d = new Date(iso);
  const t = new Date(todayKey);
  const tomorrow = new Date(t.getTime() + 86_400_000).toISOString().slice(0, 10);
  const datePart =
    key === todayKey
      ? "Bugün"
      : key === tomorrow
        ? "Yarın"
        : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
  if (!hasTime) return datePart;
  const time = d.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} ${time}`;
}

export function RemindersApp({
  initialLists,
  initialReminders,
  todayKey,
}: {
  initialLists: ReminderList[];
  initialReminders: Reminder[];
  todayKey: string;
}) {
  const [lists, setLists] = useState(initialLists);
  const [items, setItems] = useState(initialReminders);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLists(initialLists), [initialLists]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setItems(initialReminders), [initialReminders]);

  const [view, setView] = useState<
    { kind: "smart"; key: SmartKey } | { kind: "list"; id: string } | null
  >(null);
  const [newReminder, setNewReminder] = useState(false);
  const [newList, setNewList] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");

  // Düzenleme modları
  const [listEditMode, setListEditMode] = useState(false);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  const [editList, setEditList] = useState<ReminderList | null>(null);

  const active = items.filter((r) => !r.completed);
  const counts = {
    today: active.filter((r) => r.due_at && r.due_at.slice(0, 10) <= todayKey).length,
    scheduled: active.filter((r) => r.due_at).length,
    all: active.length,
    flagged: active.filter((r) => r.flagged).length,
  };
  const listCount = (id: string) => active.filter((r) => r.list_id === id).length;

  function detailItems(): Reminder[] {
    let list = items;
    if (view?.kind === "smart") {
      if (view.key === "today")
        list = items.filter((r) => r.due_at && r.due_at.slice(0, 10) <= todayKey);
      else if (view.key === "scheduled") list = items.filter((r) => r.due_at);
      else if (view.key === "flagged") list = items.filter((r) => r.flagged);
    } else if (view?.kind === "list") {
      list = items.filter((r) => r.list_id === view.id);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => Number(a.completed) - Number(b.completed));
  }

  const detailTitle =
    view?.kind === "smart"
      ? (SMART.find((s) => s.key === view.key)?.label ?? "")
      : view?.kind === "list"
        ? (lists.find((l) => l.id === view.id)?.name ?? "")
        : "";

  async function onToggle(r: Reminder) {
    const next = !r.completed;
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, completed: next } : x)));
    await toggleReminder({ id: r.id, completed: next });
  }
  async function onFlag(r: Reminder) {
    const next = !r.flagged;
    setItems((prev) => prev.map((x) => (x.id === r.id ? { ...x, flagged: next } : x)));
    await toggleFlag({ id: r.id, flagged: next });
  }
  async function onDelete(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    await deleteReminder(id);
  }
  async function onDeleteList(id: string) {
    setLists((prev) => prev.filter((x) => x.id !== id));
    setItems((prev) => prev.filter((x) => x.list_id !== id));
    await deleteList(id);
  }

  async function addReminderOptimistic(input: {
    id: string;
    listId: string | null;
    title: string;
    notes?: string;
    url?: string;
    dueAt: string | null;
    hasTime?: boolean;
    flagged?: boolean;
    priority?: number;
  }): Promise<{ error: string } | { ok: true }> {
    const obj: Reminder = {
      id: input.id,
      list_id: input.listId,
      title: input.title,
      notes: input.notes || null,
      url: input.url || null,
      due_at: input.dueAt,
      has_time: !!input.hasTime,
      flagged: !!input.flagged,
      priority: input.priority ?? 0,
      completed: false,
      completed_at: null,
      sort_order: 0,
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, obj]);
    const res = await createReminder(input);
    if ("error" in res) setItems((prev) => prev.filter((x) => x.id !== input.id));
    return res;
  }

  async function onUpdateReminderOptimistic(input: {
    id: string;
    listId: string | null;
    title: string;
    notes?: string;
    url?: string;
    dueAt: string | null;
    hasTime?: boolean;
    flagged?: boolean;
    priority?: number;
  }): Promise<{ error: string } | { ok: true }> {
    const prev = items.find((x) => x.id === input.id);
    setItems((all) =>
      all.map((x) =>
        x.id === input.id
          ? {
              ...x,
              list_id: input.listId,
              title: input.title,
              notes: input.notes || null,
              url: input.url || null,
              due_at: input.dueAt,
              has_time: !!input.hasTime,
              flagged: !!input.flagged,
              priority: input.priority ?? 0,
            }
          : x,
      ),
    );
    const res = await updateReminder(input);
    if ("error" in res && prev)
      setItems((all) => all.map((x) => (x.id === input.id ? prev : x)));
    return res;
  }

  async function addListOptimistic(input: {
    id: string;
    name: string;
    color: string;
    icon: string;
  }): Promise<{ error: string } | { ok: true }> {
    const obj: ReminderList = { ...input, sort_order: 0 };
    setLists((prev) => [...prev, obj]);
    const res = await createList(input);
    if ("error" in res) setLists((prev) => prev.filter((x) => x.id !== input.id));
    return res;
  }

  async function onUpdateListOptimistic(input: {
    id: string;
    name: string;
    color: string;
    icon: string;
  }): Promise<{ error: string } | { ok: true }> {
    const prev = lists.find((x) => x.id === input.id);
    setLists((all) =>
      all.map((x) =>
        x.id === input.id ? { ...x, name: input.name, color: input.color, icon: input.icon } : x,
      ),
    );
    const res = await updateList(input);
    if ("error" in res && prev)
      setLists((all) => all.map((x) => (x.id === input.id ? prev : x)));
    return res;
  }

  function inlineCtx(): { listId: string | null; dueAt: string | null; flagged: boolean } {
    if (view?.kind === "list") return { listId: view.id, dueAt: null, flagged: false };
    if (view?.kind === "smart") {
      if (view.key === "today" || view.key === "scheduled")
        return { listId: null, dueAt: new Date(`${todayKey}T09:00:00`).toISOString(), flagged: false };
      if (view.key === "flagged") return { listId: null, dueAt: null, flagged: true };
    }
    return { listId: null, dueAt: null, flagged: false };
  }

  async function addInline() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    const ctx = inlineCtx();
    await addReminderOptimistic({
      id: crypto.randomUUID(),
      listId: ctx.listId,
      title: t,
      dueAt: ctx.dueAt,
      flagged: ctx.flagged,
    });
  }

  return (
    <div className="min-h-[calc(100vh-7rem)] bg-[#f2f2f7] dark:bg-black">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        {view === null ? (
          /* ===================== LİSTELER ANA EKRANI ===================== */
          <div className="reveal">
            <div className="flex h-7 items-center justify-end">
              <button
                type="button"
                onClick={() => setListEditMode((v) => !v)}
                className="text-[15px] font-medium text-blue-500 active:opacity-60"
              >
                {listEditMode ? "Bitti" : "Düzenle"}
              </button>
            </div>
            <h1 className="mt-1 text-[34px] font-bold leading-tight tracking-tight text-gray-900 dark:text-white">
              Listeler
            </h1>

            <SearchBar value={search} onChange={setSearch} />

            {/* Akıllı kartlar */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {SMART.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setView({ kind: "smart", key: s.key })}
                    className={cn(
                      "flex flex-col gap-3 rounded-2xl p-3.5 text-left text-white shadow-sm transition active:scale-[0.98]",
                      s.bg,
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25">
                        <Icon className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <span className="text-2xl font-bold tabular-nums">{counts[s.key]}</span>
                    </div>
                    <span className="text-[15px] font-semibold">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Listelerim */}
            <p className="mt-6 mb-2 px-1 text-[13px] font-semibold tracking-wide text-gray-500 uppercase">
              Listelerim
            </p>
            {lists.length === 0 ? (
              <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-gray-400 dark:bg-gray-900">
                Henüz liste yok. Aşağıdan "Liste Ekle" ile başla.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
                {lists.map((l, i) => {
                  const Icon = ICONS[l.icon] ?? ListIcon;
                  return (
                    <div
                      key={l.id}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5",
                        i > 0 && "border-t border-gray-100 dark:border-gray-800",
                      )}
                    >
                      {/* Düzenleme modunda: kırmızı sil butonu */}
                      {listEditMode && (
                        <button
                          type="button"
                          onClick={() => onDeleteList(l.id)}
                          aria-label="Listeyi sil"
                          className="shrink-0 text-red-500 active:opacity-60"
                        >
                          <MinusCircle className="h-5 w-5" />
                        </button>
                      )}

                      {/* Liste adı — tıklanınca detay (düzenleme modunda değilse) */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!listEditMode) setView({ kind: "list", id: l.id });
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className={cn(
                            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-white",
                            COLOR_BG[l.color] ?? "bg-blue-500",
                          )}
                        >
                          <Icon className="h-4 w-4" strokeWidth={2.5} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[16px] text-gray-900 dark:text-white">
                          {l.name}
                        </span>
                        {!listEditMode && (
                          <span className="text-sm tabular-nums text-gray-400">
                            {listCount(l.id)}
                          </span>
                        )}
                      </button>

                      {/* Düzenleme modunda: kalem butonu */}
                      {listEditMode ? (
                        <button
                          type="button"
                          onClick={() => setEditList(l)}
                          aria-label="Listeyi düzenle"
                          className="shrink-0 text-gray-400 active:opacity-60"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Alt aksiyon çubuğu */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setNewReminder(true)}
                className="flex items-center gap-2 text-[16px] font-semibold text-blue-500 active:opacity-60"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-white">
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </span>
                Yeni Hatırlatıcı
              </button>
              <button
                type="button"
                onClick={() => setNewList(true)}
                className="text-[16px] font-medium text-blue-500 active:opacity-60"
              >
                Liste Ekle
              </button>
            </div>
          </div>
        ) : (
          /* ===================== DETAY (akıllı/liste) ===================== */
          <div className="reveal">
            <button
              type="button"
              onClick={() => { setView(null); setSearch(""); }}
              className="flex items-center gap-0.5 text-[15px] font-medium text-blue-500 active:opacity-60"
            >
              <ChevronLeft className="h-5 w-5" /> Listeler
            </button>
            <h1
              className={cn(
                "mt-1 text-[34px] font-bold leading-tight tracking-tight",
                view.kind === "list"
                  ? (COLOR_TEXT[lists.find((l) => l.id === view.id)?.color ?? "blue"] ?? "text-blue-500")
                  : (SMART.find((s) => s.key === view.key)?.bg.replace("bg-", "text-") ?? "text-blue-500"),
              )}
            >
              {detailTitle}
            </h1>

            <SearchBar value={search} onChange={setSearch} />

            <ul className="mt-4 space-y-0 overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
              {detailItems().map((r, i) => {
                const color = lists.find((l) => l.id === r.list_id)?.color ?? "blue";
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "group flex items-start gap-3 px-3 py-2.5",
                      i > 0 && "border-t border-gray-100 dark:border-gray-800",
                    )}
                  >
                    {/* Tamamlandı toggle */}
                    <button
                      type="button"
                      onClick={() => onToggle(r)}
                      aria-label={r.completed ? "Geri al" : "Tamamlandı"}
                      className={cn(
                        "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 transition active:scale-90",
                        r.completed
                          ? cn("border-transparent text-white", COLOR_BG[color] ?? "bg-blue-500")
                          : cn("text-transparent", COLOR_BORDER[color] ?? "border-blue-500"),
                      )}
                    >
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </button>

                    {/* Başlık + not — dokunca düzenle */}
                    <button
                      type="button"
                      onClick={() => setEditReminder(r)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p
                        className={cn(
                          "truncate text-[16px] text-gray-900 dark:text-white",
                          r.completed && "text-gray-400 line-through",
                        )}
                      >
                        {r.title}
                      </p>
                      {(r.notes || r.due_at) && (
                        <p className="truncate text-[13px] text-gray-400">
                          {r.due_at ? dueLabel(r.due_at, r.has_time, todayKey) : r.notes}
                        </p>
                      )}
                    </button>

                    {/* Bayrak */}
                    {r.flagged && (
                      <button
                        type="button"
                        onClick={() => onFlag(r)}
                        aria-label="Bayrağı kaldır"
                        className="mt-0.5 shrink-0"
                      >
                        <Flag className="h-4 w-4 text-orange-500" fill="currentColor" />
                      </button>
                    )}

                    {/* Sil */}
                    <button
                      type="button"
                      onClick={() => onDelete(r.id)}
                      aria-label="Sil"
                      className="mt-0.5 shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100 sm:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}

              {/* Inline yeni satır */}
              <li
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  detailItems().length > 0 && "border-t border-gray-100 dark:border-gray-800",
                )}
              >
                <span
                  aria-hidden
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border-2 border-gray-300 dark:border-gray-600"
                />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); void addInline(); }
                  }}
                  placeholder="Yeni hatırlatıcı"
                  className="w-full bg-transparent text-[16px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
                />
              </li>
            </ul>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setNewReminder(true)}
                className="flex items-center gap-2 text-[16px] font-semibold text-blue-500 active:opacity-60"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-500 text-white">
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </span>
                Yeni Hatırlatıcı
              </button>
            </div>
          </div>
        )}
      </div>

      {newReminder && (
        <ReminderSheet
          mode="create"
          lists={lists}
          defaultListId={view?.kind === "list" ? view.id : null}
          onSave={addReminderOptimistic}
          onClose={() => setNewReminder(false)}
        />
      )}
      {editReminder && (
        <ReminderSheet
          mode="edit"
          initial={editReminder}
          lists={lists}
          defaultListId={editReminder.list_id}
          onSave={(input) => onUpdateReminderOptimistic({ ...input, id: editReminder.id })}
          onClose={() => setEditReminder(null)}
        />
      )}
      {newList && (
        <ListSheet mode="create" onSave={addListOptimistic} onClose={() => setNewList(false)} />
      )}
      {editList && (
        <ListSheet
          mode="edit"
          initial={editList}
          onSave={(input) => onUpdateListOptimistic({ ...input, id: editList.id })}
          onClose={() => setEditList(null)}
        />
      )}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-200/70 px-3 py-2 dark:bg-gray-800">
      <Search className="h-4 w-4 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ara"
        className="w-full bg-transparent text-[16px] text-gray-900 outline-none placeholder:text-gray-400 dark:text-white"
      />
    </div>
  );
}

// ===================== HATIRLATICI SHEET =====================
function ReminderSheet({
  mode,
  initial,
  lists,
  defaultListId,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: Reminder;
  lists: ReminderList[];
  defaultListId: string | null;
  onSave: (input: {
    id: string;
    listId: string | null;
    title: string;
    notes?: string;
    url?: string;
    dueAt: string | null;
    hasTime?: boolean;
    flagged?: boolean;
    priority?: number;
  }) => Promise<{ error: string } | { ok: true }>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [flagged, setFlagged] = useState(initial?.flagged ?? false);
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [listId, setListId] = useState<string>(defaultListId ?? "");

  const initDue = initial?.due_at ? new Date(initial.due_at) : null;
  const [dateOn, setDateOn] = useState(!!initDue);
  const [timeOn, setTimeOn] = useState(!!(initDue && initial?.has_time));
  const [date, setDate] = useState(initDue ? initDue.toISOString().slice(0, 10) : "");
  const [time, setTime] = useState(
    initDue
      ? initDue.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      : "09:00",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) { setError("Başlık gir."); return; }
    setBusy(true);
    setError(null);
    let dueAt: string | null = null;
    if (dateOn && date) {
      dueAt = new Date(`${date}T${timeOn ? time : "09:00"}:00`).toISOString();
    }
    const res = await onSave({
      id: initial?.id ?? crypto.randomUUID(),
      listId: listId || null,
      title,
      notes,
      url,
      dueAt,
      hasTime: dateOn && timeOn,
      flagged,
      priority,
    });
    setBusy(false);
    if ("error" in res) { setError(res.error); return; }
    onClose();
  }

  return (
    <Sheet>
      <SheetBar
        onCancel={onClose}
        title={mode === "create" ? "Yeni Hatırlatıcı" : "Düzenle"}
        actionLabel={mode === "create" ? "Ekle" : "Kaydet"}
        onAction={save}
        actionDisabled={busy || !title.trim()}
      />
      <div className="space-y-4 p-4">
        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık"
            autoFocus
            className="w-full px-3.5 py-3 text-[16px] outline-none placeholder:text-gray-400 dark:bg-gray-900 dark:text-white"
          />
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notlar"
            rows={2}
            className="w-full resize-none px-3.5 py-3 text-[15px] outline-none placeholder:text-gray-400 dark:bg-gray-900 dark:text-white"
          />
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL"
            inputMode="url"
            className="w-full px-3.5 py-3 text-[15px] outline-none placeholder:text-gray-400 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
          <ToggleRow icon={Calendar} iconBg="bg-red-500" label="Tarih" on={dateOn} onChange={setDateOn} />
          {dateOn && (
            <div className="border-t border-gray-100 px-3.5 py-2 dark:border-gray-800">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-[15px] text-gray-900 outline-none dark:text-white"
              />
            </div>
          )}
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <ToggleRow
            icon={Clock}
            iconBg="bg-blue-500"
            label="Saat"
            on={timeOn}
            onChange={(v) => { setTimeOn(v); if (v) setDateOn(true); }}
          />
          {timeOn && (
            <div className="border-t border-gray-100 px-3.5 py-2 dark:border-gray-800">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-transparent text-[15px] text-gray-900 outline-none dark:text-white"
              />
            </div>
          )}
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <ToggleRow icon={Flag} iconBg="bg-orange-500" label="Bayrak" on={flagged} onChange={setFlagged} />
        </div>

        <div className="overflow-hidden rounded-xl bg-white dark:bg-gray-900">
          <label className="flex items-center justify-between px-3.5 py-3">
            <span className="text-[16px] text-gray-900 dark:text-white">Öncelik</span>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="bg-transparent text-[15px] text-gray-500 outline-none dark:text-gray-300"
            >
              <option value={0}>Yok</option>
              <option value={1}>Düşük</option>
              <option value={2}>Orta</option>
              <option value={3}>Yüksek</option>
            </select>
          </label>
          <div className="border-t border-gray-100 dark:border-gray-800" />
          <label className="flex items-center justify-between px-3.5 py-3">
            <span className="text-[16px] text-gray-900 dark:text-white">Liste</span>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="max-w-[60%] bg-transparent text-right text-[15px] text-gray-500 outline-none dark:text-gray-300"
            >
              <option value="">Liste yok</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="px-1 text-sm text-red-500">{error}</p>}
      </div>
    </Sheet>
  );
}

// ===================== LİSTE SHEET =====================
function ListSheet({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: "create" | "edit";
  initial?: ReminderList;
  onSave: (input: {
    id: string;
    name: string;
    color: string;
    icon: string;
  }) => Promise<{ error: string } | { ok: true }>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState(initial?.color ?? "blue");
  const [icon, setIcon] = useState(initial?.icon ?? "list");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PreviewIcon = ICONS[icon] ?? ListIcon;

  async function done() {
    if (!name.trim()) { setError("Liste adı gir."); return; }
    setBusy(true);
    setError(null);
    const res = await onSave({ id: initial?.id ?? crypto.randomUUID(), name, color, icon });
    setBusy(false);
    if ("error" in res) { setError(res.error); return; }
    onClose();
  }

  return (
    <Sheet>
      <SheetBar
        onCancel={onClose}
        title={mode === "create" ? "Yeni Liste" : "Listeyi Düzenle"}
        actionLabel="Bitti"
        onAction={done}
        actionDisabled={busy || !name.trim()}
      />
      <div className="space-y-5 p-4">
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className={cn("grid h-20 w-20 place-items-center rounded-full text-white shadow-md", COLOR_BG[color])}>
            <PreviewIcon className="h-9 w-9" strokeWidth={2.5} />
          </span>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Liste Adı"
          autoFocus
          className={cn(
            "w-full rounded-xl bg-white px-3.5 py-3 text-center text-[18px] font-semibold outline-none placeholder:text-gray-400 dark:bg-gray-900 dark:text-white",
            COLOR_TEXT[color],
          )}
        />

        <div className="rounded-2xl bg-white p-4 dark:bg-gray-900">
          <div className="grid grid-cols-6 gap-3">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={cn(
                  "mx-auto grid h-8 w-8 place-items-center rounded-full transition active:scale-90",
                  COLOR_BG[c],
                  color === c && "ring-2 ring-gray-300 ring-offset-2 dark:ring-offset-gray-900",
                )}
              >
                {color === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 dark:bg-gray-900">
          <div className="grid grid-cols-6 gap-3">
            {ICON_KEYS.map((k) => {
              const Ic = ICONS[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIcon(k)}
                  aria-label={k}
                  className={cn(
                    "mx-auto grid h-9 w-9 place-items-center rounded-full transition active:scale-90",
                    icon === k
                      ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800",
                  )}
                >
                  <Ic className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="px-1 text-sm text-red-500">{error}</p>}
      </div>
    </Sheet>
  );
}

// ===================== Ortak ====================
function Sheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="reveal max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[20px] bg-[#f2f2f7] sm:rounded-[20px] dark:bg-black">
        {children}
      </div>
    </div>
  );
}

function SheetBar({
  onCancel,
  title,
  actionLabel,
  onAction,
  actionDisabled,
}: {
  onCancel: () => void;
  title: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200/70 bg-[#f2f2f7]/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-black/90">
      <button type="button" onClick={onCancel} className="text-[16px] text-blue-500 active:opacity-60">
        İptal
      </button>
      <span className="text-[16px] font-semibold text-gray-900 dark:text-white">{title}</span>
      <button
        type="button"
        onClick={onAction}
        disabled={actionDisabled}
        className="text-[16px] font-semibold text-blue-500 active:opacity-60 disabled:opacity-40"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  iconBg,
  label,
  on,
  onChange,
}: {
  icon: ComponentType<LucideProps>;
  iconBg: string;
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md text-white", iconBg)}>
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <span className="flex-1 text-[16px] text-gray-900 dark:text-white">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200",
          on ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200",
            on && "translate-x-[20px]",
          )}
        />
      </button>
    </div>
  );
}
