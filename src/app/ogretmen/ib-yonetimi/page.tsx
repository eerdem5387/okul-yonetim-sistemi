"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { IBFaaliyetDashboard } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"
import { Loader2 } from "lucide-react"

export default function OgretmenIbYonetimiPage() {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const role = localStorage.getItem("auth_role")
    const staffId = localStorage.getItem("staff_id")
    if (role !== "teacher" || !staffId) {
      setHasAccess(false)
      router.push("/login")
      return
    }
    fetch(`/api/staff/${staffId}`)
      .then((res) => res.json())
      .then((data) => {
        setHasAccess(!!data.hasIbAccess)
        if (!data.hasIbAccess) router.push("/ogretmen")
      })
      .catch(() => {
        setHasAccess(false)
        router.push("/login")
      })
  }, [router])

  if (hasAccess === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (hasAccess === false) return null

  return (
    <div className="p-6">
      <IBFaaliyetDashboard
        faaliyetEkleHref="/ogretmen/ib-yonetimi/faaliyet-ekle"
        faaliyetDuzenleHref={(activityId) => `/faaliyet-yonetimi/duzenle/${activityId}`}
        studentDetailHref={(id) => `/ogretmen/ib-yonetimi/ogrenci/${id}`}
        showViewerButton={false}
      />
    </div>
  )
}
