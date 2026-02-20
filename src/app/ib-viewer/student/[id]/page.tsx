"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Award, User } from "lucide-react"
import { DonutChart } from "@/components/ib-viewer/DonutChart"
import type { IbMainType } from "@/lib/ib-activity-types"
import { IB_MAIN_TYPE_LABELS } from "@/lib/ib-activity-types"

interface StudentDashboardData {
  student: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    grade: string
  }
  totalParticipations: number
  allActivitiesCount: number
  participationPercent: number
  byMainType: Record<IbMainType, number>
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("ib_viewer_token")
}

export default function IBViewerStudentDashboardPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      router.push("/ib-viewer/login")
      return
    }
  }, [router])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/ib/student/${id}/dashboard`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body.student) setData(body)
        else if (body.error) setData(null)
      })
      .catch(() => setData(null))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  const handleBack = () => router.push("/ib-viewer")

  if (!getToken()) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="mt-4 text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">Öğrenci bulunamadı.</p>
            <Button className="mt-4" onClick={handleBack}>
              Panele dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const total = data.totalParticipations
  const participationNote = data.participationPercent >= 80 ? "Çok iyi" : data.participationPercent >= 50 ? "İyi" : data.participationPercent >= 25 ? "Orta" : "Geliştirilmeli"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <header className="border-b border-white/20 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Panele dön
          </Button>
          <div className="flex items-center gap-2 text-gray-700">
            <Award className="h-5 w-5 text-indigo-600" />
            <span className="font-medium">IB Görüntüleme</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="overflow-hidden border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <User className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {data.student.fullName}
                </h1>
                <p className="text-sm text-gray-500">{data.student.grade}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white">
                <p className="text-sm font-medium opacity-90">Katılım oranı</p>
                <p className="text-4xl font-bold mt-1">
                  %{data.participationPercent}
                </p>
                <p className="text-sm mt-2 opacity-90">
                  {data.totalParticipations} / {data.allActivitiesCount} faaliyet
                </p>
              </div>
              <div className="rounded-2xl bg-gray-100 border border-gray-200 p-6">
                <p className="text-sm font-medium text-gray-500">
                  Katılım notu (otomatik)
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {participationNote}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Faaliyet türüne göre dağılım
              </h2>
              <div className="flex justify-center py-4">
                <DonutChart data={data.byMainType} size={220} strokeWidth={28} />
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(Object.keys(data.byMainType) as IbMainType[]).map((key) => (
                  <div
                    key={key}
                    className="rounded-xl border border-gray-200 bg-white p-3 text-center"
                  >
                    <p className="text-xs text-gray-500">
                      {IB_MAIN_TYPE_LABELS[key]}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {data.byMainType[key]}
                    </p>
                    <p className="text-xs text-gray-400">
                      {total
                        ? Math.round((data.byMainType[key] / total) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
