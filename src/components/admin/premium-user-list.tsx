"use client";

import { Crown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  grantPremium,
  revokePremium,
} from "@/app/(admin)/yonetim/kullanicilar/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type UserRow = {
  id: string;
  name: string | null;
  role: UserRole;
  premiumUntil: string | null;
  email: string | null;
};

const ROLE_LABEL: Record<UserRole, string> = {
  client: "Danışan",
  dietitian: "Diyetisyen",
  admin: "Admin",
};

function isActive(until: string | null): boolean {
  return !!until && new Date(until).getTime() > Date.now();
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PremiumUserList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLocaleLowerCase("tr");
    if (!t) return users;
    return users.filter(
      (u) =>
        (u.name ?? "").toLocaleLowerCase("tr").includes(t) ||
        (u.email ?? "").toLocaleLowerCase("tr").includes(t),
    );
  }, [users, q]);

  async function run(
    id: string,
    fn: () => Promise<{ error: string } | { success: true }>,
  ) {
    setBusyId(id);
    setError(null);
    const res = await fn();
    setBusyId(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim veya e-posta ara…"
          className="pl-9"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {filtered.length === 0 && (
          <li className="rounded-xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800">
            Kullanıcı bulunamadı.
          </li>
        )}
        {filtered.map((u) => (
          <UserItem
            key={u.id}
            user={u}
            busy={busyId === u.id}
            onGrantDays={(days) =>
              run(u.id, () => grantPremium({ userId: u.id, days }))
            }
            onGrantUntil={(until) =>
              run(u.id, () => grantPremium({ userId: u.id, until }))
            }
            onRevoke={() => run(u.id, () => revokePremium({ userId: u.id }))}
          />
        ))}
      </ul>
    </div>
  );
}

function UserItem({
  user,
  busy,
  onGrantDays,
  onGrantUntil,
  onRevoke,
}: {
  user: UserRow;
  busy: boolean;
  onGrantDays: (days: number) => void;
  onGrantUntil: (until: string) => void;
  onRevoke: () => void;
}) {
  const [until, setUntil] = useState("");
  const active = isActive(user.premiumUntil);

  return (
    <li className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{user.name ?? "(isimsiz)"}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
          {user.email && (
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          )}
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            active
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
          )}
        >
          {active ? (
            <>
              <Crown className="h-3.5 w-3.5" /> Premium · {fmt(user.premiumUntil!)}
            </>
          ) : (
            "Ücretsiz"
          )}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onGrantDays(30)}
        >
          +30 gün
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => onGrantDays(365)}
        >
          +1 yıl
        </Button>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="w-40"
          />
          <Button
            type="button"
            disabled={busy || !until}
            onClick={() => onGrantUntil(until)}
          >
            Tarihe ayarla
          </Button>
        </div>

        {active && (
          <button
            type="button"
            disabled={busy}
            onClick={onRevoke}
            className="ml-auto text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
          >
            Premium kaldır
          </button>
        )}
      </div>
    </li>
  );
}
