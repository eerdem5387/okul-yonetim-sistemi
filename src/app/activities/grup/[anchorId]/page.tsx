"use client"

import { useParams } from "next/navigation"
import { ActivitiesGrupDetay } from "@/components/ib-faaliyet-dashboard/ActivitiesGrupDetay"

export default function ActivitiesGrupPage() {
  const params = useParams()
  const anchorId = typeof params.anchorId === "string" ? params.anchorId : ""
  if (!anchorId) return null
  return (
    <div className="p-6">
      <ActivitiesGrupDetay anchorId={anchorId} />
    </div>
  )
}
