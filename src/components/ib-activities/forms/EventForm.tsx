"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CommonFields } from "./CommonFields"
import type { IbActivityCommon, IbEventSpecific } from "@/types/ib-activity"

interface EventFormProps {
  common: IbActivityCommon
  specific: IbEventSpecific
  onCommonChange: (c: IbActivityCommon) => void
  onSpecificChange: (s: IbEventSpecific) => void
  participantOptions: { id: string; label: string }[]
}

export function EventForm({
  common,
  specific,
  onCommonChange,
  onSpecificChange,
  participantOptions,
}: EventFormProps) {
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
            Etkinlik – Özel Alanlar
          </h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Etkinlik Türü</Label>
            <Input
              value={specific.eventType}
              onChange={(e) =>
                onSpecificChange({ ...specific, eventType: e.target.value })
              }
              placeholder="Örn. Kültür, Bilim"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Etkinlik Süresi</Label>
            <Input
              value={specific.duration}
              onChange={(e) =>
                onSpecificChange({ ...specific, duration: e.target.value })
              }
              placeholder="Örn. 2 saat"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Etkinlik Tanımı</Label>
            <textarea
              value={specific.eventDefinition}
              onChange={(e) =>
                onSpecificChange({
                  ...specific,
                  eventDefinition: e.target.value,
                })
              }
              placeholder="Kısa tanım..."
              rows={2}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm"
            />
          </div>
          <div>
            <Label className="text-amber-700">PDF İçeriği – Katılım Belgesi</Label>
            <p className="text-xs text-gray-500 mb-1">
              Şablon değişkenleri bu alanlardan beslenecek.
            </p>
            <textarea
              placeholder="Katılım belgesi PDF içeriği..."
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
