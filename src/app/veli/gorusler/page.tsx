"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import VeliSidebar from "@/components/layout/veli-sidebar"
import { MessageSquare, Calendar, ThumbsUp, ThumbsDown, Loader2, User } from "lucide-react"

interface StudentComment {
  id: string
  commentType: string
  category: string | null
  content: string
  isPositive: boolean
  createdAt: string
  staff: {
    id: string
    firstName: string
    lastName: string
    department: string
    position: string | null
    subject: string | null
  }
}

export default function VeliGoruslerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<StudentComment[]>([])
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
      fetchComments(parentId)
    }
  }, [router])

  const fetchComments = async (parentId: string) => {
    try {
      // Önce öğrenciyi al
      const studentsResponse = await fetch(`/api/parents/my-students?parentId=${parentId}`)
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        const student = studentsData.students[0]
        
        if (student) {
          // Öğrencinin görüşlerini al
          const commentsResponse = await fetch(`/api/student-comments?studentId=${student.id}`)
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json()
            setComments(commentsData.comments || [])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCommentTypeLabel = (type: string) => {
    switch (type) {
      case "ACADEMIC":
        return "📚 Akademik"
      case "BEHAVIORAL":
        return "🤝 Davranışsal"
      case "GENERAL":
        return "💬 Genel"
      default:
        return type
    }
  }

  const getDepartmentLabel = (department: string) => {
    switch (department) {
      case "TEACHER":
        return "Öğretmen"
      case "COUNSELOR":
        return "Rehberlik"
      case "PRINCIPAL":
        return "Müdür"
      case "VICE_PRINCIPAL":
        return "Müdür Yardımcısı"
      case "STUDENT_AFFAIRS":
        return "Öğrenci İşleri"
      default:
        return department
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen">
        <VeliSidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <VeliSidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-green-600" />
              {studentName} - Öğretmen Görüşleri
            </h1>
            <p className="text-gray-600 mt-1">
              Öğretmen ve rehberlik ekibinin öğrenciniz hakkındaki görüşleri
            </p>
          </div>

          <div className="space-y-4">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz görüş bulunmuyor
                  </h3>
                  <p className="text-gray-600">
                    Öğretmen veya rehberlik ekibi görüş eklediğinde burada görüntülenecektir
                  </p>
                </CardContent>
              </Card>
            ) : (
              comments.map((comment) => (
                <Card
                  key={comment.id}
                  className={`hover:shadow-lg transition-shadow ${
                    comment.isPositive ? "border-l-4 border-l-green-500" : "border-l-4 border-l-orange-500"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-full ${
                          comment.isPositive ? "bg-green-100" : "bg-orange-100"
                        }`}
                      >
                        {comment.isPositive ? (
                          <ThumbsUp className="h-6 w-6 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-6 w-6 text-orange-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                            {getCommentTypeLabel(comment.commentType)}
                          </span>
                          {comment.category && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                              {comment.category}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-800 text-lg leading-relaxed mb-4">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600 border-t pt-3">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <strong>{comment.staff.firstName} {comment.staff.lastName}</strong>
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{getDepartmentLabel(comment.staff.department)}</span>
                          {comment.staff.subject && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span>{comment.staff.subject}</span>
                            </>
                          )}
                          <span className="text-gray-400">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(comment.createdAt).toLocaleDateString("tr-TR", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {comments.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Not:</strong> Bu görüşler öğrencinizin akademik ve sosyal gelişimini takip etmek için öğretmen ve rehberlik ekibi tarafından paylaşılmaktadır. Herhangi bir soru veya görüşünüz için lütfen okul rehberlik servisi ile iletişime geçiniz.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

