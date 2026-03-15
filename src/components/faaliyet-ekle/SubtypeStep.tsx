"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import {
  getSubtypeConfig,
  getMufredatText,
  getMufredatIcerikIdForSubtype,
  CATEGORY_LABELS,
  type CategoryId,
} from "@/lib/ib-activity-config"
import { getMufredatIcerik } from "@/lib/ib-mufredat-icerikleri"

interface SubtypeStepProps {
  category: CategoryId
  subtype: string
  onSubtypeChange: (value: string) => void
  onBack: () => void
  onNext: () => void
}

export function SubtypeStep({
  category,
  subtype,
  onSubtypeChange,
  onBack,
  onNext,
}: SubtypeStepProps) {
  const { mode, options } = getSubtypeConfig(category)
  const isEgitim = category === "egitim"
  const isSporWithMufredat = category === "spor" && subtype
  const fullMufredatKey = subtype ? getMufredatIcerikIdForSubtype(category, subtype) : null
  const fullMufredatText = fullMufredatKey ? getMufredatIcerik(fullMufredatKey) : ""
  const shortMufredatText = isEgitim && subtype ? getMufredatText(subtype) : ""
  const mufredatTextSpor = isSporWithMufredat ? getMufredatIcerik(subtype) : ""
  const showMufredat = (isEgitim && subtype) || isSporWithMufredat
  const mufredatText = fullMufredatText || (isEgitim ? shortMufredatText : mufredatTextSpor)

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="self-start -ml-2 min-h-[44px] touch-manipulation">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Geri
        </Button>
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Alt tür · {CATEGORY_LABELS[category]}
        </h2>
      </div>

      {mode === "preset" && options.length > 0 ? (
        <div className="space-y-2 w-full">
          <Label>Alt tür</Label>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 w-full">
            {options.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                variant={subtype === opt.id ? "default" : "outline"}
                className="justify-start min-h-[44px] touch-manipulation text-left w-full"
                onClick={() => onSubtypeChange(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="subtype-manual">Alt tür (serbest metin)</Label>
          <Input
            id="subtype-manual"
            value={subtype}
            onChange={(e) => onSubtypeChange(e.target.value)}
            placeholder="Örn: Basketbol, Bilim Fuarı..."
            className="min-h-[44px] touch-manipulation"
          />
        </div>
      )}

      {showMufredat && (
        <Card className="border-gray-200 bg-gray-50/50 overflow-hidden w-full">
          <CardContent className="p-4 sm:p-5">
            <Label className="text-gray-500 font-medium">Müfredat (salt okunur)</Label>
            <div className="mt-3 w-full min-h-[140px] max-h-[320px] sm:max-h-[380px] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 sm:p-5 text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap overscroll-contain">
              {mufredatText || "Alt tür seçin."}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2 w-full">
        <Button type="button" variant="outline" onClick={onBack} className="w-full sm:min-w-[120px] min-h-[48px] touch-manipulation">
          Geri
        </Button>
        <Button
          onClick={onNext}
          className="w-full sm:flex-1 min-h-[48px] touch-manipulation"
          disabled={mode === "manual" && !subtype.trim()}
          title={mode === "manual" && !subtype.trim() ? "Alt tür (serbest metin) zorunludur" : undefined}
        >
          Devam: Katılımcılar
        </Button>
      </div>
    </div>
  )
}
