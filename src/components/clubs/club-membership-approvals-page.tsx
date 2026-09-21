"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { staffAuthHeaders } from "@/lib/permissions/client"

type MembershipRequest = {
  id: string
  changeType: "ADD" | "REMOVE"
  status: string
  createdAt: string
  note: string | null
  club: { id: string; name: string; capacity: number }
  student: { id: string; firstName: string; lastName: string; grade: string; tcNumber: string }
  requestedBy: { id: string; firstName: string; lastName: string }
}

export function ClubMembershipApprovalsPage({
  basePath,
}: {
  basePath: "/clubs" | "/rehberlik/clubs"
}) {
  const [requests, setRequests] = useState<MembershipRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/clubs/membership-requests?status=PENDING", {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Talepler alınamadı")
      const data = await res.json()
      setRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talepler alınamadı")
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusyId(id)
    try {
      const res = await fetch("/api/clubs/membership-requests", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, decision }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "İşlem başarısız")
        return
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4">
      <div>
        <Link href={basePath}>
          <Button variant="outline" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kulüp Yönetimine Dön
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Kulüp üyelik onayları</h1>
        <p className="text-sm text-gray-600 mt-1">
          Öğretmenlerin ekleme/çıkarma taleplerini onaylayın veya reddedin
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bekleyen talepler</CardTitle>
          <CardDescription>{requests.length} talep</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Yükleniyor...
            </div>
          ) : error ? (
            <p className="text-red-600 py-6 text-center">{error}</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">Bekleyen talep yok.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {row.changeType === "ADD" ? "Ekleme" : "Çıkarma"} · {row.club.name}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {row.student.firstName} {row.student.lastName} · {row.student.grade}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Talep: {row.requestedBy.firstName} {row.requestedBy.lastName} ·{" "}
                      {new Date(row.createdAt).toLocaleString("tr-TR")}
                    </p>
                    {row.note && <p className="text-xs text-gray-500 mt-1">Not: {row.note}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row.id, "approve")}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void decide(row.id, "reject")}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reddet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
