"use client"

import { useCallback, useEffect, useState } from "react"
import { Archive, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

type BackupDetail = BackupSummary & {
  clubs: Array<{
    id: string
    name: string
    capacity: number
    members: Array<{ id: string; firstName: string; lastName: string; grade: string }>
  }>
}

export function ClubBackupButton() {
  const [open, setOpen] = useState(false)
  const [years, setYears] = useState<AcademicYear[]>([])
  const [backups, setBackups] = useState<BackupSummary[]>([])
  const [yearId, setYearId] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [replacePrompt, setReplacePrompt] = useState<BackupSummary | null>(null)
  const [detail, setDetail] = useState<BackupDetail | null>(null)

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
    if (open) void load()
  }, [open, load])

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
        setReplacePrompt(data.existing as BackupSummary)
        setSaving(false)
        return
      }
      if (!res.ok) throw new Error(data.error || "Yedek alınamadı")
      setReplacePrompt(null)
      setMessage(
        `${data.backup.academicYearName} kaydedildi: ${data.clubCount} kulüp, ${data.studentCount} öğrenci.`
      )
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yedek alınamadı")
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (id: string) => {
    setError("")
    setDetail(null)
    const res = await fetch(`/api/clubs/backups/${id}`)
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || "Yedek açılamadı")
      return
    }
    setDetail(data)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex-1 sm:flex-initial text-xs sm:text-sm"
      >
        <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
        <span className="hidden sm:inline">Yedekle</span>
        <span className="sm:hidden">Yedek</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Kapat"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Kulüp verisini yedekle</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Mevcut kulüpler ve seçimler seçilen akademik yılın kaydı olarak saklanır. Canlı liste değişmez.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Kapat
              </Button>
            </div>

            {loading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div>
                  <Label htmlFor="backup-year">Akademik yıl</Label>
                  <select
                    id="backup-year"
                    className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                    value={yearId}
                    onChange={(e) => {
                      setYearId(e.target.value)
                      setReplacePrompt(null)
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

                {replacePrompt && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Bu yıl için yedek var (
                    {new Date(replacePrompt.updatedAt).toLocaleString("tr-TR")}: {replacePrompt.clubCount} kulüp,{" "}
                    {replacePrompt.studentCount} öğrenci). Üzerine yazılsın mı?
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => void save(true)} disabled={saving}>
                        Üzerine yaz
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setReplacePrompt(null)}>
                        Vazgeç
                      </Button>
                    </div>
                  </div>
                )}

                <Button onClick={() => void save(false)} disabled={saving || !yearId}>
                  {saving ? "Yedekleniyor…" : "Mevcut veriyi bu yıl olarak kaydet"}
                </Button>

                {error && <p className="text-sm text-red-600">{error}</p>}
                {message && <p className="text-sm text-teal-700">{message}</p>}

                <div className="border-t pt-3">
                  <p className="text-sm font-medium text-gray-800">Kayıtlı yedekler</p>
                  {backups.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">Henüz yedek yok.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {backups.map((backup) => (
                        <li key={backup.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{backup.academicYearName}</p>
                            <p className="text-xs text-gray-500">
                              {backup.clubCount} kulüp · {backup.studentCount} öğrenci ·{" "}
                              {new Date(backup.updatedAt).toLocaleString("tr-TR")}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => void openDetail(backup.id)}>
                            Gör
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {detail && (
                  <div className="rounded-md border bg-gray-50 p-3">
                    <p className="text-sm font-medium">{detail.academicYearName}</p>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto">
                      {detail.clubs.map((club) => (
                        <div key={club.id}>
                          <p className="text-sm font-medium text-gray-800">
                            {club.name}{" "}
                            <span className="font-normal text-gray-500">
                              ({club.members.length}/{club.capacity})
                            </span>
                          </p>
                          <p className="text-xs text-gray-600">
                            {club.members.length === 0
                              ? "Öğrenci yok"
                              : club.members.map((m) => `${m.firstName} ${m.lastName} (${m.grade})`).join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
