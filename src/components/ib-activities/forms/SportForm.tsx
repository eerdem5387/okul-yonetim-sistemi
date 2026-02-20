"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CommonFields } from "./CommonFields"
import type { IbActivityCommon, IbSportSpecific } from "@/types/ib-activity"

interface SportFormProps {
  common: IbActivityCommon
  specific: IbSportSpecific
  onCommonChange: (c: IbActivityCommon) => void
  onSpecificChange: (s: IbSportSpecific) => void
  participantOptions: { id: string; label: string }[]
}

export function SportForm({
  common,
  specific,
  onCommonChange,
  onSpecificChange,
  participantOptions,
}: SportFormProps) {
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
            Spor – Özel Alanlar
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Spor Türü</Label>
            <Input
              value={specific.sportType}
              onChange={(e) =>
                onSpecificChange({ ...specific, sportType: e.target.value })
              }
              placeholder="Örn. Basketbol, Yüzme"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Öğrenci Lisans (Dosya)</Label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  // Gerçek uygulamada upload API çağrılır, URL döner
                  onSpecificChange({
                    ...specific,
                    studentLicenseUrl: file.name,
                  })
                }
              }}
              className="mt-1"
            />
            {specific.studentLicenseUrl && (
              <p className="text-xs text-gray-500 mt-1">
                Seçilen: {specific.studentLicenseUrl}
              </p>
            )}
          </div>
          <div>
            <Label className="text-amber-700">PDF İçeriği – Katılım Belgesi</Label>
            <textarea
              placeholder="Katılım belgesi PDF içeriği..."
              rows={2}
              className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
          <div>
            <Label className="text-amber-700">
              PDF İçeriği – Sonuç Belgesi (eğer varsa)
            </Label>
            <textarea
              placeholder="Sonuç belgesi PDF içeriği..."
              rows={2}
              className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
