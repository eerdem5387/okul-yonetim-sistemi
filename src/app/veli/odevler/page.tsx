"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, CheckCircle, XCircle, Loader2, AlertTriangle } from "lucide-react"

interface Homework {
  id: string
  title: string
  description: string
  dueDate: string
  subject?: string
  teacher: {
    firstName: string
    lastName: string
  }
  assignments: Array<{
    isCompleted: boolean
    completedAt?: string
  }>
}

export default function VeliOdevlerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<Homework[]>([])
  const [studentName, setStudentName] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("auth_role")
      const parentId = localStorage.getItem("parent_id")
      const savedStudentName = localStorage.getItem("student_name")

      if (role !== "parent" || !parentId) {
        router.push("/veli-login")
        return
      }

      setStudentName(savedStudentName || "Öğrenci")
      fetchHomeworks(parentId)
    }
  }, [router])

  const fetchHomeworks = async (parentId: string) => {
    try {
      // Önce öğrenci ID'sini al
      const studentsResponse = await fetch(`/api/parents/my-students?parentId=${parentId}`)
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        const student = studentsData.students[0]
        
        if (student) {
          // Öğrencinin ödevlerini getir
          const homeworkResponse = await fetch(`/api/homework?studentId=${student.id}`)
          if (homeworkResponse.ok) {
            const homeworkData = await homeworkResponse.json()
            setHomeworks(homeworkData.homeworks || [])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching homeworks:", error)
    } finally {
      setLoading(false)
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const getStatusIcon = (homework: Homework) => {
    const isCompleted = homework.assignments[0]?.isCompleted
    const overdue = isOverdue(homework.dueDate)

    if (isCompleted) {
      return <CheckCircle className="h-6 w-6 text-green-600" />
    } else if (overdue) {
      return <AlertTriangle className="h-6 w-6 text-red-600" />
    } else {
      return <XCircle className="h-6 w-6 text-gray-400" />
    }
  }

  const getStatusBadge = (homework: Homework) => {
    const isCompleted = homework.assignments[0]?.isCompleted
    const overdue = isOverdue(homework.dueDate)

    if (isCompleted) {
      return (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
          Tamamlandı
        </span>
      )
    } else if (overdue) {
      return (
        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          Süre Geçti
        </span>
      )
    } else {
      return (
        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
          Bekliyor
        </span>
      )
    }
  }

  const stats = {
    total: homeworks.length,
    completed: homeworks.filter((h) => h.assignments[0]?.isCompleted).length,
    pending: homeworks.filter(
      (h) => !h.assignments[0]?.isCompleted && !isOverdue(h.dueDate)
    ).length,
    overdue: homeworks.filter(
      (h) => !h.assignments[0]?.isCompleted && isOverdue(h.dueDate)
    ).length,
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
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-green-600" />
              {studentName} - Ödevler
            </h1>
            <p className="text-gray-600 mt-1">Öğrencinizin ödevlerini takip edin</p>
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-gray-600">Toplam Ödev</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-gray-600">Tamamlandı</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <XCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-xs text-gray-600">Bekliyor</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
                <div className="text-xs text-gray-600">Süre Geçti</div>
              </CardContent>
            </Card>
          </div>

          {/* Ödev Listesi */}
          <div className="space-y-4">
            {homeworks.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz ödev bulunmuyor
                  </h3>
                  <p className="text-gray-600">
                    Öğrencinize ödev verildiğinde burada görüntülenecektir
                  </p>
                </CardContent>
              </Card>
            ) : (
              homeworks.map((homework) => (
                <Card key={homework.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(homework)}
                        <div>
                          <CardTitle className="text-lg">{homework.title}</CardTitle>
                          <p className="text-sm text-gray-600 mt-1">
                            Öğretmen: {homework.teacher.firstName} {homework.teacher.lastName}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(homework)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-gray-700">{homework.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {homework.subject && (
                        <span className="text-gray-600">📚 {homework.subject}</span>
                      )}
                      <span className="text-gray-600 flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Teslim: {new Date(homework.dueDate).toLocaleDateString("tr-TR")}
                      </span>
                      {homework.assignments[0]?.isCompleted && homework.assignments[0]?.completedAt && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Tamamlandı:{" "}
                          {new Date(homework.assignments[0].completedAt).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
    </div>
  )
}

