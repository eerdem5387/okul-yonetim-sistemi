"use client"

import { CLUB_GRADE_LEVELS } from "@/lib/club-grade-levels"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

const ORTAOKUL = [5, 6, 7, 8]
const LISE = [9, 10, 11, 12]

export function ClubGradeLevelField({
  value,
  onChange,
}: {
  value: number[]
  onChange: (next: number[]) => void
}) {
  const toggle = (level: number) => {
    if (value.includes(level)) onChange(value.filter((n) => n !== level).sort((a, b) => a - b))
    else onChange([...value, level].sort((a, b) => a - b))
  }

  const setGroup = (levels: number[]) => {
    const allOn = levels.every((n) => value.includes(n))
    if (allOn) onChange(value.filter((n) => !levels.includes(n)))
    else onChange([...new Set([...value, ...levels])].sort((a, b) => a - b))
  }

  return (
    <div>
      <Label className="text-xs sm:text-sm">Aktif sınıf düzeyleri</Label>
      <p className="mt-1 text-[11px] sm:text-xs text-gray-500">
        Öğrenci yalnızca kendi sınıfına açık kulüpleri görür.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => onChange([...CLUB_GRADE_LEVELS])}>
          Tümü
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGroup(ORTAOKUL)}>
          Ortaokul
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setGroup(LISE)}>
          Lise
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {CLUB_GRADE_LEVELS.map((level) => {
          const on = value.includes(level)
          return (
            <button
              key={level}
              type="button"
              onClick={() => toggle(level)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                on ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              {level}. sınıf
            </button>
          )
        })}
      </div>
    </div>
  )
}
