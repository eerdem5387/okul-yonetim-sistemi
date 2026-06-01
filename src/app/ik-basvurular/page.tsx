"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Search,
  Eye,
  Download,
  Trash2,
  Users,
  Clock,
  TrendingUp,
  X,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react"
import {
  HR_STATUS_COLORS,
  HR_STATUS_LABELS,
  HR_STATUS_OPTIONS,
} from "@/lib/hr-recruitment/constants"
import {
  canViewHrRecruitment,
  fetchPermissionsMe,
  hasPermissionKey,
  staffAuthHeaders,
} from "@/lib/permissions/client"
import type { HrApplicationStatus } from "@prisma/client"

type ReferenceRow = {
  firstName: string
  lastName: string
  title: string
  phone: string
}

interface HrApplication {
  id: string
  externalId: string
  fullName: string
  residence: string
  birthYear: number
  phone: string
  universityDepartment: string
  formationStatus: string
  appliedBranch: string
  experienceLevels: unknown
  totalExperience: string
  hasPrivateSchoolExperience: boolean
  pedagogicalApproach: string
  clubsAndActivities: string
  references: unknown
  cvUrl: string
  cvFileName: string
  status: HrApplicationStatus
  internalNote: string | null
  createdAt: string
}

interface Stats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  byStatus: Record<string, number>
  topBranches: Array<{ branch: string; count: number }>
}

const BRANCH_FILTER_OPTIONS = [
  "Matematik",
  "İngilizce",
  "Rehberlik",
  "Fen Bilimleri",
  "Türkçe",
  "Bilişim Teknolojileri",
]

function formatLevels(levels: unknown): string {
  if (!Array.isArray(levels)) return "—"
  return levels.join(", ")
}

function formatReferences(refs: unknown): ReferenceRow[] {
  if (!Array.isArray(refs)) return []
  return refs as ReferenceRow[]
}

export default function IkBasvurularPage() {
  const router = useRouter()
  const [accessChecked, setAccessChecked] = useState(false)
  const [hasAccess, setHasAccess] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [canExport, setCanExport] = useState(false)

  const [applications, setApplications] = useState<HrApplication[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [branchFilter, setBranchFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [selected, setSelected] = useState<HrApplication | null>(null)
  const [editStatus, setEditStatus] = useState<HrApplicationStatus>("YENI")
  const [editNote, setEditNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    fetchPermissionsMe().then((me) => {
      const ok = canViewHrRecruitment(me)
      setHasAccess(ok)
      setCanEdit(me?.isSuperAdmin || hasPermissionKey(me?.permissions, "hr_recruitment", "edit"))
      setCanDelete(me?.isSuperAdmin || hasPermissionKey(me?.permissions, "hr_recruitment", "delete"))
      setCanExport(me?.isSuperAdmin || hasPermissionKey(me?.permissions, "hr_recruitment", "export"))
      setAccessChecked(true)
      if (!ok) router.replace("/")
    })
  }, [router])

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/ik-basvurular/stats", { headers: staffAuthHeaders() })
    if (res.ok) setStats(await res.json())
  }, [])

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
      })
      if (searchTerm) params.set("search", searchTerm)
      if (branchFilter) params.set("branch", branchFilter)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/ik-basvurular?${params}`, { headers: staffAuthHeaders() })
      if (!res.ok) throw new Error("Liste alınamadı")
      const data = await res.json()
      setApplications(data.applications || [])
      setTotalPages(data.pagination?.totalPages || 1)
      setTotal(data.pagination?.total || 0)
    } catch {
      setApplications([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, branchFilter, statusFilter])

  useEffect(() => {
    if (!hasAccess) return
    fetchStats()
  }, [hasAccess, fetchStats])

  useEffect(() => {
    if (!hasAccess) return
    fetchApplications()
  }, [hasAccess, fetchApplications])

  const openDetail = (app: HrApplication) => {
    setSelected(app)
    setEditStatus(app.status)
    setEditNote(app.internalNote || "")
  }

  const handleSave = async () => {
    if (!selected || !canEdit) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ik-basvurular/${selected.id}`, {
        method: "PATCH",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, internalNote: editNote }),
      })
      if (!res.ok) throw new Error("Kaydedilemedi")
      await fetchApplications()
      await fetchStats()
      setSelected(null)
    } catch {
      alert("Güncelleme başarısız")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!canDelete || !confirm("Bu başvuruyu silmek istediğinize emin misiniz?")) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/ik-basvurular/${id}`, {
        method: "DELETE",
        headers: staffAuthHeaders(),
      })
      if (!res.ok) throw new Error()
      if (selected?.id === id) setSelected(null)
      await fetchApplications()
      await fetchStats()
    } catch {
      alert("Silinemedi")
    } finally {
      setDeletingId(null)
    }
  }

  const handleExport = async () => {
    if (!canExport) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.set("search", searchTerm)
      if (branchFilter) params.set("branch", branchFilter)
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/ik-basvurular/export?${params}`, { headers: staffAuthHeaders() })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ik_basvurular_${new Date().toISOString().split("T")[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Dışa aktarma başarısız")
    } finally {
      setExporting(false)
    }
  }

  const branchOptions = useMemo(() => {
    const fromStats = stats?.topBranches?.map((b) => b.branch) ?? []
    return Array.from(new Set([...BRANCH_FILTER_OPTIONS, ...fromStats])).sort()
  }, [stats])

  if (!accessChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (!hasAccess) return null

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">İK Öğretmen Başvuruları</h1>
          <p className="text-sm text-gray-500 mt-1">
            ik.leventokullari.com üzerinden gelen başvurular
          </p>
        </div>
        {canExport && (
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "İndiriliyor..." : "Excel İndir"}
          </Button>
        )}
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Users} label="Toplam" value={stats.total} />
          <StatCard icon={Clock} label="Bugün" value={stats.today} />
          <StatCard icon={TrendingUp} label="Bu hafta" value={stats.thisWeek} />
          <StatCard icon={TrendingUp} label="Bu ay" value={stats.thisMonth} />
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex-1 min-w-[200px]">
            <Label>Ara</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Ad, telefon, branş..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>
          <div className="w-full sm:w-44">
            <Label>Branş</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Tümü</option>
              {branchOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-44">
            <Label>Durum</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">Tümü</option>
              {HR_STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Başvurular</CardTitle>
          <CardDescription>{total} kayıt</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : applications.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Başvuru bulunamadı</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">Ad Soyad</th>
                    <th className="pb-3 pr-4 font-medium">Branş</th>
                    <th className="pb-3 pr-4 font-medium">Deneyim</th>
                    <th className="pb-3 pr-4 font-medium">Durum</th>
                    <th className="pb-3 pr-4 font-medium">Tarih</th>
                    <th className="pb-3 font-medium text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 pr-4 font-medium text-gray-900">{app.fullName}</td>
                      <td className="py-3 pr-4">{app.appliedBranch}</td>
                      <td className="py-3 pr-4">{app.totalExperience}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${HR_STATUS_COLORS[app.status]}`}
                        >
                          {HR_STATUS_LABELS[app.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {new Date(app.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(app)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              disabled={deletingId === app.id}
                              onClick={() => handleDelete(app.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                Önceki
              </Button>
              <span className="flex items-center px-3 text-sm text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Sonraki
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.fullName}</h2>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <DetailRow label="Telefon" value={selected.phone} />
              <DetailRow label="Yaşadığı yer" value={selected.residence} />
              <DetailRow label="Doğum yılı" value={String(selected.birthYear)} />
              <DetailRow label="Üniversite / Bölüm" value={selected.universityDepartment} />
              <DetailRow label="Formasyon" value={selected.formationStatus} />
              <DetailRow label="Branş" value={selected.appliedBranch} />
              <DetailRow label="Kademeler" value={formatLevels(selected.experienceLevels)} />
              <DetailRow label="Deneyim" value={selected.totalExperience} />
              <DetailRow
                label="Özel okul deneyimi"
                value={selected.hasPrivateSchoolExperience ? "Evet" : "Hayır"}
              />
              <DetailRow label="Pedagojik yaklaşım" value={selected.pedagogicalApproach} multiline />
              <DetailRow label="Kulüp / faaliyetler" value={selected.clubsAndActivities} multiline />
              <div>
                <p className="font-medium text-gray-700 mb-2">Referanslar</p>
                <ul className="space-y-2">
                  {formatReferences(selected.references).map((ref, i) => (
                    <li key={i} className="rounded-lg bg-gray-50 p-3 text-gray-800">
                      {ref.firstName} {ref.lastName} — {ref.title}
                      <br />
                      <span className="text-gray-600">{ref.phone}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <a
                  href={selected.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-600 hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  {selected.cvFileName || "CV İndir"}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {canEdit && (
                <div className="border-t pt-4 space-y-3">
                  <div>
                    <Label>Durum</Label>
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as HrApplicationStatus)}
                    >
                      {HR_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>İç not</Label>
                    <textarea
                      className="mt-1 w-full rounded-md border px-3 py-2 min-h-[80px]"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Görüşme notları..."
                    />
                  </div>
                  <Button onClick={handleSave} disabled={saving} className="w-full">
                    {saving ? "Kaydediliyor..." : "Kaydet"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-4">
        <div className="rounded-lg bg-indigo-50 p-3">
          <Icon className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div>
      <p className="font-medium text-gray-700">{label}</p>
      <p className={`text-gray-900 mt-0.5 ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  )
}
