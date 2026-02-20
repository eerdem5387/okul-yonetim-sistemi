"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { IbActivityFormData } from "@/types/ib-activity"
import { IB_ACTIVITY_TYPE_LABELS } from "@/types/ib-activity"
import { format } from "date-fns"

interface PreviewPanelProps {
  data: IbActivityFormData | null
  participantNames?: string[]
}

export function PreviewPanel({ data, participantNames = [] }: PreviewPanelProps) {
  if (!data) {
    return (
      <Card className="h-full border border-gray-200 bg-gray-50/50">
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-500">Önizleme</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Formu doldurdukça özet burada güncellenecektir.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { common, type } = data
  const typeLabel = IB_ACTIVITY_TYPE_LABELS[type]

  return (
    <Card className="h-full border border-gray-200 sticky top-4">
      <CardHeader className="pb-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Önizleme
        </h3>
        <span className="text-xs text-gray-400">{typeLabel}</span>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {common.title && (
          <div>
            <p className="text-xs text-gray-500">Başlık</p>
            <p className="font-medium text-gray-900">{common.title}</p>
          </div>
        )}
        {common.participantIds.length > 0 && (
          <div>
            <p className="text-xs text-gray-500">Katılımcılar (temsili önizleme)</p>
            <p className="text-gray-700">
              {participantNames.length > 0
                ? participantNames[0]
                : "Seçili öğrenci"}
              {common.participantIds.length > 1 && (
                <span className="text-gray-500">
                  {" "}
                  + {common.participantIds.length - 1} kişi
                </span>
              )}
            </p>
          </div>
        )}
        {(common.startDate || common.endDate) && (
          <div>
            <p className="text-xs text-gray-500">Tarih</p>
            <p className="text-gray-700">
              {common.startDate &&
                format(new Date(common.startDate), "d MMM yyyy")}
              {common.startDate && common.endDate && " – "}
              {common.endDate &&
                format(new Date(common.endDate), "d MMM yyyy")}
            </p>
          </div>
        )}
        {common.organizer && (
          <div>
            <p className="text-xs text-gray-500">Organizatör / Eğitmen</p>
            <p className="text-gray-700">{common.organizer}</p>
          </div>
        )}
        {common.description && (
          <div>
            <p className="text-xs text-gray-500">Açıklama / Sonuç</p>
            <p className="text-gray-700 line-clamp-4">{common.description}</p>
          </div>
        )}
        {"educationType" in data.specific && data.specific.educationType && (
          <div>
            <p className="text-xs text-gray-500">Eğitim türü</p>
            <p className="text-gray-700">{data.specific.educationType}</p>
          </div>
        )}
        {"eventType" in data.specific && data.specific.eventType && (
          <div>
            <p className="text-xs text-gray-500">Etkinlik türü</p>
            <p className="text-gray-700">{data.specific.eventType}</p>
          </div>
        )}
        {"sportType" in data.specific && data.specific.sportType && (
          <div>
            <p className="text-xs text-gray-500">Spor türü</p>
            <p className="text-gray-700">{data.specific.sportType}</p>
          </div>
        )}
        {"competitionDefinition" in data.specific &&
          data.specific.competitionDefinition && (
            <div>
              <p className="text-xs text-gray-500">Yarışma / Proje tanımı</p>
              <p className="text-gray-700 line-clamp-3">
                {data.specific.competitionDefinition}
              </p>
            </div>
          )}
      </CardContent>
    </Card>
  )
}
