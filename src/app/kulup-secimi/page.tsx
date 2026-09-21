"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Club = {
  id: string
  name: string
  description: string | null
  capacity: number
  filled: number
  selected: boolean
  demanded?: boolean
}

type StudentBrief = {
  firstName: string
  lastName: string
  grade: string
}

export default function PublicClubSelectionPage() {
  const [tc, setTc] = useState("")
  const [student, setStudent] = useState<StudentBrief | null>(null)
  const [clubs, setClubs] = useState<Club[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [confirmReselect, setConfirmReselect] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [demandBusyId, setDemandBusyId] = useState<string | null>(null)

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      const res = await fetch("/api/clubs/public-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcNumber: tc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Öğrenci bulunamadı")
      setStudent(data.student)
      setClubs(data.clubs ?? [])
      setSelected(data.selectedClubIds ?? [])
      setSaved((data.selectedClubIds ?? []).length > 0)
      setConfirmReselect(false)
    } catch (e) {
      setStudent(null)
      setError(e instanceof Error ? e.message : "Öğrenci bulunamadı")
    } finally {
      setLoading(false)
    }
  }

  const toggle = (club: Club) => {
    setMessage("")
    if (selected.includes(club.id)) {
      setSelected(selected.filter((id) => id !== club.id))
      return
    }
    if (selected.length >= 3) {
      setError("En fazla 3 kulüp seçebilirsiniz")
      return
    }
    const alreadyMine = club.selected
    if (!alreadyMine && club.filled >= club.capacity) {
      setError(`${club.name} kontenjanı dolu — talep oluşturabilirsiniz`)
      return
    }
    setError("")
    setSelected([...selected, club.id])
  }

  const createDemand = async (club: Club) => {
    setDemandBusyId(club.id)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/clubs/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: club.id, tcNumber: tc }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || "Talep oluşturulamadı")
      }
      setClubs((prev) =>
        prev.map((c) => (c.id === club.id ? { ...c, demanded: true } : c))
      )
      setMessage(
        (data as { alreadyExists?: boolean }).alreadyExists
          ? `${club.name} için talebiniz zaten kayıtlı.`
          : `${club.name} için talebiniz alındı.`
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Talep oluşturulamadı")
    } finally {
      setDemandBusyId(null)
    }
  }

  const save = async () => {
    setSaving(true)
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/clubs/public-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcNumber: tc, clubIds: selected }),
      })
      const data = await res.json()
      if (!res.ok) {
        const full = Array.isArray(data.fullClubs) ? ` (${data.fullClubs.join(", ")})` : ""
        throw new Error((data.error || "Kaydedilemedi") + full)
      }
      setClubs(data.clubs ?? [])
      setSelected(data.selectedClubIds ?? [])
      setSaved((data.selectedClubIds ?? []).length > 0)
      setMessage("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kulüp seçimi</h1>
          <p className="mt-1 text-sm text-gray-600">
            Öğrenci TC kimlik numarasıyla giriş yapın. Veli hesabı gerekmez.
          </p>
        </div>

        {!student ? (
          <Card>
            <CardHeader>
              <CardTitle>Öğrenci TC</CardTitle>
              <CardDescription>11 haneli TC kimlik numarasını girin</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={lookup} className="space-y-3">
                <div>
                  <Label htmlFor="tc">TC Kimlik No</Label>
                  <Input
                    id="tc"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={11}
                    value={tc}
                    onChange={(e) => setTc(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="11 haneli TC"
                    className="mt-1"
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={loading || tc.length !== 11}>
                  {loading ? "Aranıyor…" : "Devam et"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : saved ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <Card className="order-2 lg:order-1">
              <CardHeader>
                <CardTitle>Kulüp seçiminiz kaydedildi</CardTitle>
                <CardDescription>
                  {student.firstName} {student.lastName} · {student.grade}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Seçimler kayda alındı. Değiştirmek için tekrar seçim yapın. Bu işlem mevcut kaydı siler.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStudent(null)
                    setClubs([])
                    setSelected([])
                    setSaved(false)
                    setTc("")
                    setError("")
                    setMessage("")
                    setConfirmReselect(false)
                  }}
                >
                  Başka öğrenci
                </Button>
              </CardContent>
            </Card>
            <div className="order-1 space-y-3 lg:order-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Seçilen kulüpler</CardTitle>
                  <CardDescription>{selected.length}/3</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {clubs
                    .filter((club) => selected.includes(club.id))
                    .map((club) => (
                      <div key={club.id} className="rounded-xl border border-green-200 bg-green-50 px-3 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900">{club.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-[11px] font-semibold text-white">
                            <Check className="h-3 w-3" />
                            Kayıtlı
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {club.filled}/{club.capacity}
                        </p>
                      </div>
                    ))}
                </CardContent>
              </Card>
              {!confirmReselect ? (
                <Button variant="outline" className="w-full" onClick={() => setConfirmReselect(true)}>
                  Tekrar seçim yap
                </Button>
              ) : (
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <p className="text-sm text-gray-700">
                      Tekrar seçim yapmak mevcut seçimlerini iptal edecektir. Onaylıyor musun?
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setConfirmReselect(false)}>
                        Vazgeç
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={saving}
                        onClick={() => {
                          void (async () => {
                            setSaving(true)
                            setError("")
                            try {
                              const res = await fetch("/api/clubs/public-selection", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tcNumber: tc, clubIds: [] }),
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || "Seçimler iptal edilemedi")
                              setClubs(data.clubs ?? [])
                              setSelected([])
                              setSaved(false)
                              setConfirmReselect(false)
                            } catch (e) {
                              setError(e instanceof Error ? e.message : "Seçimler iptal edilemedi")
                            } finally {
                              setSaving(false)
                            }
                          })()
                        }}
                      >
                        {saving ? "İptal ediliyor..." : "Onayla"}
                      </Button>
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {student.firstName} {student.lastName}
              </CardTitle>
              <CardDescription>
                {student.grade} · En fazla 3 kulüp ({selected.length}/3)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                {clubs.length === 0 && (
                  <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                    {student.grade} için açık kulüp yok.
                  </p>
                )}
                {clubs.map((club) => {
                  const isSelected = selected.includes(club.id)
                  const shownFilled = club.filled + (isSelected && !club.selected ? 1 : 0)
                  const full = !isSelected && shownFilled >= club.capacity
                  return (
                    <div
                      key={club.id}
                      className={`w-full rounded-xl border-2 p-3 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : full
                            ? "border-gray-200 bg-gray-50"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={full}
                        onClick={() => toggle(club)}
                        className={`w-full text-left ${full ? "cursor-default" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">{club.name}</p>
                            <p className="text-xs text-gray-500">
                              {Math.min(shownFilled, club.capacity)}/{club.capacity}
                              {full ? " · Dolu" : ""}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-xs text-white">
                              <Check className="h-3 w-3" /> Seçildi
                            </span>
                          )}
                        </div>
                      </button>
                      {full && (
                        <div className="mt-2">
                          {club.demanded ? (
                            <span className="text-xs font-medium text-teal-700">Talebiniz alındı</span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={demandBusyId === club.id}
                              onClick={() => void createDemand(club)}
                            >
                              {demandBusyId === club.id ? "Gönderiliyor…" : "Talep oluştur"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-teal-700">{message}</p>}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void save()} disabled={saving}>
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setStudent(null)
                    setClubs([])
                    setSelected([])
                    setTc("")
                    setError("")
                    setMessage("")
                  }}
                >
                  Başka öğrenci
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
