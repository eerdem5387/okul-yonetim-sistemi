"use client"

import { IBFaaliyetDashboard } from "@/components/ib-faaliyet-dashboard/IBFaaliyetDashboard"

export default function FaaliyetYonetimiPage() {
  return (
    <div className="p-6">
      <IBFaaliyetDashboard
        title="Faaliyet Yönetimi"
        subtitle="Öğrenci faaliyetlerini görüntüleyin; imza, onay ve doğrulama süreçlerini takip edin"
        faaliyetEkleHref="/faaliyet-ekle"
        studentDetailHref={(id) => `/activities/student/${id}`}
        showViewerButton={false}
      />
    </div>
  )
}
