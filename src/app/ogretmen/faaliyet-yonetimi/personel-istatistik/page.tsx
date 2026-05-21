"use client"

import { FaaliyetPersonelIstatistik } from "@/components/faaliyet-yonetimi/FaaliyetPersonelIstatistik"

export default function OgretmenPersonelIstatistikPage() {
  return (
    <div className="p-6">
      <FaaliyetPersonelIstatistik
        backHref="/ogretmen/faaliyet-yonetimi"
        detailHref={(id) => `/faaliyet-yonetimi/${id}`}
        title="Faaliyet kayıtlarım"
        subtitle="Sorumlu öğretmen olarak kaydettiğiniz faaliyetler ve detayları"
      />
    </div>
  )
}
