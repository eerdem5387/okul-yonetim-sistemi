"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

type AcademicYear = {
  id: string
  name: string
  isActive: boolean
}

type BackupSummary = {
  id: string
  academicYearId: string
  academicYearName: string
  createdAt: string
  updatedAt: string
  clubCount: number
  studentCount: number
}

export function ClubBackupPage({ basePath }: { basePath: "/clubs" | "/rehberlik/clubs" }) {
  const [years, setYears] = useState<AcademicYear[]>([])
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [yearId, setYearId] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [confirmReset, setConfirmReset] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [yearRes, backupRes] = await Promise.all([
        fetch("/api/neredeyiz/academic-years"),
        fetch("/api/clubs/backups"),
      ])
      if (!yearRes.ok) throw new Error("Akademik yıllar alınamadı")
      if (!backupRes.ok) throw new Error("Yedekler alınamadı")
      const yearData = (await yearRes.json()) as AcademicYear[]
      const backupData = (await backupRes.json()) as { backups: BackupSummary[] }
      const list = Array.isArray(yearData) ? yearData : []
      setYears(list)
      setBackups(backupData.backups ?? [])
      setYearId((current) => {
        if (current && list.some((y) => y.id === current)) return current
        return list.find((y) => y.isActive)?.id ?? list[0]?.id ?? ""
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veriler yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedYear = years.find((y) => y.id === yearId)
  const existingForYear = backups.find((b) => b.academicYearId === yearId)

  const save = async (replace: boolean) => {
    if (!yearId) {
      setError("Akademik yıl seçin")
      return
    }
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/clubs/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ academicYearId: yearId, replace }),
      })
      const data = await res.json()
      if (res.status === 409 && data.existing) {
        setReplaceExisting(true)
        setConfirmReset(true)
        setSaving(false)
        return
      }
      if (!res.ok) throw new Error(data.error || "Yedek alınamadı")
      setConfirmReset(false)
      setReplaceExisting(false)
      setMessage(
        `${data.backup.academicYearName} kaydedildi (${data.clubCount} kulüp, ${data.studentCount} öğrenci). Mevcut kulüpler sıfırlandı.`
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yedek alınamadı")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Link href={basePath}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kulüpler
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Kulüp yedeği</h1>
        <p className="mt-1 text-sm text-gray-600">
          Mevcut kulüpler ve seçimler seçilen akademik yılın kaydı olarak saklanır. Yedek alındıktan sonra canlı kulüp listesi tamamen sıfırlanır.
        </p>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yeni yedek</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="backup-year">Akademik yıl</Label>
                <select
                  id="backup-year"
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  value={yearId}
                  onChange={(e) => {
                    setYearId(e.target.value)
                    setConfirmReset(false)
                    setReplaceExisting(false)
                    setMessage("")
                  }}
                >
                  <option value="">Yıl seçin</option>
                  {years.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                      {year.isActive ? " (aktif)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {existingForYear && !confirmReset && (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-3">
                  Bu yıl için yedek var ({new Date(existingForYear.updatedAt).toLocaleString("tr-TR")}:{" "}
                  {existingForYear.clubCount} kulüp, {existingForYear.studentCount} öğrenci). Yeni yedek onun yerine geçer.
                </p>
              )}

              {confirmReset ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 space-y-3">
                  <p className="text-sm text-red-900">
                    {selectedYear?.name ?? "Seçilen yıl"} için yedek alınacak
                    {replaceExisting || existingForYear ? " ve önceki yedek silinecek" : ""}. Ardından mevcut kulüpler ve öğrenci seçimleri silinecek. Bu işlem geri alınamaz.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => void save(Boolean(existingForYear))} disabled={saving}>
                      {saving ? "Kaydediliyor…" : "Yedekle ve sıfırla"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfirmReset(false)
                        setReplaceExisting(false)
                      }}
                      disabled={saving}
                    >
                      Vazgeç
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setConfirmReset(true)} disabled={!yearId}>
                  Mevcut veriyi bu yıl olarak kaydet
                </Button>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-teal-700">{message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kayıtlı yedekler</CardTitle>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz yedek yok.</p>
              ) : (
                <ul className="divide-y">
                  {backups.map((backup) => (
                    <li key={backup.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{backup.academicYearName}</p>
                        <p className="text-sm text-gray-500">
                          {backup.clubCount} kulüp · {backup.studentCount} öğrenci ·{" "}
                          {new Date(backup.updatedAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                      <Link href={`${basePath}/yedek/${backup.id}`}>
                        <Button size="sm" variant="outline">
                          Aç
                        </Button>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
