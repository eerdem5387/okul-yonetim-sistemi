"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import VeliSidebar from "@/components/layout/veli-sidebar"
import { FileText, Calendar, TrendingUp, Loader2, Award } from "lucide-react"

interface ExamResult {
  id: string
  totalScore: number | null
  ranking: number | null
  percentile: number | null
  scores: Record<string, unknown>
  notes: string | null
  exam: {
    name: string
    examType: string
    examDate: string
    grade: number | null
    classId: string | null
    class?: {
      id: string
      name: string
      grade: number
      section: string
    }
  }
}

export default function VeliSinavlarPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<ExamResult[]>([])
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
      fetchResults(parentId)
    }
  }, [router])

  const fetchResults = async (parentId: string) => {
    try {
      const studentsResponse = await fetch(`/api/parents/my-students?parentId=${parentId}`)
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        const student = studentsData.students[0]
        
        if (student) {
          // Tüm sınavları getir ve öğrenci sonuçlarını filtrele
          const examsResponse = await fetch("/api/exams")
          if (examsResponse.ok) {
            const examsData = await examsResponse.json()
            
            // Her sınav için öğrenci sonucunu kontrol et
            const studentResults: ExamResult[] = []
            for (const exam of examsData.exams) {
              const resultsResponse = await fetch(
                `/api/exams/${exam.id}/results?studentId=${student.id}`
              )
              if (resultsResponse.ok) {
                const resultsData = await resultsResponse.json()
                if (resultsData.results.length > 0) {
                  studentResults.push(resultsData.results[0])
                }
              }
            }
            
            setResults(studentResults)
          }
        }
      }
    } catch (error) {
      console.error("Error fetching results:", error)
    } finally {
      setLoading(false)
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
              <FileText className="h-8 w-8 text-green-600" />
              {studentName} - Sınavlar
            </h1>
            <p className="text-gray-600 mt-1">Öğrencinizin sınav sonuçlarını görüntüleyin</p>
          </div>

          <div className="space-y-4">
            {results.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Henüz sınav sonucu bulunmuyor
                  </h3>
                  <p className="text-gray-600">
                    Rehberlik sınav sonuçlarını girdiğinde burada görüntülenecektir
                  </p>
                </CardContent>
              </Card>
            ) : (
              results.map((result) => (
                <Card key={result.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{result.exam.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Tip: {result.exam.examType}
                        </p>
                      </div>
                      {result.ranking && (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-purple-600">
                            <Award className="h-5 w-5" />
                            <span className="text-2xl font-bold">#{result.ranking}</span>
                          </div>
                          <div className="text-xs text-gray-600">Sıralama</div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {result.totalScore !== null && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Toplam Puan</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {result.totalScore}
                          </div>
                        </div>
                      )}
                      {result.ranking !== null && (
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Sıralama</div>
                          <div className="text-2xl font-bold text-purple-600">
                            #{result.ranking}
                          </div>
                        </div>
                      )}
                      {result.percentile !== null && (
                        <div className="p-4 bg-green-50 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Yüzdelik Dilim</div>
                          <div className="text-2xl font-bold text-green-600">
                            %{result.percentile.toFixed(1)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(result.exam.examDate).toLocaleDateString("tr-TR")}
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {result.exam.examType}
                      </span>
                    </div>

                    {result.notes && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <strong>Rehberlik Notu:</strong> {result.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

