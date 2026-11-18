import { redirect } from "next/navigation"

/** Eski öğretmen ders sayfası: "Yıllık planım"a taşındı. */
export default async function LegacyOgretmenDersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/ogretmen/neredeyiz?tab=plan&subjectId=${encodeURIComponent(id)}`)
}
