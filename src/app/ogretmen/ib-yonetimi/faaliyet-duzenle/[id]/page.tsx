import { redirect } from "next/navigation"

export default async function OgretmenIbFaaliyetDuzenleLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/faaliyet-yonetimi/duzenle/${id}`)
}
