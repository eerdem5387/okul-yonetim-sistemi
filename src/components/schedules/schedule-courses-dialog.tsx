"use client"

import { useCallback, useEffect, useState } from "react"
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Course = {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export function ScheduleCoursesDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}) {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/schedules/courses", { cache: "no-store" })
      if (!res.ok) throw new Error("fail")
      const data = await res.json()
      setCourses(Array.isArray(data.courses) ? data.courses : [])
    } catch {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    try {
      const res = await fetch("/api/schedules/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Eklenemedi")
        return
      }
      setNewName("")
      await load()
      onSaved?.()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Bu dersi listeden kaldırmak istiyor musunuz?")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/schedules/courses?id=${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        alert((data as { error?: string }).error || "Silinemedi")
        return
      }
      await load()
      onSaved?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[min(94vw,32rem)] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Ders tanımları
          </DialogTitle>
          <DialogDescription>
            Programda seçilecek ders adlarını burada tanımlayın (Matematik, Fizik…).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="sr-only">Yeni ders</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Örn: Matematik"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void add()
                }
              }}
            />
          </div>
          <Button type="button" onClick={() => void add()} disabled={busy || !newName.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Ekle
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10 text-gray-500 gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : courses.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">Henüz ders tanımlanmamış.</p>
        ) : (
          <div className="rounded-xl border border-gray-200 divide-y max-h-80 overflow-y-auto">
            {courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="text-sm font-medium text-gray-900">{course.name}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-600"
                  disabled={busy}
                  onClick={() => void remove(course.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
