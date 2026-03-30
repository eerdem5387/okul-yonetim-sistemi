import { FaaliyetDetay } from "@/components/faaliyet-yonetimi/FaaliyetDetay"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function FaaliyetDetayPage({ params }: PageProps) {
  const { id } = await params
  return (
    <div className="p-6">
      <FaaliyetDetay id={id} />
    </div>
  )
}
