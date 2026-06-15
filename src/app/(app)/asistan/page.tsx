import { AssistantChat } from "@/components/ai/assistant-chat";
import { MedicalDisclaimer } from "@/components/medical-disclaimer";
import { requireProfile } from "@/lib/auth";

export default async function AsistanPage() {
  await requireProfile();

  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <h1 className="font-semibold">Beslenme Asistanı</h1>
        <MedicalDisclaimer />
      </div>
      <AssistantChat />
    </div>
  );
}
