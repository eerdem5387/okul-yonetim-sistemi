"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Plus, Trash2, Search, UserPlus, UserMinus } from "lucide-react"
import Link from "next/link"

interface Club {
  id: string
  name: string
  description: string | null
  capacity: number
  createdAt: string
  selections: {
    id: string
    student: {
      id: string
      firstName: string
      lastName: string
      tcNumber: string
      grade: string
    }
  }[]
}

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

export default function ClubDetailPage({ params }: { params: { id: string } }) {
  const [club, setClub] = useState<Club | null>(null)
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showAddStudent, setShowAddStudent] = useState(false)

  useEffect(() => {
    fetchClub()
    fetchStudents()
  }, [params.id])

  useEffect(() => {
    filterStudents()
  }, [allStudents, searchTerm, club])

  const fetchClub = async () => {
    try {
      const response = await fetch(`/api/clubs/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setClub(data)
      }
    } catch (error) {
      console.error("Error fetching club:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      if (response.ok) {
        const data = await response.json()
        setAllStudents(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      setAllStudents([])
    }
  }

  const filterStudents = () => {
    if (!club) return

    const clubStudentIds = club.selections.map(selection => selection.student.id)
    let filtered = allStudents.filter(student => !clubStudentIds.includes(student.id))

    if (searchTerm) {
      filtered = filtered.filter(student =>
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.tcNumber.includes(searchTerm)
      )
    }

    setFilteredStudents(filtered)
  }

  const handleAddStudent = async (studentId: string) => {
    try {
      const response = await fetch(`/api/clubs/${params.id}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId }),
      })

      if (response.ok) {
        alert("Öğrenci kulübe eklendi!")
        fetchClub()
        setShowAddStudent(false)
      } else {
        alert("Öğrenci eklenirken bir hata oluştu.")
      }
    } catch (error) {
      console.error("Error adding student:", error)
      alert("Öğrenci eklenirken bir hata oluştu.")
    }
  }

  const handleRemoveStudent = async (selectionId: string) => {
    if (!confirm("Öğrenciyi kulüpten çıkarmak istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/clubs/${params.id}/students/${selectionId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        alert("Öğrenci kulüpten çıkarıldı!")
        fetchClub()
      } else {
        alert("Öğrenci çıkarılırken bir hata oluştu.")
      }
    } catch (error) {
      console.error("Error removing student:", error)
      alert("Öğrenci çıkarılırken bir hata oluştu.")
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Yükleniyor...</div>
      </div>
    )
  }

  if (!club) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">Kulüp bulunamadı</div>
      </div>
    )
  }

  const capacityPercentage = (club.selections.length / club.capacity) * 100
  const getCapacityColor = () => {
    if (capacityPercentage >= 100) return "bg-red-500"
    if (capacityPercentage >= 80) return "bg-orange-500"
    if (capacityPercentage >= 60) return "bg-yellow-500"
    return "bg-green-500"
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/clubs">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri Dön
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
        </div>
        <p className="text-gray-600">Kulüp detayları ve öğrenci yönetimi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kulüp Bilgileri */}
        <div className="lg:col-span-1">
          <Card className="card-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Users className="h-6 w-6 icon-blue" />
                Kulüp Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">Kulüp Adı</Label>
                <p className="text-lg font-semibold">{club.name}</p>
              </div>
              
              {club.description && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Açıklama</Label>
                  <p className="text-sm text-gray-600">{club.description}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-700">Kontejan</Label>
                <p className="text-lg font-semibold">{club.selections.length}/{club.capacity}</p>
                
                {/* Kontejan Dolum Barı */}
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">Dolum Oranı</span>
                    <span className="text-xs text-gray-500">{Math.round(capacityPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-300 ${getCapacityColor()}`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Oluşturulma Tarihi</Label>
                <p className="text-sm text-gray-600">
                  {new Date(club.createdAt).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Öğrenci Listesi */}
        <div className="lg:col-span-2">
          <Card className="card-soft border-0">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6 icon-green" />
                  Kulüp Üyeleri ({club.selections.length})
                </CardTitle>
                <Button
                  onClick={() => setShowAddStudent(!showAddStudent)}
                  size="sm"
                  className="btn-primary"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Öğrenci Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddStudent && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Öğrenci ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border">
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-gray-500">{student.grade} - {student.tcNumber}</p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddStudent(student.id)}
                            className="btn-primary"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        {searchTerm ? "Arama kriterlerine uygun öğrenci bulunamadı" : "Tüm öğrenciler bu kulüpte"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {club.selections.length > 0 ? (
                  club.selections.map((selection) => (
                    <div key={selection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{selection.student.firstName} {selection.student.lastName}</p>
                        <p className="text-sm text-gray-500">{selection.student.grade} - {selection.student.tcNumber}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveStudent(selection.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        Çıkar
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Bu kulüpte henüz öğrenci bulunmuyor</p>
                    <p className="text-sm text-gray-400 mt-1">Öğrenci eklemek için yukarıdaki butonu kullanın</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
