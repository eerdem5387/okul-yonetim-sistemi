"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CommonFields } from "./CommonFields"
import type { IbActivityCommon, IbEducationSpecific } from "@/types/ib-activity"

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

interface EducationFormProps {
  common: IbActivityCommon
  specific: IbEducationSpecific
  onCommonChange: (c: IbActivityCommon) => void
  onSpecificChange: (s: IbEducationSpecific) => void
  participantOptions: { id: string; label: string }[]
}

export function EducationForm({
  common,
  specific,
  onCommonChange,
  onSpecificChange,
  participantOptions,
}: EducationFormProps) {
  return (
    <div className="space-y-6">
      <CommonFields
        data={common}
        onChange={onCommonChange}
        participantOptions={participantOptions}
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
            <Label className="text-amber-700">PDF İçeriği – Müfredat</Label>
            <p className="text-xs text-gray-500 mb-1">
              Şablon değişkenleri bu alanlardan beslenecek (içerik sonra eklenecek).
            </p>
            <textarea
              placeholder="Müfredat PDF içeriği..."
              rows={2}
              className="w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
          <div>
            <Label className="text-amber-700">PDF İçeriği – Sertifika Belgesi</Label>
            <textarea
              placeholder="Sertifika PDF şablon verisi (katılımcı bazlı)..."
              rows={2}
              className="w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
          <div>
            <Label className="text-amber-700">PDF İçeriği – Başarı Belgesi</Label>
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
