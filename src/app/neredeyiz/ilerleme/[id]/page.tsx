import { redirect } from "next/navigation"

/** Eski ders ilerleme sayfası: konu geçmişine taşındı. */
export default async function LegacyIlerlemeDetayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/neredeyiz/ders/${id}`)
}
