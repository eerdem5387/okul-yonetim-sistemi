"use client"

import { useEffect, useState } from "react"
import { IBFaaliyetDashboard } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"
import { IbViewerManagementModal } from "@/components/faaliyet-yonetimi/IbViewerManagementModal"

export default function FaaliyetYonetimiPage() {
  const [showViewerModal, setShowViewerModal] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [canManageViewers, setCanManageViewers] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("auth_role")
    setIsTeacher(role === "teacher")
    setCanManageViewers(role !== "teacher" && role !== null)
  }, [])

  return (
    <div className="p-6">
      <IBFaaliyetDashboard
        title="Faaliyet Yönetimi"
        subtitle="Öğrenci faaliyetlerini görüntüleyin; imza, onay ve doğrulama süreçlerini takip edin"
        faaliyetEkleHref="/faaliyet-ekle"
        faaliyetDuzenleHref={(activityId) => `/faaliyet-yonetimi/duzenle/${activityId}`}
        studentDetailHref={(id) =>
          isTeacher ? `/ogretmen/faaliyet-yonetimi/ogrenci/${id}` : `/faaliyet-yonetimi/ogrenci/${id}`
        }
        showViewerButton={canManageViewers}
        onViewerClick={() => setShowViewerModal(true)}
      />
      {showViewerModal && (
        <IbViewerManagementModal onClose={() => setShowViewerModal(false)} />
      )}
    </div>
  )
}
