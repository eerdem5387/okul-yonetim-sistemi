"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PERMISSION_ACTION_LABELS,
  type PermissionAction,
} from "@/lib/permissions/constants"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { Loader2, Save, Shield, Search } from "lucide-react"
import { useToast, ToastContainer } from "@/components/ui/toast"

type StaffRow = {
  id: string
  firstName: string
  lastName: string
  department: string
}

type MatrixAction = {
  action: string
  key: string
  granted: boolean | null
}

type MatrixModule = {
  module: string
  label: string
  group: string
  actions: MatrixAction[]
}

export default function YetkilendirmePage() {
  const { toasts, showToast, removeToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<MatrixModule[]>([])
  const [staffInfo, setStaffInfo] = useState<StaffRow | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    const localRole = localStorage.getItem("auth_role")
    const localDept = localStorage.getItem("staff_department")

    fetch("/api/permissions/me", { headers: staffAuthHeaders() })
      .then((r) => r.json())
      .then((data) => {
        const allowed =
          data.isSuperAdmin === true ||
          data.loginRole === "admin" ||
          localRole === "admin" ||
          localDept === "SUPER_ADMIN"
        setIsSuperAdmin(allowed)
        if (!allowed) setLoading(false)
      })
      .catch(() => {
        const allowed = localRole === "admin" || localDept === "SUPER_ADMIN"
        setIsSuperAdmin(allowed)
        if (!allowed) setLoading(false)
      })
  }, [])

  const loadStaffList = useCallback(async () => {
    const res = await fetch("/api/staff?limit=500&isActive=true", {
      headers: staffAuthHeaders(),
    })
    if (res.ok) {
      const data = await res.json()
      setStaffList(data.staff ?? [])
    }
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) return
    loadStaffList().finally(() => setLoading(false))
  }, [isSuperAdmin, loadStaffList])

  const loadMatrix = useCallback(async (staffId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/permissions/staff/${staffId}`, {
        headers: staffAuthHeaders(),
      })
      if (!res.ok) {
        showToast("İzin matrisi yüklenemedi", "error")
        return
      }
      const data = await res.json()
      setStaffInfo(data.staff)
      setMatrix(data.matrix)
      setSelectedId(staffId)
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return staffList
    return staffList.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    )
  }, [staffList, search])

  const toggleAction = (modIdx: number, actIdx: number) => {
    setMatrix((prev) => {
      const next = [...prev]
      const mod = { ...next[modIdx], actions: [...next[modIdx].actions] }
      const act = { ...mod.actions[actIdx] }
      act.granted = act.granted === true ? false : true
      mod.actions[actIdx] = act
      next[modIdx] = mod
      return next
    })
  }

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const entries: Array<{ module: string; action: string; granted: boolean }> = []
      for (const mod of matrix) {
        for (const act of mod.actions) {
          if (act.granted === true) {
            entries.push({ module: mod.module, action: act.action, granted: true })
          }
        }
      }
      const res = await fetch(`/api/permissions/staff/${selectedId}`, {
        method: "PUT",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
      if (res.ok) {
        showToast("Yetkiler kaydedildi", "success")
        await loadMatrix(selectedId)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || "Kayıt başarısız", "error")
      }
    } finally {
      setSaving(false)
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, MatrixModule[]>()
    for (const m of matrix) {
      const list = map.get(m.group) ?? []
      list.push(m)
      map.set(m.group, list)
    }
    return Array.from(map.entries())
  }, [matrix])

  if (!loading && !isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              Bu sayfaya yalnızca sistem yöneticisi (Süper Admin) erişebilir. Oturumunuz
              süresi dolmuş olabilir; çıkış yapıp tekrar giriş deneyin.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yetkilendirme Sistemi</h1>
          <p className="text-sm text-gray-500">
            Personel bazlı modül izinleri. Boş hücre = departman varsayılanı.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8"
                placeholder="Ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {filteredStaff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => loadMatrix(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedId === s.id
                      ? "bg-indigo-100 text-indigo-900 font-medium"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  {s.firstName} {s.lastName}
                  <span className="block text-xs text-gray-500">{s.department}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {staffInfo
                  ? `${staffInfo.firstName} ${staffInfo.lastName}`
                  : "Personel seçin"}
              </CardTitle>
              {staffInfo && (
                <p className="text-xs text-gray-500 mt-1">{staffInfo.department}</p>
              )}
            </div>
            {selectedId && (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Kaydet
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading && !matrix.length ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : !selectedId ? (
              <p className="text-gray-500 text-sm py-8 text-center">
                Soldan bir personel seçerek izin matrisini düzenleyin.
              </p>
            ) : (
              <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
                {groups.map(([group, modules]) => (
                  <div key={group}>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 sticky top-0 bg-white py-1">
                      {group}
                    </h3>
                    <div className="space-y-4">
                      {modules.map((mod) => (
                        <div
                          key={mod.module}
                          className="border rounded-lg p-3 bg-gray-50/50"
                        >
                          <Label className="font-medium text-gray-900">{mod.label}</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {mod.actions.map((act, actIdx) => (
                              <button
                                key={act.key}
                                type="button"
                                onClick={() => {
                                  const globalModIdx = matrix.findIndex(
                                    (m) => m.module === mod.module
                                  )
                                  if (globalModIdx >= 0) toggleAction(globalModIdx, actIdx)
                                }}
                                className={`px-2 py-1 rounded text-xs border transition-colors ${
                                  act.granted === true
                                    ? "bg-indigo-600 text-white border-indigo-600"
                                    : act.granted === false
                                      ? "bg-red-50 text-red-800 border-red-200"
                                      : "bg-white text-gray-600 border-gray-200"
                                }`}
                                title={
                                  act.granted === null
                                    ? "Varsayılan (departman)"
                                    : act.granted
                                      ? "Açık"
                                      : "Kapalı"
                                }
                              >
                                {PERMISSION_ACTION_LABELS[act.action as PermissionAction] ??
                                  act.action}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
