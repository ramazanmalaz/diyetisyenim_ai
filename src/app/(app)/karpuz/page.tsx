import { WatermelonScanner } from "@/components/watermelon/watermelon-scanner";
import { requireProfile } from "@/lib/auth";

export const metadata = {
  title: "Karpuz Seçici — UzmanDiyet",
};

export default async function KarpuzPage() {
  await requireProfile();
  return <WatermelonScanner />;
}
