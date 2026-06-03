import { AiRulesEditor } from "@/components/admin/ai-rules-editor";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AiKurallariPage() {
  await requireStaff();

  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_rules")
    .select("key, content")
    .eq("key", "main")
    .single();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold">AI Kuralları</h1>
        <p className="text-gray-500">
          Beslenme asistanının danışanlara nasıl davranacağını buradan belirle.
        </p>
      </div>

      <AiRulesEditor ruleKey="main" initialContent={data?.content ?? ""} />
    </div>
  );
}
