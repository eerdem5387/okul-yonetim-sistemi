import { redirect } from "next/navigation"

export default async function ActivitiesStudentLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/faaliyet-yonetimi/ogrenci/${id}`)
}
