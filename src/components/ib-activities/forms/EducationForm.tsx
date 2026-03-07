"use client"

import { useState, useEffect, useCallback } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CommonFields } from "./CommonFields"
import type { IbActivityCommon, IbEducationSpecific } from "@/types/ib-activity"
import {
  EDUCATION_CURRICULUM_TEXTS,
  DEFAULT_CURRICULUM_TEXT,
} from "@/lib/ib-education-config"

const EDUCATION_TYPE_OPTIONS = [
  "Spanish",
  "English A1",
  "English A2",
  "English B1",
  "English B2",
  "English Mathematics",
  "English Science",
  "Electronics - Robotics",
  "Artificial intelligence",
  "Painting Culture",
  "Music Culture",
] as const

interface StaffOption {
  id: string
  label: string
}

interface EducationFormProps {
  common: IbActivityCommon
  specific: IbEducationSpecific
  onCommonChange: (c: IbActivityCommon) => void
  onSpecificChange: (s: IbEducationSpecific) => void
  participantOptions: { id: string; label: string }[]
}

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const headers: HeadersInit = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`
  return headers
}

export function EducationForm({
  common,
  specific,
  onCommonChange,
  onSpecificChange,
  participantOptions,
}: EducationFormProps) {
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([])

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff?limit=200", { headers: getAuthHeaders() })
      if (!res.ok) return
      const data = await res.json()
      const list = data.staff ?? []
      setStaffOptions(
        list.map((s: { id: string; firstName: string; lastName: string }) => ({
          id: s.id,
          label: `${s.firstName} ${s.lastName}`.trim(),
        }))
      )
    } catch {
      setStaffOptions([])
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const curriculumText =
    specific.educationType && EDUCATION_CURRICULUM_TEXTS[specific.educationType]
      ? EDUCATION_CURRICULUM_TEXTS[specific.educationType]
      : DEFAULT_CURRICULUM_TEXT

  const handleOrganizerSelect = (id: string, name: string) => {
    onSpecificChange({ ...specific, teacherId: id, teacherName: name })
  }

  const commonWithOrganizer =
    specific.teacherName !== ""
      ? { ...common, organizer: specific.teacherName }
      : common

  return (
    <div className="space-y-6">
      <CommonFields
        data={commonWithOrganizer}
        onChange={onCommonChange}
        participantOptions={participantOptions}
        organizerOptions={staffOptions.length > 0 ? staffOptions : undefined}
        onOrganizerSelect={handleOrganizerSelect}
      />
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-700">
            Eğitim – Özel Alanlar
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Eğitim Türü</Label>
            <select
              value={specific.educationType}
              onChange={(e) =>
                onSpecificChange({ ...specific, educationType: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seçiniz</option>
              {EDUCATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-gray-700">Müfredat (bilgilendirme)</Label>
            <p className="text-xs text-gray-500 mb-1">
              Seçilen eğitim türüne göre sabit müfredat metni; düzenlenemez.
            </p>
            <textarea
              readOnly
              value={curriculumText}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
          </div>

          <div>
            <Label>Eğitim Açıklaması</Label>
            <p className="text-xs text-gray-500 mb-1">
              Sertifika ve başarı belgesi metninde kullanılacak açıklama (manuel).
            </p>
            <textarea
              value={specific.educationDescription}
              onChange={(e) =>
                onSpecificChange({
                  ...specific,
                  educationDescription: e.target.value,
                })
              }
              placeholder="Eğitim içeriği ve kazanımlar hakkında kısa açıklama..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Süre (gün)</Label>
              <Input
                type="number"
                min={0}
                value={specific.durationDays}
                onChange={(e) =>
                  onSpecificChange({ ...specific, durationDays: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Saat</Label>
              <Input
                type="number"
                min={0}
                value={specific.durationHours}
                onChange={(e) =>
                  onSpecificChange({ ...specific, durationHours: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label>Dakika</Label>
              <Input
                type="number"
                min={0}
                value={specific.durationMinutes}
                onChange={(e) =>
                  onSpecificChange({
                    ...specific,
                    durationMinutes: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Başarı Puanı (1–100)</Label>
            <p className="text-xs text-gray-500 mb-1">
              Başarı belgesinde kullanılır; seviye otomatik hesaplanır.
            </p>
            <Input
              type="number"
              min={1}
              max={100}
              value={specific.successScore === "" ? "" : specific.successScore}
              onChange={(e) => {
                const v = e.target.value
                const num = v === "" ? "" : Math.min(100, Math.max(0, parseInt(v, 10) || 0))
                onSpecificChange({ ...specific, successScore: num })
              }}
              placeholder="1–100"
              className="mt-1 w-32"
            />
          </div>

          <div>
            <Label className="text-amber-700">PDF İçeriği – Sertifika Belgesi</Label>
            <p className="text-xs text-gray-500 mb-1">
              Katılımcı bazlı üretilir. Öğrenci ad/soyad/TC, tarih, eğitmen ve müdür
              imza alanları PDF çıktısında otomatik eklenir.
            </p>
            <textarea
              placeholder="Şablon metni (katılımcı bazlı)..."
              rows={2}
              className="w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
          <div>
            <Label className="text-amber-700">PDF İçeriği – Başarı Belgesi</Label>
            <p className="text-xs text-gray-500 mb-1">
              [Score] ve [Achievement Level] değişkenleri başarı puanına göre doldurulur.
            </p>
            <textarea
              placeholder="Başarı belgesi PDF içeriği..."
              rows={2}
              className="w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
