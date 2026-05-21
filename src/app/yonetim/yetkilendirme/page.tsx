"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PermissionMatrixEditor } from "@/components/permissions/PermissionMatrixEditor"
import {
  BULK_PERMISSION_DEPARTMENTS,
  bulkDepartmentLabel,
  type BulkAssignableDepartment,
} from "@/lib/permissions/bulk"
import {
  matrixToEntries,
  type PermissionMatrixModule,
} from "@/lib/permissions/matrix"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { isPrimarySystemAdminStaffId } from "@/lib/permissions/system-admin"
import { Loader2, Save, Shield, Search, Users } from "lucide-react"
import { useToast } from "@/components/ui/toast"

type StaffRow = {
  id: string
  firstName: string
  lastName: string
  department: string
}

type BulkTemplate = "empty" | "first"

type BulkMeta = {
  label: string
  staffCount: number
  staff: StaffRow[]
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

  const [mode, setMode] = useState<"individual" | "bulk">("individual")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [baselineStaff, setBaselineStaff] = useState<StaffRow[]>([])
  const [searchResults, setSearchResults] = useState<StaffRow[] | null>(null)
  const [searchBusy, setSearchBusy] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [matrix, setMatrix] = useState<PermissionMatrixModule[]>([])
  const [staffInfo, setStaffInfo] = useState<StaffRow | null>(null)

  const [bulkDepartment, setBulkDepartment] = useState<BulkAssignableDepartment | null>(null)
  const [bulkTemplate, setBulkTemplate] = useState<BulkTemplate>("empty")
  const [bulkMeta, setBulkMeta] = useState<BulkMeta | null>(null)
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)

  const toggleAction = useCallback((modIdx: number, actIdx: number) => {
    setMatrix((prev) => {
      const next = [...prev]
      const mod = { ...next[modIdx], actions: [...next[modIdx].actions] }
      const act = { ...mod.actions[actIdx] }
      act.granted = act.granted === true ? false : true
      mod.actions[actIdx] = act
      next[modIdx] = mod
      return next
    })
  }, [])

  const grantFullModule = useCallback(
    (moduleId: string) => {
      setMatrix((prev) =>
        prev.map((mod) =>
          mod.module !== moduleId
            ? mod
            : { ...mod, actions: mod.actions.map((a) => ({ ...a, granted: true as boolean | null })) }
        )
      )
      showToast("Bu modül için tüm işlemler açıldı. Kaydetmeyi unutmayın.", "info")
    },
    [showToast]
  )

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

  const loadBulkMatrix = useCallback(
    async (department: BulkAssignableDepartment, template: BulkTemplate) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ template })
        const res = await fetch(`/api/permissions/department/${department}?${params}`, {
          headers: staffAuthHeaders(),
          cache: "no-store",
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          showToast((err as { error?: string }).error || "Departman matrisi yüklenemedi", "error")
          return
        }
        const data = await res.json()
        setBulkDepartment(department)
        setBulkTemplate(template)
        setMatrix(data.matrix ?? [])
        setBulkMeta({
          label: data.label ?? bulkDepartmentLabel(department),
          staffCount: data.staffCount ?? 0,
          staff: Array.isArray(data.staff) ? data.staff : [],
        })
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
    if (!isSuperAdmin || verifying || mode !== "individual") return

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
  }, [search, isSuperAdmin, verifying, mode, showToast])

  useEffect(() => {
    if (!isSuperAdmin || verifying || mode !== "bulk") return
    if (bulkDepartment) return
    const first = BULK_PERMISSION_DEPARTMENTS[0]
    if (first) void loadBulkMatrix(first, "empty")
  }, [isSuperAdmin, verifying, mode, bulkDepartment, loadBulkMatrix])

  const displayStaff = useMemo(() => {
    const q = search.trim()
    if (q) return searchResults ?? []
    return baselineStaff
  }, [search, searchResults, baselineStaff])

  const handleIndividualSave = async () => {
    if (!selectedId) return
    setSaving(true)
    try {
      const entries = matrixToEntries(matrix)
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
        showToast((err as { error?: string }).error || "Kayıt başarısız", "error")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSave = async () => {
    if (!bulkDepartment || !bulkMeta || bulkMeta.staffCount === 0) return
    setBulkConfirmOpen(false)
    setSaving(true)
    try {
      const entries = matrixToEntries(matrix)
      const res = await fetch(`/api/permissions/department/${bulkDepartment}`, {
        method: "PUT",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      })
      if (res.ok) {
        const data = await res.json()
        showToast(
          `${data.label ?? bulkMeta.label}: ${data.updatedCount ?? bulkMeta.staffCount} personele yetkiler uygulandı`,
          "success"
        )
        await loadBulkMatrix(bulkDepartment, bulkTemplate)
      } else {
        const err = await res.json().catch(() => ({}))
        showToast((err as { error?: string }).error || "Toplu kayıt başarısız", "error")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleModeChange = (next: string) => {
    const m = next as "individual" | "bulk"
    setMode(m)
    setMatrix([])
    if (m === "individual") {
      setBulkDepartment(null)
      setBulkMeta(null)
    } else {
      setSelectedId(null)
      setStaffInfo(null)
      setBulkDepartment(null)
      setBulkMeta(null)
    }
  }

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

  const bulkCanSave = bulkMeta && bulkMeta.staffCount > 0 && bulkDepartment

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Yetkilendirme Sistemi</h1>
          <p className="text-sm text-gray-500">
            Tekil modda personel bazında; toplu modda departmandaki tüm aktif personele aynı
            yetkileri tek seferde tanımlayabilirsiniz. Kayıt mevcut özel yetkilerin yerine geçer;
            ardından tekil modda kişi bazında ince ayar yapılabilir.
          </p>
        </div>
      </div>

      <Tabs value={mode} onValueChange={handleModeChange}>
        <TabsList>
          <TabsTrigger value="individual">Tekil personel</TabsTrigger>
          <TabsTrigger value="bulk">Toplu (departman)</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
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
                        : "Personel listesi boş."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
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
                  <Button onClick={handleIndividualSave} disabled={saving}>
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
                {!selectedId ? (
                  <p className="text-gray-500 text-sm py-8 text-center">
                    Soldan bir personel seçerek izin matrisini düzenleyin.
                  </p>
                ) : (
                  <PermissionMatrixEditor
                    matrix={matrix}
                    loading={loading}
                    onToggleAction={toggleAction}
                    onGrantFullModule={grantFullModule}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Departman
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[60vh] overflow-y-auto space-y-1">
                  {BULK_PERMISSION_DEPARTMENTS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => loadBulkMatrix(dept, bulkTemplate)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        bulkDepartment === dept
                          ? "bg-indigo-100 text-indigo-900 font-medium"
                          : "hover:bg-gray-100 text-gray-700"
                      }`}
                    >
                      {bulkDepartmentLabel(dept)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">
                    {bulkMeta?.label ?? "Departman seçin"}
                  </CardTitle>
                  {bulkMeta && (
                    <p className="text-xs text-gray-500">
                      {bulkMeta.staffCount} aktif personel — kayıt hepsine uygulanır
                    </p>
                  )}
                </div>
                {bulkCanSave && (
                  <Button onClick={() => setBulkConfirmOpen(true)} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Toplu kaydet
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {bulkDepartment && (
                  <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-gray-50 border">
                    <span className="text-xs font-medium text-gray-700">Şablon:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={bulkTemplate === "empty" ? "default" : "outline"}
                      className="text-xs"
                      disabled={loading}
                      onClick={() => loadBulkMatrix(bulkDepartment, "empty")}
                    >
                      Boş matris
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={bulkTemplate === "first" ? "default" : "outline"}
                      className="text-xs"
                      disabled={loading || !bulkMeta?.staffCount}
                      onClick={() => loadBulkMatrix(bulkDepartment, "first")}
                    >
                      İlk personelin yetkileri
                    </Button>
                  </div>
                )}

                {!bulkDepartment ? (
                  <p className="text-gray-500 text-sm py-8 text-center">
                    Soldan bir departman seçin.
                  </p>
                ) : bulkMeta && bulkMeta.staffCount === 0 ? (
                  <p className="text-amber-800 text-sm py-8 text-center bg-amber-50 border border-amber-200 rounded-lg px-4">
                    Bu departmanda aktif personel yok. Toplu yetki atanamaz.
                  </p>
                ) : (
                  <>
                    {bulkMeta && bulkMeta.staff.length > 0 && (
                      <details className="text-sm border rounded-lg p-3 bg-white">
                        <summary className="cursor-pointer font-medium text-gray-700">
                          Etkilenecek personel ({bulkMeta.staff.length})
                        </summary>
                        <ul className="mt-2 max-h-32 overflow-y-auto space-y-0.5 text-gray-600">
                          {bulkMeta.staff.map((s) => (
                            <li key={s.id}>
                              {s.firstName} {s.lastName}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    <PermissionMatrixEditor
                      matrix={matrix}
                      loading={loading}
                      onToggleAction={toggleAction}
                      onGrantFullModule={grantFullModule}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Toplu yetki kaydı</DialogTitle>
            <DialogDescription>
              {bulkMeta && bulkDepartment ? (
                <>
                  <strong>{bulkMeta.label}</strong> departmanındaki{" "}
                  <strong>{bulkMeta.staffCount}</strong> aktif personelin mevcut özel yetkileri
                  silinip bu matristeki açık izinlerle değiştirilecek. Devam etmek istiyor musunuz?
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkConfirmOpen(false)}>
              İptal
            </Button>
            <Button type="button" onClick={handleBulkSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Uygula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
