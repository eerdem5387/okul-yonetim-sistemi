"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Check, X, LogOut, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Student {
  id: string
  firstName: string
  lastName: string
  tcNumber: string
  grade: string
}

interface Club {
  id: string
  name: string
  description?: string
  capacity: number
  selections?: Array<{ id: string; studentId: string; clubId: string }>
}

export default function ParentPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedClubs, setSelectedClubs] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const fetchStudents = useCallback(async () => {
    try {
      const response = await fetch("/api/students?limit=1000")
      if (!response.ok) throw new Error("Failed to fetch students")
      const data = await response.json()
      const studentsList = Array.isArray(data) ? data : (data.students || [])
      setStudents(studentsList)
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    }
  }, [])

  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/clubs")
      if (!response.ok) throw new Error("Failed to fetch clubs")
      const data = await response.json()
      setClubs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching clubs:", error)
      setClubs([])
    }
  }, [])

  useEffect(() => {
    fetchStudents()
    fetchClubs()
  }, [fetchStudents, fetchClubs])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredStudents(students)
    } else {
      const filtered = students.filter(student =>
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.tcNumber.includes(searchTerm) ||
        student.grade.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredStudents(filtered)
    }
  }, [searchTerm, students])

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student)
    // Öğrenci seçildiğinde mevcut kulüp seçimlerini yükle
    fetchStudentClubs(student.id)
  }

  const fetchStudentClubs = async (studentId: string) => {
    try {
      const response = await fetch(`/api/clubs/students?studentId=${studentId}`)
      if (response.ok) {
        const data = await response.json()
        const clubIds: string[] = Array.isArray(data) 
          ? data
              .map((c: { clubId?: string; club?: { id: string } }) => c.clubId || c.club?.id)
              .filter((id): id is string => typeof id === 'string' && id !== '')
          : []
        setSelectedClubs(clubIds)
      }
    } catch (error) {
      console.error("Error fetching student clubs:", error)
      setSelectedClubs([])
    }
  }

  const handleClubToggle = (clubId: string) => {
    if (selectedClubs.includes(clubId)) {
      // Seçimi kaldır
      setSelectedClubs(selectedClubs.filter(id => id !== clubId))
    } else {
      // Yeni seçim ekle
      if (selectedClubs.length >= 3) {
        alert("Maksimum 3 kulüp seçebilirsiniz!")
        return
      }
      
      // Kapasite kontrolü - seçili olan diğer kulüplerin de kontejanını hesaba kat
      const club = clubs.find(c => c.id === clubId)
      if (club) {
        const currentSelections = (club.selections?.length || 0)
        
        // Eğer bu kulüp zaten doluysa
        if (currentSelections >= club.capacity) {
          alert(`❌ ${club.name} kulübünün kontenjanı doludur!`)
          return
        }
      }
      
      setSelectedClubs([...selectedClubs, clubId])
    }
  }

  const handleConfirm = () => {
    if (!selectedStudent) {
      alert("Lütfen bir öğrenci seçin!")
      return
    }

    if (selectedClubs.length === 0) {
      alert("Lütfen en az bir kulüp seçin!")
      return
    }

    if (selectedClubs.length > 3) {
      alert("Maksimum 3 kulüp seçebilirsiniz!")
      return
    }

    setShowConfirmModal(true)
  }

  const handleSubmit = async () => {
    setShowConfirmModal(false)
    setSubmitting(true)
    try {
      const response = await fetch("/api/clubs/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubSelections: selectedClubs.map(clubId => ({
            clubId,
            studentId: selectedStudent.id
          }))
        })
      })

      if (response.ok) {
        // Başarılı kayıt sonrası kulüp listesini yenile (kontejan güncellemesi için)
        await fetchClubs()
        await fetchStudentClubs(selectedStudent.id)
        
        alert("Kulüp seçimleri başarıyla kaydedildi!")
        setSelectedClubs([])
        setSelectedStudent(null)
        setSearchTerm("")
      } else {
        const errorData = await response.json()
        if (errorData.error && errorData.existingClubs) {
          const clubNames = errorData.existingClubs.map((club: { name: string }) => club.name).join(", ")
          alert(`⚠️ Bu öğrenci zaten şu kulüplere kayıtlı:\n\n${clubNames}\n\nLütfen farklı kulüpler seçin.`)
        } else if (errorData.error && errorData.fullClubs) {
          const clubNames = errorData.fullClubs.map((club: { name: string }) => club.name).join(", ")
          alert(`⚠️ Şu kulüplerin kontenjanı dolmuş:\n\n${clubNames}\n\nLütfen farklı kulüpler seçin.`)
        } else {
          alert(errorData.error || "Kulüp seçimleri kaydedilirken hata oluştu!")
        }
      }
    } catch (error) {
      console.error("Error saving club selections:", error)
      alert("Kulüp seçimleri kaydedilirken hata oluştu!")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_role")
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Veli Paneli</h1>
              <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Öğrenci seçin ve kulüp tercihlerinizi yapın</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Öğrenci Seçimi */}
          <Card className="shadow-lg">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Öğrenci Seçimi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Kulüp seçimi yapmak için öğrencinizi seçin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Öğrenci ara (ad, soyad, TC, sınıf)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="border rounded-lg max-h-64 sm:max-h-96 overflow-y-auto custom-scrollbar">
                {filteredStudents.length > 0 ? (
                  <div className="divide-y">
                    {filteredStudents.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => handleStudentSelect(student)}
                        className={`w-full p-3 sm:p-4 text-left hover:bg-blue-50 active:bg-blue-100 transition-colors touch-manipulation ${
                          selectedStudent?.id === student.id ? "bg-blue-100 border-l-4 border-blue-600" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                              {student.grade} • TC: {student.tcNumber}
                            </p>
                          </div>
                          {selectedStudent?.id === student.id && (
                            <Check className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 sm:p-8 text-center text-gray-500">
                    <p className="text-sm sm:text-base">Öğrenci bulunamadı</p>
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1">Seçili Öğrenci:</p>
                  <p className="text-sm sm:text-base text-blue-700 font-medium">
                    {selectedStudent.firstName} {selectedStudent.lastName} - {selectedStudent.grade}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Kulüp Seçimi */}
          <Card className="shadow-lg">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl">Kulüp Seçimi</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Maksimum 3 kulüp seçebilirsiniz ({selectedClubs.length}/3)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              {!selectedStudent ? (
                <div className="p-6 sm:p-8 text-center text-gray-500">
                  <p className="text-sm sm:text-base">Lütfen önce bir öğrenci seçin</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                    {clubs.length > 0 ? (
                      clubs.map((club) => {
                        const isSelected = selectedClubs.includes(club.id)
                        // Seçili kulüpler için +1 ekle (henüz kaydedilmemiş olsa bile)
                        // Bu sayede seçim yapıldığında kontejan otomatik olarak artar
                        const currentSelections = (club.selections?.length || 0) + (isSelected ? 1 : 0)
                        const isFull = currentSelections >= club.capacity
                        const availableSlots = Math.max(0, club.capacity - currentSelections)
                        
                        return (
                          <div
                            key={club.id}
                            className={`relative group transition-all duration-300 ${
                              isFull && !isSelected
                                ? "opacity-30 blur-[2px] pointer-events-none"
                                : "opacity-100"
                            }`}
                          >
                            <button
                              onClick={() => !isFull && handleClubToggle(club.id)}
                              disabled={isFull && !isSelected}
                              className={`w-full p-3 sm:p-4 text-left border-2 rounded-xl transition-all duration-200 touch-manipulation ${
                                isSelected
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-500 shadow-md active:shadow-lg"
                                  : isFull
                                  ? "bg-gray-50 border-gray-200 cursor-not-allowed"
                                  : "bg-white border-gray-200 active:border-blue-300 active:bg-blue-50 active:shadow-md"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 sm:gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                    <p className={`font-bold text-base sm:text-lg ${
                                      isSelected ? "text-blue-700" : isFull ? "text-gray-400" : "text-gray-900"
                                    }`}>
                                      {club.name}
                                    </p>
                                    {isSelected && (
                                      <div className="flex items-center gap-1 bg-blue-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold animate-pulse">
                                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                        <span>Seçildi</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {club.description && (
                                    <p className={`text-xs sm:text-sm mb-2 ${
                                      isSelected ? "text-blue-600" : isFull ? "text-gray-400" : "text-gray-600"
                                    }`}>
                                      {club.description}
                                    </p>
                                  )}
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 sm:mt-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`h-1.5 sm:h-2 w-20 sm:w-24 rounded-full overflow-hidden ${
                                        isFull ? "bg-gray-200" : "bg-gray-200"
                                      }`}>
                                        <div
                                          className={`h-full transition-all duration-500 ${
                                            isFull
                                              ? "bg-red-500 w-full"
                                              : availableSlots <= 2
                                              ? "bg-orange-500"
                                              : "bg-green-500"
                                          }`}
                                          style={{
                                            width: `${Math.min(100, (currentSelections / club.capacity) * 100)}%`
                                          }}
                                        />
                                      </div>
                                      <span className={`text-[10px] sm:text-xs font-semibold ${
                                        isFull ? "text-red-600" : availableSlots <= 2 ? "text-orange-600" : "text-green-600"
                                      }`}>
                                        {currentSelections}/{club.capacity}
                                      </span>
                                    </div>
                                    {availableSlots > 0 && !isFull && (
                                      <span className={`text-[10px] sm:text-xs font-medium ${
                                        availableSlots <= 2 ? "text-orange-600" : "text-gray-600"
                                      }`}>
                                        {availableSlots === 1 
                                          ? "Son kontenjan!" 
                                          : `${availableSlots} kontenjan kaldı`}
                                      </span>
                                    )}
                                    {isFull && (
                                      <span className="text-[10px] sm:text-xs font-semibold text-red-600">
                                        Kontenjan dolu
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {!isSelected && !isFull && (
                                  <div className="flex-shrink-0">
                                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full border-2 border-gray-300 group-active:border-blue-500 transition-colors flex items-center justify-center">
                                      <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-gray-300 group-active:bg-blue-500 transition-colors" />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </button>
                            
                            {/* Dolu kulüp mesajı */}
                            {isFull && !isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                                <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 sm:px-5 py-2 sm:py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-bold animate-pulse border-2 border-red-400 mx-2">
                                  <div className="flex items-center gap-1.5 sm:gap-2">
                                    <span className="text-sm sm:text-lg">⚠️</span>
                                    <span className="whitespace-nowrap">Bu kulübün kontenjanı doludur</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-6 sm:p-8 text-center text-gray-500">
                        <p className="text-base sm:text-lg mb-1 sm:mb-2">Kulüp bulunamadı</p>
                        <p className="text-xs sm:text-sm">Henüz hiç kulüp eklenmemiş</p>
                      </div>
                    )}
                  </div>

                  {selectedClubs.length > 0 && (
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <p className="text-xs sm:text-sm font-bold text-green-900">Seçili Kulüpler ({selectedClubs.length}/3)</p>
                        <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-green-600 flex items-center justify-center">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {selectedClubs.map((clubId) => {
                          const club = clubs.find(c => c.id === clubId)
                          return club ? (
                            <div 
                              key={clubId} 
                              className="flex items-center justify-between p-2 sm:p-2.5 bg-white rounded-lg border border-green-200 active:border-green-400 transition-colors"
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                                <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-600 animate-pulse flex-shrink-0" />
                                <span className="text-xs sm:text-sm font-semibold text-green-800 truncate">{club.name}</span>
                                <span className="text-[10px] sm:text-xs font-medium text-green-600 bg-green-100 px-1.5 sm:px-2 py-0.5 rounded flex-shrink-0">
                                  {((club.selections?.length || 0) + 1)}/{club.capacity}
                                </span>
                              </div>
                              <button
                                onClick={() => handleClubToggle(clubId)}
                                className="text-red-600 active:text-red-700 active:bg-red-50 p-1 rounded transition-colors touch-manipulation flex-shrink-0"
                                title="Seçimi kaldır"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : null
                        })}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleConfirm}
                    disabled={!selectedStudent || selectedClubs.length === 0 || submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 sm:py-6 text-base sm:text-lg shadow-lg active:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Kaydediliyor...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Check className="h-5 w-5" />
                        Onayla ({selectedClubs.length} kulüp)
                      </span>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Onay Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
          onClick={() => !submitting && setShowConfirmModal(false)}
        >
          <Card
            className="w-full max-w-md bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-3 right-3 sm:top-4 sm:right-4 h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => !submitting && setShowConfirmModal(false)}
                disabled={submitting}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center justify-center mb-2 sm:mb-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl text-center">Seçimleri Onayla</CardTitle>
              <CardDescription className="text-center mt-1 sm:mt-2 text-sm sm:text-base">
                Seçimlerinizi onaylıyor musunuz?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
              {selectedStudent && (
                <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs sm:text-sm font-semibold text-blue-900 mb-1 sm:mb-2">Öğrenci:</p>
                  <p className="text-sm sm:text-base text-blue-700 font-medium">
                    {selectedStudent.firstName} {selectedStudent.lastName} - {selectedStudent.grade}
                  </p>
                </div>
              )}

              {selectedClubs.length > 0 && (
                <div className="p-3 sm:p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs sm:text-sm font-semibold text-green-900 mb-1.5 sm:mb-2">Seçilen Kulüpler:</p>
                  <div className="space-y-1 sm:space-y-1.5">
                    {selectedClubs.map((clubId) => {
                      const club = clubs.find(c => c.id === clubId)
                      return club ? (
                        <div key={clubId} className="flex items-center gap-2 text-xs sm:text-sm">
                          <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 flex-shrink-0" />
                          <span className="text-green-800">{club.name}</span>
                        </div>
                      ) : null
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button
                  variant="outline"
                  onClick={() => !submitting && setShowConfirmModal(false)}
                  className="flex-1 h-11 sm:h-12 text-sm sm:text-base"
                  disabled={submitting}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-11 sm:h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm sm:text-base touch-manipulation"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Kaydediliyor...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4" />
                      Onayla ve Kaydet
                    </span>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

