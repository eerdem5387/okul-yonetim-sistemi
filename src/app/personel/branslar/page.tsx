"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpen, Loader2, Plus, Search, Trash2, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getAuthHeaders } from "@/components/hr/hr-utils"

type BranchTeacher = {
  id: string
  firstName: string
  lastName: string
  department: string
  isActive: boolean
}

type Branch = {
  id: string
  name: string
  isActive: boolean
  sortOrder: number
  staffLinks?: Array<{ staff: BranchTeacher }>
  _count?: { staffLinks: number }
}

type Teacher = {
  id: string
  firstName: string
  lastName: string
  subject?: string | null
}

export default function BranslarPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [newName, setNewName] = useState("")
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])
  const [teacherQuery, setTeacherQuery] = useState("")
  const [modalBusy, setModalBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, tRes] = await Promise.all([
        fetch("/api/branches?withTeachers=1", { cache: "no-store" }),
        fetch("/api/staff/pickers?type=teachers", { headers: getAuthHeaders() }),
      ])
      const bData = bRes.ok ? await bRes.json() : { branches: [] }
      const tData = tRes.ok ? await tRes.json() : { staff: [] }
      setBranches(Array.isArray(bData.branches) ? bData.branches : [])
      setTeachers(Array.isArray(tData.staff) ? tData.staff : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr-TR")
    if (!q) return branches
    return branches.filter((b) => b.name.toLocaleLowerCase("tr-TR").includes(q))
  }, [branches, search])

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLocaleLowerCase("tr-TR")
    if (!q) return teachers
    return teachers.filter((t) => {
      const full = `${t.firstName} ${t.lastName}`.toLocaleLowerCase("tr-TR")
      const subject = (t.subject || "").toLocaleLowerCase("tr-TR")
      return full.includes(q) || subject.includes(q)
    })
  }, [teachers, teacherQuery])

  const createBranch = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Eklenemedi")
        return
      }
      setNewName("")
      await load()
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (branch: Branch) => {
    setEditing(branch)
    setSelectedTeacherIds((branch.staffLinks || []).map((l) => l.staff.id))
    setTeacherQuery("")
  }

  const saveTeachers = async () => {
    if (!editing) return
    setModalBusy(true)
    try {
      const res = await fetch("/api/branches", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id, teacherIds: selectedTeacherIds }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Kaydedilemedi")
        return
      }
      setEditing(null)
      await load()
    } finally {
      setModalBusy(false)
    }
  }

  const removeBranch = async (id: string) => {
    if (!confirm("Bu branşı pasife almak istiyor musunuz?")) return
    const res = await fetch(`/api/branches?id=${id}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert((data as { error?: string }).error || "Silinemedi")
      return
    }
    await load()
  }

  const toggleTeacher = (id: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-indigo-600" />
          Branşlar
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Branş oluşturun, öğretmenleri bağlayın. Ders programı, Neredeyiz ve diğer modüller bu
          kataloğu kullanır.
        </p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Yeni branş</CardTitle>
          <CardDescription>Örn: Matematik, Fizik, İngilizce</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Branş adı"
            onKeyDown={(e) => {
              if (e.key === "Enter") void createBranch()
            }}
          />
          <Button onClick={() => void createBranch()} disabled={saving || !newName.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Ekle
          </Button>
        </CardContent>
      </Card>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Branş ara…"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-10">Branş bulunamadı</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((branch) => {
            const teachersOnBranch = (branch.staffLinks || []).map((l) => l.staff)
            return (
              <Card key={branch.id} className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{branch.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {teachersOnBranch.length} öğretmen
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(branch)}>
                        <Users className="h-3.5 w-3.5 mr-1" />
                        Öğretmen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600"
                        onClick={() => void removeBranch(branch.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {teachersOnBranch.length === 0 ? (
                    <p className="text-xs text-amber-700">Henüz öğretmen atanmadı</p>
                  ) : (
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {teachersOnBranch
                        .map((t) => `${t.firstName} ${t.lastName}`)
                        .join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null)
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.name} — öğretmenler</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Seçili ({selectedTeacherIds.length})</Label>
              <div className="mt-1 flex flex-wrap gap-1.5 min-h-[2rem]">
                {selectedTeacherIds.length === 0 ? (
                  <p className="text-xs text-gray-500">Öğretmen seçilmedi</p>
                ) : (
                  selectedTeacherIds.map((id) => {
                    const t = teachers.find((x) => x.id === id)
                    if (!t) return null
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleTeacher(id)}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-900 px-2.5 py-1 text-xs"
                      >
                        {t.firstName} {t.lastName}
                        <X className="h-3 w-3" />
                      </button>
                    )
                  })
                )}
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                value={teacherQuery}
                onChange={(e) => setTeacherQuery(e.target.value)}
                placeholder="Öğretmen ara…"
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {filteredTeachers.map((t) => {
                const checked = selectedTeacherIds.includes(t.id)
                return (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                      checked ? "bg-indigo-50" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeacher(t.id)}
                    />
                    <span className="text-sm">
                      {t.firstName} {t.lastName}
                      {t.subject ? (
                        <span className="text-gray-500"> · {t.subject}</span>
                      ) : null}
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setEditing(null)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={() => void saveTeachers()} disabled={modalBusy}>
                {modalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kaydet"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
