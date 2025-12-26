"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Search, User, X } from "lucide-react"

interface Student {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

interface StudentSearchProps {
  students: Student[]
  selectedStudentId: string
  onSelect: (studentId: string) => void
  placeholder?: string
}

export function StudentSearch({
  students,
  selectedStudentId,
  onSelect,
  placeholder = "Öğrenci ara (ad, soyad, TC, sınıf)..."
}: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(s => s.id === selectedStudentId)
      setSelectedStudent(student || null)
      if (student) {
        setSearchTerm(`${student.firstName} ${student.lastName}`)
      }
    } else {
      setSelectedStudent(null)
      setSearchTerm("")
    }
  }, [selectedStudentId, students])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredStudents = students.filter(student => {
    const searchLower = searchTerm.toLowerCase()
    return (
      student.firstName.toLowerCase().includes(searchLower) ||
      student.lastName.toLowerCase().includes(searchLower) ||
      student.tcNumber.includes(searchLower) ||
      student.grade.toLowerCase().includes(searchLower) ||
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchLower)
    )
  })

  const handleSelect = (student: Student) => {
    setSelectedStudent(student)
    setSearchTerm(`${student.firstName} ${student.lastName}`)
    setIsOpen(false)
    onSelect(student.id)
  }

  const handleClear = () => {
    setSelectedStudent(null)
    setSearchTerm("")
    setIsOpen(false)
    onSelect("")
  }

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {selectedStudent && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && searchTerm && filteredStudents.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {filteredStudents.slice(0, 10).map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => handleSelect(student)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                selectedStudentId === student.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
              }`}
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-gray-900">
                  {student.firstName} {student.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {student.grade} • TC: {student.tcNumber}
                </p>
              </div>
            </button>
          ))}
          {filteredStudents.length > 10 && (
            <div className="px-4 py-2 text-xs text-gray-500 text-center border-t">
              {filteredStudents.length - 10} öğrenci daha...
            </div>
          )}
        </div>
      )}

      {isOpen && searchTerm && filteredStudents.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center">
          <p className="text-sm text-gray-500">Öğrenci bulunamadı</p>
        </div>
      )}
    </div>
  )
}

