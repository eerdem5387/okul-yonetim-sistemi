"use client"

import { useState, useCallback, useMemo } from "react"
import { Search, Users, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StudentRow, type ParticipantData } from "./StudentRow"
import type { SubtypeConfig } from "@/lib/activity-types-config"

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  grade: string
  tcNumber: string
}

interface StepKatilimcilarProps {
  participants: ParticipantData[]
  studentOptions: StudentOption[]
  subtypeConfig: SubtypeConfig
  onChange: (participants: ParticipantData[]) => void
  onBack: () => void
  onNext: () => void
  /** Onay / imza sürecindeki faaliyetlerde katılımcı değişmez; sadece liste gösterilir */
  readOnly?: boolean
}

export function StepKatilimcilar({
  participants,
  studentOptions,
  subtypeConfig,
  onChange,
  onBack,
  onNext,
  readOnly = false,
}: StepKatilimcilarProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStudents = studentOptions.filter((s) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase()
    return fullName.includes(q) || s.grade.toLowerCase().includes(q) || s.tcNumber.includes(q)
  })

  const selectedIds = useMemo(
    () => new Set(participants.map((p) => p.studentId)),
    [participants]
  )

  const addStudent = useCallback(
    (student: StudentOption) => {
      if (selectedIds.has(student.id)) return
      onChange([
        ...participants,
        {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          studentGrade: student.grade,
          participationPhotoUrl: "",
          score: "",
          languageLevel: "",
          extraDocumentUrl: "",
          artworkDescription: "",
          tournamentPlacement: "",
          projectRole: "",
        },
      ])
    },
    [participants, onChange, selectedIds]
  )

  const removeStudent = useCallback(
    (studentId: string) => {
      onChange(participants.filter((p) => p.studentId !== studentId))
    },
    [participants, onChange]
  )

  const updateParticipant = useCallback(
    (index: number, updated: ParticipantData) => {
      const next = [...participants]
      next[index] = updated
      onChange(next)
    },
    [participants, onChange]
  )

  const isValid = () => {
    if (participants.length === 0) return false
    if (readOnly) return true
    return participants.every((p) => {
      if (subtypeConfig.requiresParticipationPhoto !== false && !p.participationPhotoUrl?.trim()) {
        return false
      }
      if (subtypeConfig.requiresScore && (!p.score || isNaN(Number(p.score)))) return false
      if (subtypeConfig.requiresLanguageLevel && !p.languageLevel) return false
      if (subtypeConfig.requiresArtworkDescription && !p.artworkDescription?.trim()) return false
      if (subtypeConfig.requiresExtraDocument && !p.extraDocumentUrl?.trim()) return false
      if (subtypeConfig.showParticipantProjectRole && !p.projectRole?.trim()) return false
      return true
    })
  }

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bu faaliyette katılımcılar onay veya imza sürecinde. Katılımcı listesi ve öğrenci alanları
          düzenlenemez; yalnızca 1. adımdaki faaliyet bilgilerini güncelleyebilirsiniz.
        </div>
      )}
      {/* Öğrenci Arama & Ekleme */}
      {!readOnly && (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-900">Katılımcı Öğrenci Seç</h3>
          <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {participants.length} seçili
          </span>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Ad, soyad, sınıf veya TC ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white">
          {filteredStudents.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400 text-center">Öğrenci bulunamadı</p>
          ) : (
            filteredStudents.slice(0, 50).map((student) => {
              const isSelected = selectedIds.has(student.id)
              return (
                <button
                  key={student.id}
                  onClick={() => !isSelected && addStudent(student)}
                  disabled={isSelected}
                  className={`
                    w-full flex items-center justify-between px-4 py-2.5 text-left text-sm border-b border-gray-50 last:border-0 transition-colors
                    ${isSelected
                      ? "bg-indigo-50 text-indigo-500 cursor-default"
                      : "hover:bg-gray-50 text-gray-700 cursor-pointer"
                    }
                  `}
                >
                  <span>
                    <span className="font-medium">{student.firstName} {student.lastName}</span>
                    <span className="text-gray-400 text-xs ml-2">{student.grade}</span>
                  </span>
                  {isSelected ? (
                    <span className="text-xs text-indigo-500 font-medium">✓ Eklendi</span>
                  ) : (
                    <span className="text-xs text-gray-400">+ Ekle</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>
      )}

      {/* Seçili Öğrenciler */}
      {participants.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <span>Seçili Katılımcılar</span>
            {!readOnly && (
              <span className="text-gray-400 text-xs font-normal">— her öğrenci için bilgileri doldurun</span>
            )}
          </h3>
          {readOnly
            ? participants.map((p) => (
                <div
                  key={p.studentId}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800"
                >
                  <span className="font-medium">{p.studentName}</span>
                  <span className="text-gray-500 ml-2">{p.studentGrade}</span>
                </div>
              ))
            : participants.map((p, i) => (
                <StudentRow
                  key={p.studentId}
                  participant={p}
                  index={i}
                  requiresScore={subtypeConfig.requiresScore}
                  requiresLanguageLevel={subtypeConfig.requiresLanguageLevel}
                  requiresExtraDocument={subtypeConfig.requiresExtraDocument}
                  optionalExtraDocument={subtypeConfig.optionalExtraDocument}
                  requiresArtworkDescription={subtypeConfig.requiresArtworkDescription}
                  showTournamentPlacement={subtypeConfig.showTournamentPlacement}
                  showParticipantProjectRole={subtypeConfig.showParticipantProjectRole}
                  requiresParticipationPhoto={subtypeConfig.requiresParticipationPhoto !== false}
                  participationPhotoFieldLabel={subtypeConfig.participationPhotoFieldLabel}
                  extraDocumentFieldLabel={subtypeConfig.extraDocumentFieldLabel}
                  onChange={(updated) => updateParticipant(i, updated)}
                  onRemove={() => removeStudent(p.studentId)}
                />
              ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <Users className="h-10 w-10 mb-2 text-gray-200" />
          <p className="text-sm">Henüz katılımcı eklenmedi</p>
          <p className="text-xs mt-1">Yukarıdan öğrenci arayıp ekleyin</p>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <Button variant="outline" onClick={onBack}>
          ← Geri
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
        >
          Devam: PDF Önizleme →
        </Button>
      </div>
    </div>
  )
}
