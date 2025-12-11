"use client"

import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function RehberlikNeredeyizPage() {
  const router = useRouter()

  useEffect(() => {
    // Neredeyiz modülüne yönlendir (kendi sidebar'ı var)
    router.replace("/neredeyiz")
  }, [router])

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Yönlendiriliyor...</p>
        </div>
      </main>
    </div>
  )
}

