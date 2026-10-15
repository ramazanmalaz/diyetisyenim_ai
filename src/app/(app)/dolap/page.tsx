import { FridgeChef } from "@/components/fridge/fridge-chef";
import { requireProfile } from "@/lib/auth";

export const metadata = {
  title: "Dolabımda Ne Var? — UzmanDiyet",
};

export default async function DolapPage() {
  await requireProfile();
  return <FridgeChef />;
}
