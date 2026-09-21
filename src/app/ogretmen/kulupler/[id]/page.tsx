"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2, Search, UserMinus, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formatClubGradeLevels, clubMatchesStudentGrade } from "@/lib/club-grade-levels"
import { staffAuthHeaders } from "@/lib/permissions/client"

type Student = {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

type Club = {
  id: string
  name: string
  description: string | null
  capacity: number
  gradeLevels: number[]
  instructorId?: string | null
  selections: Array<{ id: string; student: Student }>
  membershipRequests?: Array<{
    id: string
    changeType: "ADD" | "REMOVE"
    student: { id: string; firstName: string; lastName: string; grade: string }
  }>
}

export default function OgretmenKulupDetailPage() {
  const params = useParams()
  const clubId = String(params?.id || "")
  const [club, setClub] = useState<Club | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const load = useCallback(async () => {
    if (!clubId) return
    setLoading(true)
    setError("")
    try {
      const [clubRes, studentsRes, mineRes] = await Promise.all([
        fetch(`/api/clubs/${clubId}`, { cache: "no-store" }),
        fetch("/api/students?limit=2000&gradeBand=k12", { cache: "no-store" }),
        fetch("/api/clubs/instructor", { headers: staffAuthHeaders(), cache: "no-store" }),
      ])
      if (!clubRes.ok) throw new Error("Kulüp bulunamadı")
      const clubData = await clubRes.json()
      const mine = mineRes.ok ? await mineRes.json() : { clubs: [] }
      const allowed = (mine.clubs || []).some((c: { id: string }) => c.id === clubId)
      if (!allowed) {
        setError("Bu kulüp size atanmamış")
        setClub(null)
        return
      }
      setClub(clubData)
      const sData = studentsRes.ok ? await studentsRes.json() : { students: [] }
      setStudents(Array.isArray(sData.students) ? sData.students : Array.isArray(sData) ? sData : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi")
      setClub(null)
    } finally {
      setLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    void load()
  }, [load])

  const memberIds = useMemo(
    () => new Set(club?.selections.map((s) => s.student.id) ?? []),
    [club]
  )

  const pendingStudentIds = useMemo(() => {
    const set = new Set<string>()
    for (const req of club?.membershipRequests ?? []) set.add(req.student.id)
    return set
  }, [club])

  const candidates = useMemo(() => {
    if (!club) return []
    const q = search.trim().toLocaleLowerCase("tr-TR")
    return students.filter((s) => {
      if (memberIds.has(s.id)) return false
      if (!clubMatchesStudentGrade(club.gradeLevels, s.grade)) return false
      if (!q) return true
      const full = `${s.firstName} ${s.lastName}`.toLocaleLowerCase("tr-TR")
      return full.includes(q) || s.tcNumber.includes(q) || s.grade.toLocaleLowerCase("tr-TR").includes(q)
    })
  }, [students, club, memberIds, search])

  const requestChange = async (studentId: string, changeType: "ADD" | "REMOVE") => {
    setBusy(true)
    setMessage("")
    setError("")
    try {
      const res = await fetch("/api/clubs/instructor", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, studentId, changeType }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((data as { error?: string }).error || "Talep gönderilemedi")
        return
      }
      setMessage((data as { message?: string }).message || "Talep onaya gönderildi")
      await load()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gray-500 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Yükleniyor...
      </div>
    )
  }

  if (error && !club) {
    return (
      <div className="p-6 space-y-3">
        <Link href="/ogretmen/kulupler">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Geri
          </Button>
        </Link>
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!club) return null

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <Link href="/ogretmen/kulupler">
          <Button variant="outline" size="sm" className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kulüplerim
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{club.name}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {club.selections.length}/{club.capacity} · {formatClubGradeLevels(club.gradeLevels)}
        </p>
        <p className="text-xs text-amber-700 mt-2">
          Ekleme ve çıkarma talepleri yönetim onayına düşer; onaylanınca kulübe yansır.
        </p>
      </div>

      {message && <p className="text-sm text-teal-700 bg-teal-50 rounded-lg px-3 py-2">{message}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {(club.membershipRequests?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bekleyen taleplerim</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {club.membershipRequests!.map((req) => (
              <div key={req.id} className="text-sm rounded-lg border px-3 py-2 bg-amber-50 border-amber-100">
                {req.changeType === "ADD" ? "Ekleme" : "Çıkarma"}: {req.student.firstName}{" "}
                {req.student.lastName} ({req.student.grade})
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kulüp üyeleri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[28rem] overflow-y-auto">
            {club.selections.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz üye yok.</p>
            ) : (
              club.selections.map((sel) => (
                <div
                  key={sel.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {sel.student.firstName} {sel.student.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{sel.student.grade}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || pendingStudentIds.has(sel.student.id)}
                    onClick={() => void requestChange(sel.student.id, "REMOVE")}
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    Çıkar
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Öğrenci ekle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ad, TC veya sınıf ara"
                className="pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
            <div className="space-y-2 max-h-[24rem] overflow-y-auto">
              {candidates.slice(0, 50).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {s.grade} · {s.tcNumber}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={busy || pendingStudentIds.has(s.id) || club.selections.length >= club.capacity}
                    onClick={() => void requestChange(s.id, "ADD")}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Ekle
                  </Button>
                </div>
              ))}
              {candidates.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">Uygun öğrenci bulunamadı.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
