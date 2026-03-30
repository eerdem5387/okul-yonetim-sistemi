"use client"

import { Suspense } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { LegacyActivityKayitDetay } from "@/components/ib-faaliyet-dashboard/LegacyActivityKayitDetay"
import { Loader2 } from "lucide-react"

function LegacyActivityKayitInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = typeof params.id === "string" ? params.id : ""
  const fromGrup = searchParams.get("from") === "grup"
  const anchorId = searchParams.get("anchor") || ""
  const fromStudent = searchParams.get("from") === "student"
  const studentId = searchParams.get("studentId") || ""

  if (!id) return null

  const backHref =
    fromGrup && anchorId
      ? `/activities/grup/${anchorId}`
      : fromStudent && studentId
        ? `/activities/student/${studentId}`
        : undefined
  const backLabel = fromGrup
    ? "Faaliyet grubuna dön"
    : fromStudent
      ? "Öğrenciye dön"
      : "Öğrenciye dön"

  return <LegacyActivityKayitDetay activityId={id} backHref={backHref} backLabel={backLabel} />
}

export default function LegacyActivityKayitPage() {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        }
      >
        <LegacyActivityKayitInner />
      </Suspense>
    </div>
  )
}
