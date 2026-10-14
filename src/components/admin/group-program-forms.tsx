"use client";

import { FileUp } from "lucide-react";
import { useActionState } from "react";

import {
  saveProgram,
  uploadProgram,
  type AssistantActionResult,
} from "@/app/(admin)/yonetim/gruplar/assistant-actions";
import { Button } from "@/components/ui/button";

function Feedback({ state }: { state: AssistantActionResult | null }) {
  if (!state) return null;
  if ("error" in state) return <p className="text-sm text-red-600">{state.error}</p>;
  return state.message ? <p className="text-sm text-emerald-700">{state.message}</p> : null;
}

/** Haftalık liste PDF'i/fotoğrafı yükler; asistan okuyup taslak oluşturur. */
export function GroupProgramUpload({ groupId }: { groupId: string }) {
  const [state, action, pending] = useActionState<AssistantActionResult | null, FormData>(
    uploadProgram,
    null,
  );

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="group_id" value={groupId} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 dark:file:bg-emerald-950/50 dark:file:text-emerald-300"
        />
        <Button type="submit" disabled={pending}>
          <FileUp className="mr-1.5 h-4 w-4" />
          {pending ? "Liste okunuyor…" : "Yükle ve oku"}
        </Button>
      </div>
      <p className="text-xs text-gray-500">PDF veya fotoğraf, en fazla 4 MB. Asistan metne çevirir; yayınlamadan önce kontrol edersin.</p>
      <Feedback state={state} />
    </form>
  );
}

/** Okunan liste metnini düzenler; "Yayınla" gruba duyurur ve asistanın kaynağı yapar. */
export function GroupProgramEditor({
  groupId,
  programId,
  title,
  content,
  isActive,
}: {
  groupId: string;
  programId: string;
  title: string;
  content: string;
  isActive: boolean;
}) {
  const [state, action, pending] = useActionState<AssistantActionResult | null, FormData>(
    saveProgram,
    null,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="group_id" value={groupId} />
      <input type="hidden" name="program_id" value={programId} />
      <input
        name="title"
        defaultValue={title}
        required
        aria-label="Liste başlığı"
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-950"
      />
      <textarea
        name="content"
        defaultValue={content}
        required
        rows={12}
        aria-label="Liste metni"
        className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed dark:border-gray-700 dark:bg-gray-950"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" name="intent" value="publish" disabled={pending}>
          {isActive ? "Güncelle ve yeniden duyur" : "Yayınla ve gruba duyur"}
        </Button>
        <Button type="submit" name="intent" value="save" variant="outline" disabled={pending}>
          Taslağı kaydet
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  );
}
