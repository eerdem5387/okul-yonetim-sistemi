"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, X, AlertCircle, FileText } from "lucide-react"
import { useRouter } from "next/navigation"
import { clubMatchesStudentGrade } from "@/lib/club-grade-levels"

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
  gradeLevels?: number[]
  selections?: Array<{ id: string; studentId: string; clubId: string }>
}

export default function ParentPage() {
  const router = useRouter()
  const [clubs, setClubs] = useState<Club[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedClubs, setSelectedClubs] = useState<string[]>([])
  const [demandedClubIds, setDemandedClubIds] = useState<string[]>([])
  const [savedClubs, setSavedClubs] = useState<Array<{ id: string; name: string; capacity?: number }>>([])
  const [selectionReady, setSelectionReady] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [demandBusyId, setDemandBusyId] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showReselectConfirm, setShowReselectConfirm] = useState(false)

  // Öğrenci bilgisini localStorage'dan al
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Auth kontrolü
      const role = localStorage.getItem("auth_role")
      console.log("[Parent Page] 🔍 Auth kontrolü - Role:", role)
      
      if (role !== "parent") {
        console.log("[Parent Page] ❌ Role parent değil, /veli-login'e yönlendiriliyor")
        router.push("/veli-login")
        return
      }

      const studentId = localStorage.getItem("student_id")
      const studentName = localStorage.getItem("student_name") || ""
      const parentId = localStorage.getItem("parent_id")
      
      console.log("[Parent Page] 📋 LocalStorage - StudentId:", studentId, "ParentId:", parentId, "StudentName:", studentName)
      
      if (!parentId || !studentId) {
        console.log("[Parent Page] ❌ ParentId veya StudentId eksik, /veli-login'e yönlendiriliyor")
        router.push("/veli-login")
        return
      }
      
      console.log("[Parent Page] ✅ Auth kontrolü başarılı, öğrenci bilgileri yükleniyor")

      // Öğrenci bilgisini API'den çek (grade bilgisi için)
      const fetchStudentInfo = async () => {
        try {
          const studentsResponse = await fetch(`/api/parents/my-students?parentId=${parentId}`)
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json()
            const student = studentsData.students?.find((s: Student) => s.id === studentId) || studentsData.students?.[0]
            
            if (student) {
              const studentInfo: Student = {
                id: student.id,
                firstName: student.firstName || studentName.split(" ")[0] || "",
                lastName: student.lastName || studentName.split(" ").slice(1).join(" ") || "",
                tcNumber: student.tcNumber || localStorage.getItem("student_tc") || "",
                grade: student.grade || student.class?.name || "",
              }
              
              setSelectedStudent(studentInfo)
              fetchStudentClubs(studentInfo.id)
            } else {
              // API'den öğrenci bulunamazsa localStorage'dan oluştur
              const studentInfo: Student = {
                id: studentId,
                firstName: studentName.split(" ")[0] || "",
                lastName: studentName.split(" ").slice(1).join(" ") || "",
                tcNumber: localStorage.getItem("student_tc") || "",
                grade: "",
              }
              
              setSelectedStudent(studentInfo)
              fetchStudentClubs(studentId)
            }
          } else {
            // API hatası durumunda localStorage'dan oluştur
            const studentInfo: Student = {
              id: studentId,
              firstName: studentName.split(" ")[0] || "",
              lastName: studentName.split(" ").slice(1).join(" ") || "",
              tcNumber: localStorage.getItem("student_tc") || "",
              grade: "",
            }
            
            setSelectedStudent(studentInfo)
            fetchStudentClubs(studentId)
          }
        } catch (error) {
          console.error("Error fetching student info:", error)
          // Hata durumunda localStorage'dan oluştur
          const studentInfo: Student = {
        id: studentId,
        firstName: studentName.split(" ")[0] || "",
        lastName: studentName.split(" ").slice(1).join(" ") || "",
        tcNumber: localStorage.getItem("student_tc") || "",
            grade: "",
      }
      
          setSelectedStudent(studentInfo)
      fetchStudentClubs(studentId)
        }
      }
      
      fetchStudentInfo()
    }
  }, [router])

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
    fetchClubs()
  }, [fetchClubs])

  // Otomatik veri yenileme - Her 10 saniyede bir kulüp kontenjanlarını güncelle
  useEffect(() => {
    // Eğer bir öğrenci seçiliyse, düzenli olarak kulüp verilerini güncelle
    if (selectedStudent) {
      const intervalId = setInterval(() => {
        fetchClubs() // Kulüp kontenjanlarını yenile
        // Otomatik yenileme sırasında mevcut seçimleri koru (henüz onaylanmamış seçimler kaybolmasın)
        fetchStudentClubs(selectedStudent.id, true) // preserveCurrentSelections = true
      }, 10000) // 10 saniye

      return () => clearInterval(intervalId)
    }
  }, [selectedStudent, fetchClubs])

  const fetchStudentClubs = async (studentId: string, preserveCurrentSelections: boolean = false) => {
    try {
      const response = await fetch(`/api/clubs/students?studentId=${studentId}`)
      if (response.ok) {
        const data = await response.json()
        const rows: Array<{ clubId?: string; club?: { id?: string; name?: string; capacity?: number } }> =
          Array.isArray(data) ? data : Array.isArray(data.selections) ? data.selections : []
        const demanded = Array.isArray(data?.demandedClubIds)
          ? (data.demandedClubIds as unknown[]).filter((id): id is string => typeof id === "string")
          : []
        setDemandedClubIds(demanded)
        const dbClubIds: string[] = rows
          .map((c) => c.clubId || c.club?.id)
          .filter((id): id is string => typeof id === "string" && id !== "")
        const snapshots = rows
          .map((c) => ({
            id: c.clubId || c.club?.id || "",
            name: c.club?.name || "Kulüp",
            capacity: c.club?.capacity,
          }))
          .filter((c) => c.id)
        
        if (preserveCurrentSelections) {
          // Otomatik yenileme sırasında: Mevcut seçimleri koru, sadece veritabanındaki seçimleri ekle
          // (Kullanıcı henüz onaylamadan yaptığı seçimler kaybolmasın)
          setSelectedClubs(prevSelected => {
            // Veritabanındaki seçimler + mevcut seçimler (birleşim)
            const combined = [...new Set([...dbClubIds, ...prevSelected])]
            return combined
          })
        } else {
          setSavedClubs(snapshots)
          setSelectedClubs(dbClubIds)
          setSelecting(snapshots.length === 0)
          setSelectionReady(true)
        }
        return dbClubIds
      } else {
        console.error("Failed to fetch student clubs:", response.statusText)
        if (!preserveCurrentSelections) {
          setSelectedClubs([])
          setSavedClubs([])
          setSelecting(true)
          setSelectionReady(true)
        }
        return []
      }
    } catch (error) {
      console.error("Error fetching student clubs:", error)
      if (!preserveCurrentSelections) {
        setSelectedClubs([])
        setSavedClubs([])
        setSelecting(true)
        setSelectionReady(true)
      }
      return []
    }
  }

  const cancelSavedSelections = async () => {
    if (!selectedStudent) return
    setSubmitting(true)
    try {
      const response = await fetch("/api/clubs/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: selectedStudent.id, clubSelections: [] }),
      })
      if (!response.ok) throw new Error("İptal edilemedi")
      setSavedClubs([])
      setSelectedClubs([])
      setSelecting(true)
      setShowReselectConfirm(false)
      await fetchClubs()
    } catch (error) {
      console.error("Error clearing club selections:", error)
      alert("Mevcut seçimler iptal edilemedi.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleClubToggle = async (clubId: string) => {
    if (selectedClubs.includes(clubId)) {
      // Seçimi kaldır
      setSelectedClubs(selectedClubs.filter(id => id !== clubId))
    } else {
      // Yeni seçim ekle
      const visibleSelectedCount = selectedClubs.filter((id) => {
        const existing = clubs.find((item) => item.id === id)
        return existing ? clubMatchesStudentGrade(existing.gradeLevels, selectedStudent?.grade) : false
      }).length
      if (visibleSelectedCount >= 3) {
        alert("Maksimum 3 kulüp seçebilirsiniz!")
        return
      }
      
      // Seçim yapmadan önce GÜNCEL verileri çek (race condition önlemi)
      await fetchClubs()
      
      // Kapasite kontrolü - seçili olan diğer kulüplerin de kontejanını hesaba kat
      const club = clubs.find(c => c.id === clubId)
      if (club) {
        const currentSelections = (club.selections?.length || 0)
        
        // Eğer bu kulüp zaten doluysa
        if (currentSelections >= club.capacity) {
          alert(`❌ ${club.name} kulübünün kontenjanı dolmuştur!\n\nTalep oluştur butonunu kullanabilirsiniz.`)
          return
        }
      }
      
      setSelectedClubs([...selectedClubs, clubId])
    }
  }

  const createDemand = async (club: Club) => {
    if (!selectedStudent) return
    setDemandBusyId(club.id)
    try {
      const res = await fetch("/api/clubs/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: club.id, studentId: selectedStudent.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert((data as { error?: string }).error || "Talep oluşturulamadı")
        return
      }
      setDemandedClubIds((prev) =>
        prev.includes(club.id) ? prev : [...prev, club.id]
      )
      alert(
        (data as { alreadyExists?: boolean }).alreadyExists
          ? `${club.name} için talebiniz zaten kayıtlı.`
          : `${club.name} için talebiniz alındı.`
      )
    } finally {
      setDemandBusyId(null)
    }
  }

  const handleConfirm = async () => {
    if (!selectedStudent) {
      alert("Lütfen bir öğrenci seçin!")
      return
    }

    if (selectedClubs.length > 3) {
      alert("Maksimum 3 kulüp seçebilirsiniz!")
      return
    }

    // Onaylamadan önce son bir kez GÜNCEL verileri çek
    await fetchClubs()
    
    // Seçili kulüplerin hala uygun olup olmadığını kontrol et
    if (selectedClubs.length > 0) {
      const invalidClubs: string[] = []
      
      for (const clubId of selectedClubs) {
        const club = clubs.find(c => c.id === clubId)
        if (club && club.selections && club.selections.length >= club.capacity) {
          invalidClubs.push(club.name)
        }
      }
      
      if (invalidClubs.length > 0) {
        alert(`⚠️ Uyarı!\n\nŞu kulüplerin kontenjanı dolmuştur:\n${invalidClubs.join(", ")}\n\nLütfen bu kulüpleri çıkarıp başka kulüpler seçin.`)
        // Dolu olan kulüpleri seçimlerden otomatik çıkar
        const validClubIds = selectedClubs.filter(id => !invalidClubs.includes(clubs.find(c => c.id === id)?.name || ""))
        setSelectedClubs(validClubIds)
        return
      }
    }

    setShowConfirmModal(true)
  }

  const handleSubmit = async () => {
    if (!selectedStudent) {
      alert("Lütfen bir öğrenci seçin!")
      setShowConfirmModal(false)
      return
    }

    setShowConfirmModal(false)
    setSubmitting(true)
    try {
      const response = await fetch("/api/clubs/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          clubSelections: selectedClubs
            .filter((clubId) => {
              const club = clubs.find((item) => item.id === clubId)
              return club ? clubMatchesStudentGrade(club.gradeLevels, selectedStudent.grade) : false
            })
            .map(clubId => ({
            clubId,
            studentId: selectedStudent.id
          }))
        })
      })

      if (response.ok) {
        // Başarılı kayıt sonrası kulüp listesini yenile (kontejan güncellemesi için)
        await fetchClubs()
        
        // Kaydedilen kulüp sayısını sakla (state güncellenmeden önce)
        const savedClubCount = selectedClubs.length
        
        // Öğrencinin güncel kulüp seçimlerini yükle (veritabanından)
        // Bu işlem selectedClubs state'ini güncelleyecek
        await fetchStudentClubs(selectedStudent.id, false)
        if (savedClubCount === 0) {
          setSelecting(true)
        }
      } else {
        const errorData = await response.json()
        if (errorData.error && errorData.fullClubs) {
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

  const handleViewClubProgram = () => {
    // PDF'i yeni sekmede aç
    window.open("/kulup-programi.pdf", "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-50">
        <div className="p-3 sm:p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-4 sm:mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Kulüp Seçimi</h1>
                  {selectedStudent && (
                    <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                      {selecting
                        ? `${selectedStudent.firstName} ${selectedStudent.lastName} için kulüp tercihlerinizi yapın`
                        : `${selectedStudent.firstName} ${selectedStudent.lastName} için kulüp seçimi tamamlandı`}
                    </p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={handleViewClubProgram}
                    className="w-full sm:w-auto h-10 sm:h-11 text-sm sm:text-base bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Kulüp Programı
                  </Button>
                </div>
              </div>
            </div>

        {!selectionReady || !selectedStudent ? (
          <Card className="shadow-lg max-w-4xl mx-auto">
            <CardContent className="p-6 sm:p-8 text-center">
              <div className="inline-block h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm sm:text-base text-gray-500">Öğrenci bilgileri yükleniyor...</p>
            </CardContent>
          </Card>
        ) : !selecting && savedClubs.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
            <Card className="shadow-lg order-2 lg:order-1">
              <CardHeader>
                <CardTitle>Kulüp seçiminiz kaydedildi</CardTitle>
                <CardDescription>
                  {selectedStudent.firstName} {selectedStudent.lastName} · {selectedStudent.grade}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Seçimler kayda alındı. Değiştirmek için tekrar seçim yapın. Bu işlem mevcut kaydı siler.
                </p>
              </CardContent>
            </Card>
            <div className="space-y-3 order-1 lg:order-2">
              <Card className="shadow-lg border-green-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Seçilen kulüpler</CardTitle>
                  <CardDescription>{savedClubs.length}/3</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {savedClubs.map((saved) => {
                    const live = clubs.find((club) => club.id === saved.id)
                    const filled = live?.selections?.length
                    return (
                      <div key={saved.id} className="rounded-xl border border-green-200 bg-green-50 px-3 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900">{live?.name || saved.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-[11px] font-semibold text-white">
                            <Check className="h-3 w-3" />
                            Kayıtlı
                          </span>
                        </div>
                        {typeof filled === "number" && (
                          <p className="mt-1 text-xs text-gray-500">
                            {filled}/{live?.capacity ?? saved.capacity}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowReselectConfirm(true)}
                disabled={submitting}
              >
                Tekrar seçim yap
              </Button>
            </div>
          </div>
        ) : (
          <Card className="shadow-lg max-w-4xl mx-auto">
            <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-lg sm:text-xl">Kulüp Seçimi</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Maksimum 3 kulüp seçebilirsiniz ({selectedClubs.filter((id) => {
                      const existing = clubs.find((item) => item.id === id)
                      return existing ? clubMatchesStudentGrade(existing.gradeLevels, selectedStudent?.grade) : false
                    }).length}/3)
                  </CardDescription>
                </div>
                {selectedStudent && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] sm:text-xs text-green-700 font-medium whitespace-nowrap">
                      Otomatik güncelleniyor
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-96 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                    {clubs.filter((club) => clubMatchesStudentGrade(club.gradeLevels, selectedStudent.grade)).length > 0 ? (
                      clubs.filter((club) => clubMatchesStudentGrade(club.gradeLevels, selectedStudent.grade)).map((club) => {
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
                                ? "opacity-100"
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
                                  ? "bg-gray-50 border-gray-200 cursor-default"
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
                            
                            {/* Dolu kulüp — talep */}
                            {isFull && !isSelected && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
                                <span className="text-[10px] sm:text-xs font-semibold text-red-600">
                                  Kontenjan dolu
                                </span>
                                {demandedClubIds.includes(club.id) ? (
                                  <span className="text-[10px] sm:text-xs font-medium text-teal-700">
                                    Talebiniz alındı
                                  </span>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    disabled={demandBusyId === club.id}
                                    onClick={() => void createDemand(club)}
                                  >
                                    {demandBusyId === club.id ? "Gönderiliyor…" : "Talep oluştur"}
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-6 sm:p-8 text-center text-gray-500">
                        <p className="text-base sm:text-lg mb-1 sm:mb-2">Bu sınıfa açık kulüp yok</p>
                        <p className="text-xs sm:text-sm">{selectedStudent.grade} için tanımlı kulüp bulunmuyor</p>
                      </div>
                    )}
                  </div>

                  {selectedClubs.some((id) => {
                    const existing = clubs.find((item) => item.id === id)
                    return existing ? clubMatchesStudentGrade(existing.gradeLevels, selectedStudent.grade) : false
                  }) && (
                    <div className="p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-md">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <p className="text-xs sm:text-sm font-bold text-green-900">Seçili Kulüpler ({selectedClubs.filter((id) => {
                          const existing = clubs.find((item) => item.id === id)
                          return existing ? clubMatchesStudentGrade(existing.gradeLevels, selectedStudent.grade) : false
                        }).length}/3)</p>
                        <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-green-600 flex items-center justify-center">
                          <Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        {selectedClubs.filter((clubId) => {
                          const existing = clubs.find((item) => item.id === clubId)
                          return existing ? clubMatchesStudentGrade(existing.gradeLevels, selectedStudent.grade) : false
                        }).map((clubId) => {
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
                    disabled={!selectedStudent || submitting}
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
                        {selectedClubs.length === 0 
                          ? "Tüm Kulüplerden Çıkar" 
                          : `Onayla (${selectedClubs.length} kulüp)`}
                      </span>
                    )}
                  </Button>
            </CardContent>
          </Card>
        )}
          </div>
        </div>

      {showReselectConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
          onClick={() => !submitting && setShowReselectConfirm(false)}
        >
          <Card className="w-full max-w-md bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>Tekrar seçim yap</CardTitle>
              <CardDescription>
                Tekrar seçim yapmak mevcut seçimlerini iptal edecektir. Onaylıyor musun?
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={submitting}
                onClick={() => setShowReselectConfirm(false)}
              >
                Vazgeç
              </Button>
              <Button
                className="flex-1"
                disabled={submitting}
                onClick={() => void cancelSavedSelections()}
              >
                {submitting ? "İptal ediliyor..." : "Onayla"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

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
              <CardTitle className="text-xl sm:text-2xl text-center">
                {selectedClubs.length === 0 ? "Kulüplerden Çıkar" : "Seçimleri Onayla"}
              </CardTitle>
              <CardDescription className="text-center mt-1 sm:mt-2 text-sm sm:text-base">
                {selectedClubs.length === 0 
                  ? "Öğrenciyi tüm kulüplerden çıkarmak istediğinize emin misiniz?" 
                  : "Seçimlerinizi onaylıyor musunuz?"}
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

              {selectedClubs.length > 0 ? (
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
              ) : (
                <div className="p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs sm:text-sm font-semibold text-red-900 mb-1 sm:mb-2">⚠️ Uyarı:</p>
                  <p className="text-sm sm:text-base text-red-700">
                    Öğrenci tüm kulüplerden çıkarılacaktır.
                  </p>
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

