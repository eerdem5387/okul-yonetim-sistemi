"use client"

import { FaaliyetEkleContent } from "@/components/ib-activities/FaaliyetEkleContent"

/** Faaliyet Ekle – admin, principal, student_affairs, counselor, head_counselor kendi panelinden bu URL ile erişir (ana sidebar). */
export default function FaaliyetEklePage() {
  return <FaaliyetEkleContent fallbackRedirect="/" />
}
