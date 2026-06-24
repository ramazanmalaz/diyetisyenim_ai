import { WorkoutWizard } from "@/components/workout/workout-wizard";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Spor Asistanı — Başlangıç" };

export default async function SporBaslangicPage() {
  await requireProfile();
  return <WorkoutWizard />;
}
