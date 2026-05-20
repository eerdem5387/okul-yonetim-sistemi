"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Award,
  LogOut,
  Users,
  GraduationCap,
  Calendar,
  Trophy,
  ChevronRight,
  X,
} from "lucide-react"
import { IB_MAIN_TYPE_LABELS, type IbMainType } from "@/lib/ib-activity-types"

interface DashboardData {
  total: number
  byMainType: Record<IbMainType, number>
  students: Array<{ studentId: string; name: string; count: number }>
}

const TYPE_ICONS: Record<IbMainType, typeof GraduationCap> = {
  education: GraduationCap,
  event: Calendar,
  sport: Trophy,
  competition: Award,
}

const TYPE_COLORS: Record<IbMainType, string> = {
  education: "from-violet-500 to-purple-600",
  event: "from-sky-500 to-blue-600",
  sport: "from-amber-500 to-orange-600",
  competition: "from-emerald-500 to-teal-600",
}

export default function IBViewerPage() {
  const router = useRouter()
  const [viewerName, setViewerName] = useState("")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStudentList, setShowStudentList] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("ib_viewer_token")
    const name = localStorage.getItem("ib_viewer_name")
    if (!token) {
      router.push("/ib-viewer/login")
      return
    }
    setViewerName(name || "IB Kullanıcısı")
  }, [router])

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/ib/dashboard")
      if (!res.ok) throw new Error("Failed")
      const body = await res.json()
      setData(body)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem("ib_viewer_token")) {
      fetchDashboard()
    }
  }, [fetchDashboard])

  const handleLogout = () => {
    localStorage.removeItem("ib_viewer_token")
    localStorage.removeItem("ib_viewer_id")
    localStorage.removeItem("ib_viewer_name")
    router.push("/ib-viewer/login")
    router.refresh()
  }

  const openStudentDashboard = (studentId: string) => {
    setShowStudentList(false)
    router.push(`/ib-viewer/student/${studentId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-100">
      <header className="border-b border-white/20 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">IB Faaliyet Paneli</h1>
              <p className="text-xs text-gray-500">Hoş geldiniz, {viewerName}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Onaylı faaliyet kayıtları</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Çıkış
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : data ? (
          <>
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                4 Ana Faaliyet Türü
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(data.byMainType) as IbMainType[]).map((key) => {
                  const Icon = TYPE_ICONS[key]
                  const value = data.byMainType[key] ?? 0
                  return (
                    <Card
                      key={key}
                      className="overflow-hidden border-0 shadow-lg hover:shadow-xl transition-shadow"
                    >
                      <div
                        className={`h-2 bg-gradient-to-r ${TYPE_COLORS[key]}`}
                      />
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              {IB_MAIN_TYPE_LABELS[key]}
                            </p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">
                              {value}
                            </p>
                          </div>
                          <div
                            className={`h-12 w-12 rounded-xl bg-gradient-to-br ${TYPE_COLORS[key]} flex items-center justify-center`}
                          >
                            <Icon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-gray-600">
                  Toplam faaliyet
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {data.total}
                </span>
              </div>
            </section>

            <section>
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg"
                onClick={() => setShowStudentList(true)}
              >
                <Users className="h-5 w-5 mr-2" />
                Öğrenci Listesi
              </Button>
            </section>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Veriler yüklenemedi. Lütfen sayfayı yenileyin.
            </CardContent>
          </Card>
        )}
      </main>

      {showStudentList && data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[85vh] flex flex-col border-0 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Faaliyete Katılan Öğrenciler
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowStudentList(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <p className="text-sm text-gray-500 mb-4">
                En çok faaliyete katılandan en aza doğru sıralanmıştır. Öğrenciye
                tıklayarak dashboardunu açın.
              </p>
              <ul className="space-y-2">
                {data.students.map((s) => (
                  <li key={s.studentId}>
                    <button
                      type="button"
                      onClick={() => openStudentDashboard(s.studentId)}
                      className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
                    >
                      <span className="font-medium text-gray-900">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">
                          {s.count} / {data.total} faaliyet
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {data.students.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Henüz katılım kaydı yok.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
