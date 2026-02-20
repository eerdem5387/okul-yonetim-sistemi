"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CommonFields } from "./CommonFields"
import type { IbActivityCommon, IbCompetitionSpecific } from "@/types/ib-activity"

interface CompetitionFormProps {
  common: IbActivityCommon
  specific: IbCompetitionSpecific
  onCommonChange: (c: IbActivityCommon) => void
  onSpecificChange: (s: IbCompetitionSpecific) => void
  participantOptions: { id: string; label: string }[]
}

export function CompetitionForm({
  common,
  specific,
  onCommonChange,
  onSpecificChange,
  participantOptions,
}: CompetitionFormProps) {
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
            Yarışma – Özel Alanlar
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Yarışma / Proje Tanımı</Label>
            <textarea
              value={specific.competitionDefinition}
              onChange={(e) =>
                onSpecificChange({
                  ...specific,
                  competitionDefinition: e.target.value,
                })
              }
              placeholder="Yarışma veya proje tanımı..."
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
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
            <Label className="text-amber-700">PDF İçeriği – Sertifika</Label>
            <textarea
              placeholder="Sertifika PDF içeriği..."
              rows={2}
              className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-sm"
              readOnly
            />
          </div>
          <div>
            <Label className="text-amber-700">PDF İçeriği – Başarı Belgesi</Label>
            <textarea
              placeholder="Başarı belgesi PDF içeriği..."
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
