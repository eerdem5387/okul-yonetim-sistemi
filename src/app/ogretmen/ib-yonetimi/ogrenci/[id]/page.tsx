import { redirect } from "next/navigation"

export default async function OgretmenIbOgrenciLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/ogretmen/faaliyet-yonetimi/ogrenci/${id}`)
}
