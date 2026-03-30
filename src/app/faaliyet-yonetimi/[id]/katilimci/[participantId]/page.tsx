import { FaaliyetKatilimciDetay } from "@/components/faaliyet-yonetimi/FaaliyetKatilimciDetay"

interface PageProps {
  params: Promise<{ id: string; participantId: string }>
}

export default async function FaaliyetKatilimciPage({ params }: PageProps) {
  const { id, participantId } = await params
  return (
    <div className="p-6">
      <FaaliyetKatilimciDetay eventId={id} participantId={participantId} />
    </div>
  )
}
