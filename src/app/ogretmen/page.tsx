"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Loader2, LogOut, User } from "lucide-react"
import Link from "next/link"

interface Subject {
  id: string
  name: string
  grade: number
  section: string | null
  academicYear: {
    id: string
    name: string
  }
}

export default function OgretmenPage() {
  const router = useRouter()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [staffName, setStaffName] = useState<string>("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const id = localStorage.getItem("staff_id")
      const name = localStorage.getItem("staff_name")

      if (role !== "teacher" || !id) {
        router.push("/login")
        return
      }

      setStaffName(name || "")
      fetchAssignedSubjects(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAssignedSubjects = async (staffId: string) => {
    try {
      const response = await fetch(`/api/neredeyiz/subjects?staffId=${staffId}`)
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      }
    } catch (err) {
      console.error("Error fetching subjects:", err)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Öğretmen Paneli</h1>
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
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Atanmış Derslerim</h2>
          <p className="text-gray-600">Size atanmış dersleri ve yıllık planlarınızı görüntüleyebilirsiniz.</p>
        </div>

        {subjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium mb-1">Size henüz ders atanmamış</p>
              <p className="text-gray-400 text-sm">Yönetici tarafından ders ataması yapıldığında burada görünecektir.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <Link key={subject.id} href={`/ogretmen/dersler/${subject.id}`}>
                <Card className="cursor-pointer transition-all duration-200 hover:shadow-lg h-full">
                  <CardHeader className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg font-bold text-gray-900 truncate">
                          {subject.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {subject.grade}. Sınıf
                          {subject.section && ` - ${subject.section} Şubesi`}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-xs text-gray-500">{subject.academicYear.name}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

