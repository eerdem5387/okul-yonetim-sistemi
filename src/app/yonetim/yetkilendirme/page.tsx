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
import { isPrimarySystemAdminStaffId } from "@/lib/permissions/system-admin"
import { Loader2, Save, Shield, Search } from "lucide-react"
import { useToast } from "@/components/ui/toast"

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

async function fetchStaffRows(params: URLSearchParams): Promise<{ rows: StaffRow[]; error?: string }> {
  const res = await fetch(`/api/staff?${params.toString()}`, {
    headers: staffAuthHeaders(),
    cache: "no-store",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return {
      rows: [],
      error: (body as { error?: string }).error || `Personel listesi alınamadı (${res.status})`,
    }
  }
  const data = await res.json()
  const staff = Array.isArray(data.staff) ? data.staff : []
  return { rows: staff }
}

export default function YetkilendirmePage() {
  const { showToast } = useToast()
  const [verifying, setVerifying] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [sessionMessage, setSessionMessage] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [baselineStaff, setBaselineStaff] = useState<StaffRow[]>([])
  const [searchResults, setSearchResults] = useState<StaffRow[] | null>(null)
  const [searchBusy, setSearchBusy] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<MatrixModule[]>([])
  const [staffInfo, setStaffInfo] = useState<StaffRow | null>(null)

  const loadMatrix = useCallback(
    async (staffId: string) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/permissions/staff/${staffId}`, {
          headers: staffAuthHeaders(),
          cache: "no-store",
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
    },
    [showToast]
  )

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      const headers = staffAuthHeaders()
      if (!headers.Authorization) {
        if (!cancelled) {
          setIsSuperAdmin(false)
          setSessionMessage("Oturum bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.")
          setVerifying(false)
        }
        return
      }

      const me = await fetch("/api/permissions/me", { headers, cache: "no-store" })
      if (cancelled) return

      if (!me.ok) {
        setIsSuperAdmin(false)
        setSessionMessage(
          me.status === 401
            ? "Oturum süresi dolmuş veya geçersiz. Çıkış yapıp tekrar giriş yapın."
            : "Hesabınız doğrulanamadı."
        )
        setVerifying(false)
        return
      }

      const data = await me.json()
      const allowed =
        data.isSuperAdmin === true ||
        data.department === "SUPER_ADMIN" ||
        isPrimarySystemAdminStaffId(data.staffId)
      if (!allowed) {
        setIsSuperAdmin(false)
        setSessionMessage("Bu sayfaya yalnızca sistem yöneticisi (Süper Admin) erişebilir.")
        setVerifying(false)
        return
      }

      setIsSuperAdmin(true)
      setSessionMessage(null)

      const { rows, error } = await fetchStaffRows(
        new URLSearchParams({ limit: "500", isActive: "all" })
      )
      if (cancelled) return

      if (error) {
        setListError(error)
        showToast(error, "error")
        setBaselineStaff([])
      } else {
        setListError(null)
        setBaselineStaff(rows)
        if (rows.length === 0) {
          setListError("Veritabanında personel kaydı bulunamadı.")
        }
      }
      setVerifying(false)
    })()

    return () => {
      cancelled = true
    }
  }, [showToast])

  useEffect(() => {
    if (!isSuperAdmin || verifying) return

    const q = search.trim()
    if (!q) {
      setSearchResults(null)
      setSearchBusy(false)
      return
    }

    setSearchBusy(true)
    let cancelled = false
    const handle = window.setTimeout(async () => {
      const params = new URLSearchParams({
        search: q,
        limit: "100",
        isActive: "all",
      })
      const { rows, error } = await fetchStaffRows(params)
      if (cancelled) return
      setSearchBusy(false)
      if (error) {
        showToast(error, "error")
        setSearchResults([])
        return
      }
      setSearchResults(rows)
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [search, isSuperAdmin, verifying, showToast])

  const displayStaff = useMemo(() => {
    const q = search.trim()
    if (q) return searchResults ?? []
    return baselineStaff
  }, [search, searchResults, baselineStaff])

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

  const grantFullModule = (moduleId: string) => {
    setMatrix((prev) =>
      prev.map((mod) =>
        mod.module !== moduleId
          ? mod
          : { ...mod, actions: mod.actions.map((a) => ({ ...a, granted: true as boolean | null })) }
      )
    )
    showToast("Bu modül için tüm işlemler açıldı. Kaydetmeyi unutmayın.", "info")
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

  if (verifying) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-gray-600">{sessionMessage || "Erişim reddedildi."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6"><div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yetkilendirme Sistemi</h1>
          <p className="text-sm text-gray-500">
            Yalnızca <strong>personel (Staff)</strong> listelenir; veli hesapları bu yapıda yoktur. Bir modülde
            &quot;Tam yetki&quot; ile o modüldeki tüm işlemleri (süper yöneticiyle aynı kapsam) verirsiniz.
            Yetkilendirme modülünü başkasına devredemezsiniz.
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
                placeholder="Ad, soyad veya departman ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {listError && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                {listError}
              </p>
            )}
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {searchBusy && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aranıyor…
                </div>
              )}
              {!searchBusy &&
                displayStaff.map((s) => (
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
              {!searchBusy && displayStaff.length === 0 && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  {search.trim()
                    ? "Sonuç yok. Farklı bir arama deneyin."
                    : "Personel listesi boş. Yukarıdaki uyarıya bakın veya sayfayı yenileyin."}
                </p>
              )}
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label className="font-medium text-gray-900">{mod.label}</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs shrink-0"
                              onClick={() => grantFullModule(mod.module)}
                            >
                              Modülde tam yetki
                            </Button>
                          </div>
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
                                    ? "Tanımlı değil — kapalı"
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
