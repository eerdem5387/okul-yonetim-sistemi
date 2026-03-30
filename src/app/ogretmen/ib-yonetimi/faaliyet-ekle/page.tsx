"use client"

import { FaaliyetEklePage } from "@/components/faaliyet-ekle/FaaliyetEklePage"

export default function OgretmenFaaliyetEklePage() {
  return (
    <FaaliyetEklePage
      fallbackRedirect="/ogretmen"
      backHref="/ogretmen/ib-yonetimi"
      backLabel="IB Yönetimi"
      certificateWizardBasePath="/faaliyet-yonetimi/yeni"
    />
  )
}
