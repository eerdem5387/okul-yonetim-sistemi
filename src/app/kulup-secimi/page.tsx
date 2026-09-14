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
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

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
      setError(`${club.name} kontenjanı dolu`)
      return
    }
    setError("")
    setSelected([...selected, club.id])
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
      setMessage("Kulüp seçimleri kaydedildi.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-4">
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
                {clubs.map((club) => {
                  const isSelected = selected.includes(club.id)
                  const shownFilled = club.filled + (isSelected && !club.selected ? 1 : 0)
                  const full = !isSelected && shownFilled >= club.capacity
                  return (
                    <button
                      key={club.id}
                      type="button"
                      disabled={full}
                      onClick={() => toggle(club)}
                      className={`w-full rounded-xl border-2 p-3 text-left ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : full
                            ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-70"
                            : "border-gray-200 bg-white"
                      }`}
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
