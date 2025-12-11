"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Eye, 
  Download, 
  Filter, 
  BarChart3, 
  PieChart, 
  AlertCircle,
  UserX 
} from "lucide-react"

type StatusFilter = "all" | "available" | "full" | "empty"

interface ClubStudent {
  id: string
  firstName: string
  lastName: string
  grade: string
}

interface ClubSelection {
  id: string
  studentId: string
  student: ClubStudent
}

interface Club {
  id: string
  name: string
  description: string | null
  capacity: number
  createdAt: string
  selections: ClubSelection[]
}

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    capacity: 0
  })
  const [selectedGrade, setSelectedGrade] = useState("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [showUnassignedModal, setShowUnassignedModal] = useState(false)
  const [modalGradeFilter, setModalGradeFilter] = useState("all")
  const [modalSearch, setModalSearch] = useState("")

  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/clubs")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setClubs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching clubs:", error)
      setClubs([])
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      setStudentsLoading(true)
      const response = await fetch("/api/students?limit=1000")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const studentsList = Array.isArray(data) ? data : (data.students || [])
      setStudents(studentsList)
    } catch (error) {
      console.error("Error fetching students:", error)
      setStudents([])
    } finally {
      setStudentsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClubs()
    fetchStudents()
  }, [fetchClubs, fetchStudents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingClub ? `/api/clubs/${editingClub.id}` : "/api/clubs"
      const method = editingClub ? "PUT" : "POST"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        fetchClubs()
        setShowForm(false)
        setEditingClub(null)
        setFormData({ name: "", description: "", capacity: 0 })
      } else {
        alert("Kulüp kaydedilirken hata oluştu!")
      }
    } catch (error) {
      console.error("Error saving club:", error)
    }
  }

  const handleEdit = (club: Club) => {
    setEditingClub(club)
    setFormData({
      name: club.name,
      description: club.description || "",
      capacity: club.capacity
    })
    setShowForm(true)
  }

  const handleDelete = async (clubId: string) => {
    if (confirm("Bu kulübü silmek istediğinizden emin misiniz?")) {
      try {
        const response = await fetch(`/api/clubs/${clubId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          fetchClubs()
        } else {
          alert("Kulüp silinirken hata oluştu!")
        }
      } catch (error) {
        console.error("Error deleting club:", error)
      }
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch("/api/clubs/export")
      
      if (!response.ok) {
        throw new Error("Export failed")
      }

      // Blob olarak indir
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      
      // Content-Disposition header'ından dosya adını al
      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = "kulup-listesi.xlsx"
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }
      
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error exporting clubs:", error)
      alert("Kulüp listesi indirilirken hata oluştu!")
    }
  }

  const totalCapacity = useMemo(() => clubs.reduce((sum, club) => sum + club.capacity, 0), [clubs])
  const totalSelections = useMemo(
    () => clubs.reduce((sum, club) => sum + club.selections.length, 0),
    [clubs]
  )
  const fullClubs = useMemo(() => clubs.filter((club) => club.selections.length >= club.capacity).length, [clubs])
  const emptyClubs = useMemo(() => clubs.filter((club) => club.selections.length === 0).length, [clubs])

  const gradeOptions = useMemo(() => {
    const grades = new Set<string>()
    students.forEach((student) => {
      if (student.grade) {
        grades.add(student.grade)
      }
    })
    return Array.from(grades).sort((a, b) => a.localeCompare(b, "tr"))
  }, [students])

  const assignedStudentIds = useMemo(() => {
    const ids = new Set<string>()
    clubs.forEach((club) => {
      club.selections.forEach((selection) => {
        if (selection.student?.id) {
          ids.add(selection.student.id)
        } else if (selection.studentId) {
          ids.add(selection.studentId)
        }
      })
    })
    return ids
  }, [clubs])

  const studentsWithoutClubs = useMemo(
    () => students.filter((student) => !assignedStudentIds.has(student.id)),
    [students, assignedStudentIds]
  )

  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const isFull = club.selections.length >= club.capacity
      const isEmpty = club.selections.length === 0
      const hasCapacity = !isFull && !isEmpty

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "full" && isFull) ||
        (statusFilter === "empty" && isEmpty) ||
        (statusFilter === "available" && hasCapacity)

      const matchesGrade =
        selectedGrade === "all" ||
        club.selections.some((selection) => selection.student?.grade === selectedGrade)

      return matchesStatus && matchesGrade
    })
  }, [clubs, selectedGrade, statusFilter])

  const modalFilteredStudents = useMemo(() => {
    return studentsWithoutClubs.filter((student) => {
      const matchesGrade = modalGradeFilter === "all" || student.grade === modalGradeFilter
      const search = modalSearch.trim().toLowerCase()
      const matchesSearch =
        !search ||
        student.firstName.toLowerCase().includes(search) ||
        student.lastName.toLowerCase().includes(search) ||
        `${student.firstName} ${student.lastName}`.toLowerCase().includes(search)
      return matchesGrade && matchesSearch
    })
  }, [studentsWithoutClubs, modalGradeFilter, modalSearch])

  const handleResetFilters = () => {
    setSelectedGrade("all")
    setStatusFilter("all")
  }

  const handleOpenUnassignedModal = () => {
    setModalGradeFilter("all")
    setModalSearch("")
    setShowUnassignedModal(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Kulüp Yönetimi</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-xs sm:text-sm">
            Kulüpleri oluşturun, filtreleyin ve stratejik olarak yönetin
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Kulüpleri İndir</span>
            <span className="sm:hidden">İndir</span>
          </Button>
          <Button onClick={() => setShowForm(true)} size="sm" className="flex-1 sm:flex-initial text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Yeni Kulüp</span>
            <span className="sm:hidden">Yeni</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="card-soft border-0">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Toplam Kulüp</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{clubs.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex-shrink-0 ml-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3">
              {fullClubs} dolu • {emptyClubs} boş
            </p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Kontenjan</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                  {totalSelections}/{totalCapacity}
                </p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0 ml-2">
                <PieChart className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3">
              Doluluk: {totalCapacity ? Math.round((totalSelections / totalCapacity) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Toplam Seçim</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{totalSelections}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0 ml-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </div>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3 line-clamp-2">Kulüplere kayıtlı öğrenci</p>
          </CardContent>
        </Card>

        <Card className="card-soft border-0">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Seçmeyen</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mt-0.5 sm:mt-1">{studentsWithoutClubs.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex-shrink-0 ml-2">
                <UserX className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              </div>
            </div>
            <button
              className="text-[10px] sm:text-xs font-semibold text-rose-600 mt-2 sm:mt-3 hover:underline"
              onClick={handleOpenUnassignedModal}
            >
              Listeyi görüntüle
            </button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">İleri Seviye Filtreleme</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Sınıf, doluluk durumu ve özel listelerle görünümü özelleştirin
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="flex-shrink-0 text-xs sm:text-sm">
            Filtreleri Sıfırla
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Sınıf</Label>
              <div className="mt-2">
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="all">Tüm sınıflar</option>
                  {gradeOptions.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-gray-500">Kulüp Durumu</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { key: "all", label: "Tümü" },
                  { key: "available", label: "Kontenjan Var" },
                  { key: "full", label: "Dolu Kulüpler" },
                  { key: "empty", label: "Boş Kulüpler" }
                ].map((filterOption) => (
                  <Button
                    key={filterOption.key}
                    type="button"
                    variant={statusFilter === filterOption.key ? "default" : "outline"}
                    size="sm"
                    className="flex-1 min-w-[120px]"
                    onClick={() => setStatusFilter(filterOption.key as StatusFilter)}
                  >
                    {filterOption.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <Label className="text-xs uppercase tracking-wide text-gray-500 mb-2">Aksiyonlar</Label>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" className="flex-1" onClick={handleOpenUnassignedModal}>
                  <AlertCircle className="h-4 w-4" />
                  Seçim Yapmayan Öğrenciler
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(true)}
                >
                  <Plus className="h-4 w-4" />
                  Kulüp Oluştur
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6">
            <CardTitle className="text-base sm:text-lg lg:text-xl">{editingClub ? "Kulüp Düzenle" : "Yeni Kulüp"}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs sm:text-sm">Kulüp Adı</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-xs sm:text-sm">Açıklama</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div>
                <Label htmlFor="capacity" className="text-xs sm:text-sm">Kontejan</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  required
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button type="submit" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                  {editingClub ? "Güncelle" : "Oluştur"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => {
                  setShowForm(false)
                  setEditingClub(null)
                  setFormData({ name: "", description: "", capacity: 0 })
                }} className="w-full sm:w-auto text-xs sm:text-sm">
                  İptal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredClubs.length > 0 ? (
          filteredClubs.map((club) => {
            const capacityPercentage = (club.selections.length / club.capacity) * 100
            const isFull = capacityPercentage >= 100
            const isEmpty = club.selections.length === 0
            const statusColor = isFull
              ? "bg-red-100 text-red-600"
              : isEmpty
                ? "bg-gray-100 text-gray-600"
                : "bg-emerald-100 text-emerald-600"

            const getCapacityColor = () => {
              if (isFull) return "bg-red-500"
              if (capacityPercentage >= 80) return "bg-orange-500"
              if (capacityPercentage >= 60) return "bg-yellow-500"
              return "bg-green-500"
            }

            const gradeSpecificStudents =
              selectedGrade === "all"
                ? club.selections
                : club.selections.filter((selection) => selection.student?.grade === selectedGrade)

            return (
              <Card
                key={club.id}
                className="card-soft hover:shadow-xl transition-all duration-200 border-0 cursor-pointer"
                onClick={() => (window.location.href = `/clubs/${club.id}`)}
              >
                <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 lg:pt-6">
                  <div className="flex justify-between items-start gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
                        <Users className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 icon-blue flex-shrink-0" />
                        <span className="truncate">{club.name}</span>
                      </CardTitle>
                      <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <CardDescription className="text-xs sm:text-sm">
                          {club.selections.length}/{club.capacity} öğrenci
                        </CardDescription>
                        <span className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full ${statusColor}`}>
                          {isFull ? "Dolu" : isEmpty ? "Boş" : "Kontenjan Var"}
                        </span>
                        {selectedGrade !== "all" && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
                            {selectedGrade}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => (window.location.href = `/clubs/${club.id}`)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(club)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(club.id)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 px-3 sm:px-4 lg:px-6 pb-3 sm:pb-4 lg:pb-6">
                  {club.description && (
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{club.description}</p>
                  )}

                  <div className="mb-3 sm:mb-4">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-700">Kontejan</span>
                      <span className="text-xs sm:text-sm text-gray-500">{Math.round(capacityPercentage)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                      <div
                        className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${getCapacityColor()}`}
                        style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1.5 sm:mb-2 text-xs sm:text-sm text-gray-700">
                      {selectedGrade === "all" ? "Seçen Öğrenciler" : `${selectedGrade} öğrencileri`}
                    </h4>
                    {gradeSpecificStudents.length > 0 ? (
                      <div className="max-h-20 sm:max-h-24 overflow-y-auto space-y-0.5 sm:space-y-1">
                        {gradeSpecificStudents.slice(0, 4).map((selection) => (
                          <div key={selection.id} className="text-xs sm:text-sm text-gray-600 py-0.5">
                            {selection.student.firstName} {selection.student.lastName}
                            <span className="text-[10px] sm:text-xs text-gray-400"> · {selection.student.grade}</span>
                          </div>
                        ))}
                        {gradeSpecificStudents.length > 4 && (
                          <div className="text-[10px] sm:text-xs text-gray-500">
                            +{gradeSpecificStudents.length - 4} daha fazla
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-500">
                        {selectedGrade === "all"
                          ? "Henüz öğrenci seçimi yapılmamış"
                          : "Bu sınıftan öğrenci bulunmuyor"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card className="col-span-full border-2 border-dashed border-gray-200 py-8 sm:py-12 lg:py-16 text-center">
            <CardContent className="px-4">
              <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700">Seçili filtrelere uygun kulüp bulunamadı</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Farklı bir sınıf ya da durum seçerek sonuçları genişletebilirsiniz.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {showUnassignedModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">Kulüp Seçimi Yapmayanlar</p>
                <h2 className="text-2xl font-bold text-gray-900 mt-1">
                  {studentsWithoutClubs.length} öğrenci
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Sınıf bazlı filtreleme ve arama ile hızla aksiyon alın.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                  Global Filtreleri Sıfırla
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowUnassignedModal(false)}>
                  Kapat
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Sınıf Filtrele</Label>
                  <select
                    value={modalGradeFilter}
                    onChange={(e) => setModalGradeFilter(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="all">Tüm sınıflar</option>
                    {gradeOptions.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-gray-500">Öğrenci Ara</Label>
                  <div className="mt-2 relative">
                    <Input
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      placeholder="Ad, soyad veya sınıf bilgisi girin"
                      className="pl-10"
                    />
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-gray-100">
                {studentsLoading ? (
                  <div className="p-8 text-center text-gray-500">Öğrenciler yükleniyor...</div>
                ) : modalFilteredStudents.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {modalFilteredStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-all"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{student.grade}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowUnassignedModal(false)
                            setSelectedGrade(student.grade)
                          }}
                        >
                          Kulüpleri Göster
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <p className="text-gray-700 font-medium mb-1">Eşleşme bulunamadı</p>
                    <p className="text-sm text-gray-500">
                      Başka bir sınıf veya arama kriteri deneyebilirsiniz.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  )
}
