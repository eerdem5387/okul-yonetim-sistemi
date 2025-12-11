"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Target, 
  MapPin, 
  Users, 
  Award, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  LogOut, 
  User,
  AlertCircle
} from "lucide-react"
import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"

interface PendingApproval {
  id: string
  topicId: string
  topic: {
    id: string
    name: string
    unit: {
      id: string
      name: string
      subject: {
        id: string
        name: string
        grade: number
        section: string | null
      }
    }
  }
  reportedBy: string | null
  reportedAt: string | null
  actualEndDate: string | null
}

export default function RehberlikPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState<string>("")
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const name = localStorage.getItem("staff_name")

      if (role !== "counselor") {
        router.push("/login")
        return
      }

      setStaffName(name || "")
      fetchPendingApprovals()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchPendingApprovals = async () => {
    try {
      const response = await fetch("/api/neredeyiz/progress?status=PENDING_APPROVAL")
      if (response.ok) {
        const data = await response.json()
        setPendingApprovals(data)
      }
    } catch (err) {
      console.error("Error fetching pending approvals:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_role")
    localStorage.removeItem("auth_token")
    localStorage.removeItem("staff_id")
    localStorage.removeItem("staff_name")
    localStorage.removeItem("staff_department")
    router.push("/login")
    router.refresh()
  }

  const quickLinks = [
    { name: "Neredeyiz?", href: "/rehberlik/neredeyiz", icon: Target, color: "from-blue-600 to-indigo-600" },
    { name: "Gezi Yönetimi", href: "/rehberlik/gezi", icon: MapPin, color: "from-green-600 to-emerald-600" },
    { name: "Kulüp Yönetimi", href: "/rehberlik/clubs", icon: Users, color: "from-purple-600 to-pink-600" },
    { name: "IB Faaliyet Yönetimi", href: "/rehberlik/activities", icon: Award, color: "from-yellow-600 to-orange-600" },
    { name: "Veli Görüşmeleri", href: "/rehberlik/veli-gorusmeleri", icon: MessageSquare, color: "from-teal-600 to-cyan-600" },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Rehberlik Paneli</h1>
                  <p className="text-sm text-gray-600">{staffName}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Çıkış Yap
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Onay Bekleyen Konular */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Onay Bekleyen Konular</h2>
                <p className="text-gray-600">Öğretmenler tarafından tamamlandı olarak işaretlenen konular</p>
              </div>
              {pendingApprovals.length > 0 && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  {pendingApprovals.length} bekleyen
                </span>
              )}
            </div>

            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-gray-500">Yükleniyor...</p>
                </CardContent>
              </Card>
            ) : pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium mb-1">Onay bekleyen konu bulunmuyor</p>
                  <p className="text-gray-400 text-sm">Tüm konular onaylanmış durumda.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((approval) => (
                  <Card key={approval.id} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {approval.topic.unit.subject.name} - {approval.topic.unit.name}
                            </h3>
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Onay Bekliyor
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">
                            <strong>Konu:</strong> {approval.topic.name}
                          </p>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                            <span>
                              {approval.topic.unit.subject.grade}. Sınıf
                              {approval.topic.unit.subject.section && ` - ${approval.topic.unit.subject.section} Şubesi`}
                            </span>
                            {approval.actualEndDate && (
                              <span>
                                Tamamlanma: {new Date(approval.actualEndDate).toLocaleDateString("tr-TR")}
                              </span>
                            )}
                            {approval.reportedAt && (
                              <span>
                                İşaretleme: {new Date(approval.reportedAt).toLocaleDateString("tr-TR")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href={`/rehberlik/neredeyiz/onay/${approval.topicId}`}>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            İncele & Onayla
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Hızlı Erişim */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Hızlı Erişim</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link key={link.href} href={link.href}>
                    <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg h-full">
                      <CardContent className="p-6">
                        <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center mb-4`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-gray-900 text-lg">{link.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

