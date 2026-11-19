"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
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
  School
} from "lucide-react"
import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"

interface LateTopic {
  subjectId: string
  topicId: string
  className: string
  subjectName: string
  topicName: string
  rangeLabel: string
  lateDays: number
  teachers: string[]
}

export default function RehberlikPage() {
  const router = useRouter()
  const [staffName, setStaffName] = useState<string>("")
  const [lateTopics, setLateTopics] = useState<LateTopic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const name = localStorage.getItem("staff_name")

      if (role !== "counselor" && role !== "head_counselor") {
        router.push("/login")
        return
      }

      setStaffName(name || "")
      fetchLateTopics()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Rehberi olduğum sınıflarda planlanan aralıkta tamamlanmamış konular (haftalık Neredeyiz). */
  const fetchLateTopics = async () => {
    try {
      const response = await fetch("/api/neredeyiz/board?mine=1")
      if (response.ok) {
        const data = await response.json()
        setLateTopics(data.lateTopics ?? [])
      }
    } catch (err) {
      console.error("Error fetching late topics:", err)
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
    { name: "İç Haberleşme", href: "/mesajlar", icon: MessageSquare, color: "from-sky-600 to-blue-600" },
    { name: "Neredeyiz? · Haftalık pano", href: "/neredeyiz", icon: Target, color: "from-blue-600 to-indigo-600" },
    { name: "Sınıf Yönetimi", href: "/sinif-yonetimi", icon: School, color: "from-indigo-600 to-purple-600" },
    { name: "Gezi Yönetimi", href: "/rehberlik/gezi", icon: MapPin, color: "from-green-600 to-emerald-600" },
    { name: "Kulüp Yönetimi", href: "/rehberlik/clubs", icon: Users, color: "from-purple-600 to-pink-600" },
    { name: "Faaliyet Yönetimi", href: "/faaliyet-yonetimi", icon: Award, color: "from-yellow-600 to-orange-600" },
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
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sınıflarımda geciken konular</h2>
                <p className="text-gray-600">Planlanan haftalarda tamamlanmayan konular. Zamanında gidenler için işlem gerekmez.</p>
              </div>
              {lateTopics.length > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-900 rounded-full text-sm font-semibold">
                  {lateTopics.length} konu
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
            ) : lateTopics.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-3" />
                  <p className="text-gray-700 font-medium mb-1">Geciken konu yok</p>
                  <p className="text-gray-500 text-sm">Sınıflarınızdaki dersler planlandığı gibi ilerliyor.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lateTopics.slice(0, 8).map((t) => (
                  <Card key={t.topicId} className="border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {t.className} · {t.subjectName}
                          </h3>
                          <p className="text-sm text-gray-800 mt-1">{t.topicName}</p>
                          <p className="text-xs text-red-800 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Plan: {t.rangeLabel} · {t.lateDays} ders günü gecikti
                            {t.teachers.length ? ` · ${t.teachers.join(", ")}` : ""}
                          </p>
                        </div>
                        <Link href={`/neredeyiz/ders/${t.subjectId}`}>
                          <Button size="sm" variant="outline">
                            Ayrıntı
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {lateTopics.length > 8 && (
                  <Link href="/neredeyiz" className="block text-sm font-semibold text-indigo-700">
                    Tümünü haftalık panoda gör ({lateTopics.length})
                  </Link>
                )}
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

