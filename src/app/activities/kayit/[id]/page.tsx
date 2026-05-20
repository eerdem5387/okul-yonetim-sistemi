import { redirect } from "next/navigation"

export default async function ActivitiesKayitLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/faaliyet-yonetimi/${id}`)
}
