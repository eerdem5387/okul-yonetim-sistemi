"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Users,
  FileDown,
  Pencil,
  ChevronRight,
  MapPin,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnchorInfo {
  id: string
  title: string
  type: string
  category: string | null
  activityDate: string
  location: string | null
  organizer: string | null
  description: string | null
}

interface MemberRow {
  id: string
  studentId: string
  verificationStatus: string
  participationPhotoUrl: string | null
  signedDocumentUrls: string[]
  student: {
    id: string
    firstName: string
    lastName: string
    grade: string
    tcNumber: string
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

function GrupPdfButton({ activityId }: { activityId: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      variant="outline"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        try {
          const res = await fetch(`/api/activities/${activityId}/pdf`, { headers: getAuthHeaders() })
          if (!res.ok) throw new Error("PDF alınamadı")
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `faaliyet-${activityId.slice(0, 8)}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        } catch {
          alert("PDF indirilemedi")
        } finally {
          setLoading(false)
        }
      }}
    >
      <FileDown className="h-4 w-4 mr-2" />
      {loading ? "İndiriliyor…" : "Örnek PDF (ilk kayıt)"}
    </Button>
  )
}

const TYPE_LABELS: Record<string, string> = {
  ETKINLIK: "Etkinlik",
  GEZI: "Gezi",
  PROJE: "Proje",
  SINAV: "Sınav",
  YARISMA: "Yarışma",
  SEMINER: "Seminer",
  WORKSHOP: "Workshop",
  SPORT: "Spor",
  SANAT: "Sanat",
  SOSYAL: "Sosyal",
  DIL: "Dil",
  BILIM: "Bilim",
  DEGER: "Değerler",
  DIGER: "Diğer",
}

interface ActivitiesGrupDetayProps {
  anchorId: string
  listHref?: string
  listLabel?: string
}

export function ActivitiesGrupDetay({
  anchorId,
  listHref = "/activities",
  listLabel = "IB Faaliyet Yönetimi",
}: ActivitiesGrupDetayProps) {
  const [anchor, setAnchor] = useState<AnchorInfo | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/activities/group-members?anchorId=${encodeURIComponent(anchorId)}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Yüklenemedi")
      }
      const data = await res.json()
      setAnchor(data.anchor)
      setMembers(data.members ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [anchorId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error || !anchor) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center text-red-600">
        <p>{error || "Grup bulunamadı"}</p>
        <Link href={listHref} className="mt-4 inline-block text-indigo-600 underline text-sm">
          {listLabel}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <Link
          href={listHref}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {listLabel}
        </Link>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-sky-600 to-indigo-800 p-6 text-white shadow-xl">
        <p className="text-sky-200 text-sm font-medium mb-1">Klasik IB kaydı — gruplu görünüm</p>
        <h1 className="text-2xl font-bold">{anchor.title}</h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-sky-100">
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1">
            <Calendar className="h-4 w-4" />
            {new Date(anchor.activityDate).toLocaleDateString("tr-TR")}
          </span>
          <span className="rounded-lg bg-white/10 px-3 py-1">{TYPE_LABELS[anchor.type] ?? anchor.type}</span>
          {anchor.category && (
            <span className="rounded-lg bg-white/10 px-3 py-1 capitalize">{anchor.category}</span>
          )}
        </div>
        {(anchor.location || anchor.organizer) && (
          <div className="mt-4 grid gap-2 text-sm text-sky-100">
            {anchor.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                {anchor.location}
              </div>
            )}
            {anchor.organizer && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0" />
                {anchor.organizer}
              </div>
            )}
          </div>
        )}
        {anchor.description && (
          <p className="mt-4 text-sm text-sky-100/90 leading-relaxed border-t border-white/10 pt-4">
            {anchor.description}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <h2 className="font-semibold text-gray-900">Katılan öğrenciler</h2>
          <span className="ml-auto text-xs font-medium text-gray-500">{members.length} kişi</span>
        </div>
        <ul className="divide-y divide-gray-50">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/activities/kayit/${m.id}?from=grup&anchor=${encodeURIComponent(anchorId)}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-indigo-50/40 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {m.participationPhotoUrl ? (
                    <img
                      src={m.participationPhotoUrl}
                      alt=""
                      className="h-14 w-14 rounded-xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-gray-100 border border-dashed border-gray-200" />
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {m.student.firstName} {m.student.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {m.student.grade} · {m.student.tcNumber}
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">Bu öğrencinin kaydı ve belgeleri →</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <GrupPdfButton activityId={anchor.id} />
        <Link
          href={`/faaliyet-duzenle/${anchor.id}`}
          className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Grubu düzenle (ilk kayıt)
        </Link>
      </div>
    </div>
  )
}
