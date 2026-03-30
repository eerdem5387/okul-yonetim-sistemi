"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { CategoryTiles } from "@/components/faaliyet-yonetimi/CategoryTiles"

const ALLOWED_ROLES = [
  "admin",
  "principal",
  "student_affairs",
  "counselor",
  "head_counselor",
  "teacher",
]

export interface FaaliyetEklePageProps {
  fallbackRedirect?: string
  /** Geri linki (dashboard / liste) */
  backHref?: string
  /** Geri link metni */
  backLabel?: string
  /** Sertifika form rotası öneki; örn. /faaliyet-yonetimi/yeni */
  certificateWizardBasePath?: string
}

export function FaaliyetEklePage({
  fallbackRedirect = "/",
  backHref = "/faaliyet-yonetimi",
  backLabel = "Faaliyet Yönetimi",
  certificateWizardBasePath = "/faaliyet-yonetimi/yeni",
}: FaaliyetEklePageProps) {
  const router = useRouter()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("auth_role") : null
    setHasAccess(role !== null && ALLOWED_ROLES.includes(role))
  }, [])

  useEffect(() => {
    if (hasAccess === false) {
      router.push(fallbackRedirect)
    }
  }, [hasAccess, fallbackRedirect, router])

  if (hasAccess === null) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">Yükleniyor...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasAccess === false) return null

  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto space-y-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold text-gray-600 hover:text-indigo-600 -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Faaliyet Oluşturma Modülü</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ana tür ve alt tür seçerek PDF sertifikası üretilen faaliyeti oluşturun.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tür seçimi</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <CategoryTiles basePath={certificateWizardBasePath} />
      </div>
    </div>
  )
}
