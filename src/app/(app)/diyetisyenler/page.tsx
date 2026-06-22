import { redirect } from "next/navigation";

// Diyetisyen listesi artık /diyetisyen-bul sayfasında. Eski bağlantılar için yönlendir.
export default function DietitiansPage() {
  redirect("/diyetisyen-bul");
}
