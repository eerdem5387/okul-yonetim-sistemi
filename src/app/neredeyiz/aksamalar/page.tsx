"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/toast"
import { getAuthHeaders } from "@/components/hr/hr-utils"
import { Loader2 } from "lucide-react"

type Year = { id: string; name: string; isActive: boolean }
type Disruption = {
  id: string
  type: string
  scope: string
  reason: string
  startDate: string
  endDate: string
}
type Opt = { id: string; label: string }

const TYPES = [
  { id: "PLANDISI_DOGAL", label: "Plansız / doğal (kar, sel…)" },
  { id: "PLANLI_OKUL", label: "Okul kaynaklı (gezi, tören…)" },
  { id: "OGRETMEN_KAYNAKLI", label: "Öğretmen kaynaklı" },
]
const SCOPES = [
  { id: "SCHOOL", label: "Tüm okul" },
  { id: "CLASSES", label: "Seçili sınıflar" },
  { id: "SUBJECTS", label: "Seçili dersler" },
  { id: "TEACHER", label: "Seçili öğretmen" },
]

export default function AksamalarPage() {
  const { success, error } = useToast()
  const [years, setYears] = useState<Year[]>([])
  const [yearId, setYearId] = useState("")
  const [rows, setRows] = useState<Disruption[]>([])
  const [classes, setClasses] = useState<Opt[]>([])
  const [subjects, setSubjects] = useState<Opt[]>([])
  const [teachers, setTeachers] = useState<Opt[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    type: "PLANDISI_DOGAL",
    scope: "SCHOOL",
    reason: "",
    startDate: "",
    endDate: "",
    ids: [] as string[],
  })

  useEffect(() => {
    fetch("/api/neredeyiz/academic-years")
      .then((r) => r.json())
      .then((data: Year[]) => {
        setYears(data)
        const active = data.find((y) => y.isActive) || data[0]
        if (active) setYearId(active.id)
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!yearId) return
    fetch(`/api/neredeyiz/disruptions?academicYearId=${yearId}`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
    fetch(`/api/classes?academicYearId=${yearId}`)
      .then((r) => r.json())
      .then((d) =>
        setClasses(
          (d.classes || []).map((c: { id: string; name: string }) => ({ id: c.id, label: c.name }))
        )
      )
    fetch(`/api/neredeyiz/subjects?academicYearId=${yearId}`)
      .then((r) => r.json())
      .then((d) =>
        setSubjects(
          (Array.isArray(d) ? d : []).map((s: { id: string; name: string; grade: number; section: string | null }) => ({
            id: s.id,
            label: `${s.grade}${s.section ? "/" + s.section : ""} ${s.name}`,
          }))
        )
      )
    fetch("/api/staff/pickers?type=teachers", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        const list = d.staff || d.teachers || d || []
        setTeachers(
          (Array.isArray(list) ? list : []).map((s: { id: string; firstName: string; lastName: string }) => ({
            id: s.id,
            label: `${s.firstName} ${s.lastName}`,
          }))
        )
      })
      .catch(() => setTeachers([]))
  }, [yearId])

  const options = form.scope === "CLASSES" ? classes : form.scope === "SUBJECTS" ? subjects : teachers

  async function save() {
    const body: Record<string, unknown> = {
      academicYearId: yearId,
      type: form.type,
      scope: form.scope,
      reason: form.reason,
      startDate: form.startDate,
      endDate: form.endDate,
    }
    if (form.scope === "CLASSES") body.affectedClassIds = form.ids
    if (form.scope === "SUBJECTS") body.affectedSubjects = form.ids
    if (form.scope === "TEACHER") body.affectedStaffIds = form.ids
    const res = await fetch("/api/neredeyiz/disruptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) {
      error(data.error || "Kaydedilemedi")
      return
    }
    success("Aksama eklendi")
    setForm({ ...form, reason: "", ids: [] })
    const list = await fetch(`/api/neredeyiz/disruptions?academicYearId=${yearId}`).then((r) => r.json())
    setRows(list)
  }

  async function remove(id: string) {
    await fetch(`/api/neredeyiz/disruptions/${id}`, { method: "DELETE" })
    setRows((cur) => cur.filter((r) => r.id !== id))
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Aksamalar</h1>
      <p className="text-sm text-gray-600">
        Plansız veya sonradan oluşan durumlar. Akademik takvime yazılmaz; sınıf planında görünür.
      </p>
      <select
        className="h-10 border rounded-md px-2 text-sm"
        value={yearId}
        onChange={(e) => setYearId(e.target.value)}
      >
        {years.map((y) => (
          <option key={y.id} value={y.id}>
            {y.name}
          </option>
        ))}
      </select>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hızlı kayıt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <select
            className="h-10 border rounded-md px-2 text-sm w-full"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="h-10 border rounded-md px-2 text-sm w-full"
            value={form.scope}
            onChange={(e) => setForm({ ...form, scope: e.target.value, ids: [] })}
          >
            {SCOPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {form.scope !== "SCHOOL" && (
            <div className="max-h-40 overflow-auto border rounded p-2 space-y-1">
              {options.map((o) => (
                <label key={o.id} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ids.includes(o.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ids: e.target.checked ? [...form.ids, o.id] : form.ids.filter((id) => id !== o.id),
                      })
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}
          <Input
            placeholder="Sebep"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Button size="sm" onClick={() => void save()}>
            Kaydet
          </Button>
        </CardContent>
      </Card>

      <ul className="divide-y border rounded-md">
        {rows.map((r) => (
          <li key={r.id} className="p-3 text-sm flex justify-between gap-2">
            <div>
              <p className="font-medium">{r.reason}</p>
              <p className="text-gray-500">
                {r.scope} · {r.startDate.slice(0, 10)} – {r.endDate.slice(0, 10)}
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void remove(r.id)}>
              Sil
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
