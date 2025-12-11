"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Clock,
  AlertTriangle,
  BookOpen,
  User,
} from "lucide-react"

interface Topic {
  id: string
  name: string
  plannedStartDate: string | null
  plannedEndDate: string | null
  unit: {
    id: string
    name: string
    subject: {
      id: string
      name: string
      grade: number
      section: string | null
      academicYear: {
        id: string
        name: string
      }
    }
  }
  progress: Array<{
    id: string
    status: string
    actualEndDate: string | null
    reportedBy: string | null
    reportedAt: string | null
    notes: string | null
  }>
}

export default function OnayPage() {
  const params = useParams()
  const router = useRouter()
  const [topic, setTopic] = useState<Topic | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [staffId, setStaffId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")

      if (role !== "counselor") {
        router.push("/login")
        return
      }

      setStaffId(id)
    }

    if (params.topicId) {
      fetchTopic()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.topicId])

  const fetchTopic = async () => {
    if (!params.topicId) return

    try {
      const response = await fetch(`/api/neredeyiz/topics/${params.topicId}`)
      if (response.ok) {
        const data = await response.json()
        setTopic(data)
      } else {
        setToastMessage({ type: "error", message: "Konu yüklenirken hata oluştu!" })
      }
    } catch (err) {
      console.error("Error fetching topic:", err)
      setToastMessage({ type: "error", message: "Konu yüklenirken hata oluştu!" })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!staffId || !topic) return

    const progress = topic.progress?.[0]
    if (!progress || progress.status !== "PENDING_APPROVAL") {
      setToastMessage({ type: "error", message: "Bu konu onay bekliyor durumunda değil!" })
      return
    }

    setApproving(true)

    try {
      const response = await fetch(`/api/neredeyiz/progress/${progress.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedBy: staffId }),
      })

      if (response.ok) {
        setToastMessage({ type: "success", message: "Konu başarıyla onaylandı!" })
        setTimeout(() => {
          router.push("/rehberlik")
        }, 2000)
      } else {
        const errorData = await response.json()
        setToastMessage({ type: "error", message: errorData.error || "Onay işlemi sırasında hata oluştu!" })
      }
    } catch (err) {
      console.error("Error approving progress:", err)
      setToastMessage({ type: "error", message: "Onay işlemi sırasında bir hata oluştu!" })
    } finally {
      setApproving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <RehberlikSidebar />
        <main className="flex-1 overflow-y-auto flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </main>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <RehberlikSidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">Konu bulunamadı</p>
              <Link href="/rehberlik">
                <Button variant="outline" size="sm" className="mt-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Geri Dön
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const progress = topic.progress?.[0]

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Toast Notification */}
        {toastMessage && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            toastMessage.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}>
            <p className="font-medium">{toastMessage.message}</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link href="/rehberlik">
            <Button variant="outline" size="sm" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Konu Onayı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ders Bilgileri */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Ders Bilgileri</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>Ders:</strong> {topic.unit.subject.name}
                  </p>
                  <p>
                    <strong>Ünite:</strong> {topic.unit.name}
                  </p>
                  <p>
                    <strong>Konu:</strong> {topic.name}
                  </p>
                  <p>
                    <strong>Sınıf:</strong> {topic.unit.subject.grade}. Sınıf
                    {topic.unit.subject.section && ` - ${topic.unit.subject.section} Şubesi`}
                  </p>
                  <p>
                    <strong>Akademik Yıl:</strong> {topic.unit.subject.academicYear.name}
                  </p>
                </div>
              </div>

              {/* Planlanan Tarihler */}
              {(topic.plannedStartDate || topic.plannedEndDate) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Planlanan Tarihler
                  </h3>
                  <div className="space-y-1 text-sm">
                    {topic.plannedStartDate && (
                      <p>
                        <strong>Başlangıç:</strong> {new Date(topic.plannedStartDate).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                    {topic.plannedEndDate && (
                      <p>
                        <strong>Bitiş:</strong> {new Date(topic.plannedEndDate).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Öğretmen İşaretleme Bilgileri */}
              {progress && (
                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Öğretmen İşaretleme Bilgileri
                  </h3>
                  <div className="space-y-1 text-sm">
                    {progress.actualEndDate && (
                      <p>
                        <strong>Tamamlanma Tarihi:</strong> {new Date(progress.actualEndDate).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                    {progress.reportedAt && (
                      <p>
                        <strong>İşaretleme Tarihi:</strong> {new Date(progress.reportedAt).toLocaleDateString("tr-TR")}
                      </p>
                    )}
                    {progress.notes && (
                      <p>
                        <strong>Notlar:</strong> {progress.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Onay Butonu */}
              {progress && progress.status === "PENDING_APPROVAL" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={handleApprove}
                    disabled={approving}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Onaylanıyor...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Tamamlama İşlemini Onayla
                      </>
                    )}
                  </Button>
                </div>
              )}

              {progress && progress.status === "TAMAMLANDI" && (
                <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                  <p className="text-green-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Bu konu zaten onaylanmış
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

