"use client"

import { FaaliyetPersonelIstatistik } from "@/components/faaliyet-yonetimi/FaaliyetPersonelIstatistik"

export default function PersonelIstatistikPage() {
  return (
    <div className="p-6">
      <FaaliyetPersonelIstatistik
        backHref="/faaliyet-yonetimi"
        detailHref={(id) => `/faaliyet-yonetimi/${id}`}
      />
    </div>
  )
}
