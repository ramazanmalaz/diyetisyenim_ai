import { AssistantChat } from "@/components/ai/assistant-chat";
import { requireProfile } from "@/lib/auth";

export default async function AsistanPage() {
  await requireProfile();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h1 className="font-semibold">Beslenme Asistanı</h1>
        <p className="text-xs text-gray-500">
          Yapay zekâ destekli yanıtlar bilgilendirme amaçlıdır; kişisel planın
          diyetisyenin tarafından belirlenir.
        </p>
      </div>
      <AssistantChat />
    </div>
  );
}
