"use client"

import { useEffect, useState } from "react"
import { IBFaaliyetDashboard } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"
import { IbViewerManagementModal } from "@/components/faaliyet-yonetimi/IbViewerManagementModal"
import { canViewActivityStaffStats, fetchPermissionsMe } from "@/lib/permissions/client"

export default function FaaliyetYonetimiPage() {
  const [showViewerModal, setShowViewerModal] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [canManageViewers, setCanManageViewers] = useState(false)
  const [canViewStaffStats, setCanViewStaffStats] = useState(false)

  useEffect(() => {
    const role = localStorage.getItem("auth_role")
    setIsTeacher(role === "teacher")
    setCanManageViewers(role !== "teacher" && role !== null)
    fetchPermissionsMe().then((me) => setCanViewStaffStats(canViewActivityStaffStats(me)))
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
        personelIstatistikHref="/faaliyet-yonetimi/personel-istatistik"
        canViewStaffStats={canViewStaffStats}
        showViewerButton={canManageViewers}
        onViewerClick={() => setShowViewerModal(true)}
      />
      {showViewerModal && (
        <IbViewerManagementModal onClose={() => setShowViewerModal(false)} />
      )}
    </div>
  )
}
