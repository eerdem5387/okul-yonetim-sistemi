import { redirect } from "next/navigation"

/** Eski "İlerleme" listesi: haftalık panoya taşındı. */
export default function LegacyIlerlemePage() {
  redirect("/neredeyiz")
}
