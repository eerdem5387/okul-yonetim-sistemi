"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CATEGORY_LABELS } from "@/lib/ib-activity-config"
import type { FaaliyetFormState } from "@/types/ib-activity-form"
import { format } from "date-fns"

interface PreviewPanelProps {
  state: FaaliyetFormState | null
}

export function PreviewPanel({ state }: PreviewPanelProps) {
  if (!state) {
    return (
      <Card className="h-full border border-gray-200 bg-gray-50/50">
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-500">Önizleme</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Adım adım formu doldurdukça özet burada güncellenecektir.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { category, subtype, common, participants, step } = state
  const categoryLabel = category ? CATEGORY_LABELS[category] : "—"

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-2">
        <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-500">
          Önizleme
        </h3>
        <span className="text-xs text-gray-400">
          Adım {step} · {categoryLabel}
        </span>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 text-sm">
        {category && (
          <div>
            <p className="text-xs text-gray-500">Faaliyet türü</p>
            <p className="font-medium text-gray-900">{categoryLabel}</p>
          </div>
        )}
        {subtype && (
          <div>
            <p className="text-xs text-gray-500">Alt tür</p>
            <p className="text-gray-700">{subtype}</p>
          </div>
        )}
        {common.title && (
          <div>
            <p className="text-xs text-gray-500">Başlık</p>
            <p className="font-medium text-gray-900">{common.title}</p>
          </div>
        )}
        {participants.length > 0 && (
          <div>
            <p className="text-xs text-gray-500">Katılımcılar</p>
            <p className="text-gray-700">
              {participants[0]?.studentName || "—"}
              {participants.length > 1 && (
                <span className="text-gray-500"> +{participants.length - 1} kişi</span>
              )}
            </p>
          </div>
        )}
        {(common.startDate || common.endDate) && (
          <div>
            <p className="text-xs text-gray-500">Tarih</p>
            <p className="text-gray-700">
              {common.startDate && format(new Date(common.startDate), "d MMM yyyy")}
              {common.startDate && common.endDate && " – "}
              {common.endDate && format(new Date(common.endDate), "d MMM yyyy")}
            </p>
          </div>
        )}
        {common.organizer && (
          <div>
            <p className="text-xs text-gray-500">Organizatör</p>
            <p className="text-gray-700">{common.organizer}</p>
          </div>
        )}
        {common.description && (
          <div>
            <p className="text-xs text-gray-500">Açıklama</p>
            <p className="text-gray-700 line-clamp-4">{common.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
