"use client"

import { useEffect, useState } from "react"
import { IBFaaliyetDashboard } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"

export default function FaaliyetYonetimiPage() {
  const [isTeacher, setIsTeacher] = useState(false)
  useEffect(() => {
    setIsTeacher(typeof window !== "undefined" && localStorage.getItem("auth_role") === "teacher")
  }, [])

  return (
    <div className="p-6">
      <IBFaaliyetDashboard
        title="Faaliyet Yönetimi"
        subtitle="Öğrenci faaliyetlerini görüntüleyin; imza, onay ve doğrulama süreçlerini takip edin"
        faaliyetEkleHref="/faaliyet-ekle"
        faaliyetDuzenleHref={(activityId) => `/faaliyet-yonetimi/duzenle/${activityId}`}
        studentDetailHref={(id) =>
          isTeacher ? `/ogretmen/ib-yonetimi/ogrenci/${id}` : `/activities/student/${id}`
        }
        showViewerButton={false}
      />
    </div>
  )
}
