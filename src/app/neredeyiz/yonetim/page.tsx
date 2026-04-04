"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

/** Eski URL: yönetim Ayarlar sayfasına taşındı. */
export default function NeredeyizYonetimRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/yonetim/ayarlar")
  }, [router])
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-gray-600">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm">Ayarlar sayfasına yönlendiriliyorsunuz…</p>
      </div>
    </div>
  )
}
