"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { FaaliyetForm } from "@/components/faaliyet-yonetimi/forms/FaaliyetForm"
import { SUBTYPES_BY_MAIN_TYPE, type ActivityMainType } from "@/lib/activity-types-config"

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export default function FaaliyetDuzenleWizardPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const [mainType, setMainType] = useState<ActivityMainType | null>(null)
  const [subtypeId, setSubtypeId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/activity-events/${id}`, { headers: getAuthHeaders() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || "Faaliyet yüklenemedi")
        }
        if (cancelled) return
        const mt = data.mainType as ActivityMainType
        setMainType(mt)
        const sub = (data.subtype as string | null) || ""
        if (sub) {
          setSubtypeId(sub)
        } else {
          const first = SUBTYPES_BY_MAIN_TYPE[mt]?.[0]?.id ?? ""
          setSubtypeId(first)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Hata")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  if (!id) {
    return (
      <div className="p-6 text-center text-red-600">
        Geçersiz adres
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !mainType || !subtypeId) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4 text-center">
        <p className="text-red-600">{error || "Bu faaliyet türü düzenleme formuyla eşleştirilemedi."}</p>
        <Link href="/faaliyet-yonetimi" className="text-indigo-600 text-sm underline inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Faaliyet yönetimine dön
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="px-6 pt-4 max-w-3xl mx-auto">
        <Link
          href={`/faaliyet-yonetimi/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Faaliyet detayına dön
        </Link>
      </div>
      <FaaliyetForm mainType={mainType} subtypeId={subtypeId} editEventId={id} />
    </div>
  )
}
