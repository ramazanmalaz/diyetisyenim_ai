import { PomodoroTimer } from "@/components/app/pomodoro-timer";
import { requireProfile } from "@/lib/auth";

export const metadata = {
  title: "Odak (Pomodoro) — UzmanDiyet",
};

export default async function PomodoroPage() {
  await requireProfile();
  return <PomodoroTimer />;
}
