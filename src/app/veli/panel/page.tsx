"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Calendar, FileText, MessageSquare, Loader2, User } from "lucide-react"
import Link from "next/link"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  class?: {
    id: string
    name: string
    counselor?: {
      firstName: string
      lastName: string
      phone?: string
      email?: string
    }
  }
  parents?: Array<{
    name: string
    tcNumber: string
    phone?: string
    email?: string
    relation: string
  }>
}

export default function VeliPanelPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [parentName, setParentName] = useState("")
  const [students, setStudents] = useState<Student[]>([])

  useEffect(() => {
    // Auth kontrolü
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const parentId = localStorage.getItem("parent_id")
      const studentName = localStorage.getItem("student_name")
      const savedParentName = localStorage.getItem("parent_name")

      if (role !== "parent" || !parentId) {
        router.push("/veli-login")
        return
      }

      // Veli ismini veya öğrenci velisi olarak göster
      setParentName(savedParentName || (studentName ? `${studentName} Velisi` : "Veli"))
      fetchStudents(parentId)
    }
  }, [router])

  const fetchStudents = async (parentId: string) => {
    try {
      const response = await fetch(`/api/parents/my-students?parentId=${parentId}`)
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <span className="text-2xl font-bold">
                  {parentName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">Hoş Geldiniz, {parentName}</h1>
                <p className="text-white/80">Öğrencinizin tüm bilgilerine buradan ulaşabilirsiniz</p>
              </div>
            </div>
          </div>

          {/* Öğrenciler */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-green-600" />
              Öğrenci Bilgileri
            </h2>
            {students.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz öğrenci kaydı bulunamadı
                  </h3>
                  <p className="text-gray-600">
                    Okul idaresi ile iletişime geçiniz
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {students.map((student) => (
                  <Card key={student.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-green-600" />
                        {student.firstName} {student.lastName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Sınıf:</span>
                          <span className="font-medium">{student.class?.name || student.grade}</span>
                        </div>
                      </div>
                      
                      {student.parents && student.parents.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 mb-2">Veliler:</p>
                          <div className="space-y-2">
                            {student.parents.map((parent, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700 font-medium">{parent.relation}:</span>
                                <div className="text-right">
                                  <p className="text-sm">{parent.name}</p>
                                  {parent.phone && (
                                    <p className="text-xs text-gray-500">{parent.phone}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {student.class?.counselor && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 mb-1">Rehberlik Danışmanı:</p>
                          <p className="text-sm font-medium text-purple-600">
                            {student.class.counselor.firstName} {student.class.counselor.lastName}
                          </p>
                          {student.class.counselor.phone && (
                            <p className="text-xs text-gray-500">{student.class.counselor.phone}</p>
                          )}
                        </div>
                      )}
                      <Link href={`/veli/ogrenci/${student.id}`}>
                        <Button className="w-full mt-3 bg-green-600 hover:bg-green-700">
                          Detaylı Bilgiler
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Hızlı Erişim */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Hızlı Erişim</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/veli/odevler">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-6">
                    <BookOpen className="h-10 w-10 text-blue-600 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Ödevler</h3>
                    <p className="text-sm text-gray-600">
                      Öğrencinizin ödevlerini görüntüleyin
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/veli/yoklama">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50">
                  <CardContent className="p-6">
                    <Calendar className="h-10 w-10 text-green-600 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Yoklama</h3>
                    <p className="text-sm text-gray-600">
                      Devam durumunu takip edin
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/veli/sinavlar">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50">
                  <CardContent className="p-6">
                    <FileText className="h-10 w-10 text-purple-600 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Sınavlar</h3>
                    <p className="text-sm text-gray-600">
                      Sınav sonuçlarını inceleyin
                    </p>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/veli/gorusler">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-gradient-to-br from-orange-50 to-amber-50">
                  <CardContent className="p-6">
                    <MessageSquare className="h-10 w-10 text-orange-600 mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Görüşler</h3>
                    <p className="text-sm text-gray-600">
                      Öğretmen görüşlerini okuyun
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Bilgilendirme */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg text-green-900 mb-2">
                📱 Mobil Uyumlu
              </h3>
              <p className="text-sm text-green-700">
                Veli panelini cep telefonunuz veya tabletinizden de rahatlıkla kullanabilirsiniz.
                Öğrencinizin tüm bilgilerine istediğiniz zaman ulaşabilirsiniz.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

