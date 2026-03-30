import { FaaliyetForm } from "@/components/faaliyet-yonetimi/forms/FaaliyetForm"
import { MAIN_TYPE_LABELS, SUBTYPES_BY_MAIN_TYPE, type ActivityMainType } from "@/lib/activity-types-config"
import { notFound } from "next/navigation"

interface PageProps {
  params: Promise<{ mainType: string; subtype: string }>
}

export default async function YeniFaaliyetPage({ params }: PageProps) {
  const { mainType: rawMainType, subtype: subtypeId } = await params

  const mainType = rawMainType.toUpperCase() as ActivityMainType

  if (!Object.keys(MAIN_TYPE_LABELS).includes(mainType)) {
    notFound()
  }

  const subtypes = SUBTYPES_BY_MAIN_TYPE[mainType]
  const subtypeConfig = subtypes?.find((s) => s.id === subtypeId)

  if (!subtypeConfig) {
    notFound()
  }

  return <FaaliyetForm mainType={mainType} subtypeId={subtypeId} />
}
