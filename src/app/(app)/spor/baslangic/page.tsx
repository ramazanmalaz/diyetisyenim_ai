import { WorkoutWizard } from "@/components/workout/workout-wizard";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Spor Asistanı — Başlangıç" };
// AI program üretimi uzun sürebilir; fonksiyon zaman aşımını yükselt.
export const maxDuration = 60;

export default async function SporBaslangicPage() {
  await requireProfile();
  return <WorkoutWizard />;
}
