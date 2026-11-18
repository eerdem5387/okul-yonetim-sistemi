import { redirect } from "next/navigation"

/** Eski "Gecikmeler" sayfası: geciken konular artık "Bu hafta" ekranının başında. */
export default function LegacyGecikmelerPage() {
  redirect("/ogretmen/neredeyiz")
}
