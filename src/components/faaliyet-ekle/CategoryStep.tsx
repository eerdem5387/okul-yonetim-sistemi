"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  GraduationCap,
  Calendar,
  Trophy,
  Award,
} from "lucide-react"
import {
  CATEGORY_LABELS,
  type CategoryId,
} from "@/lib/ib-activity-config"

const ICONS: Record<CategoryId, React.ElementType> = {
  egitim: GraduationCap,
  etkinlik: Calendar,
  spor: Trophy,
  yarisma: Award,
}

const COLORS: Record<CategoryId, string> = {
  egitim: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
  etkinlik: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
  spor: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
  yarisma: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
}

interface CategoryStepProps {
  onSelect: (category: CategoryId) => void
}

export function CategoryStep({ onSelect }: CategoryStepProps) {
  return (
    <div className="space-y-4 sm:space-y-5 pb-6 w-full">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900">Faaliyet türünü seçin</h2>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 w-full">
        {(Object.keys(CATEGORY_LABELS) as CategoryId[]).map((id) => {
          const Icon = ICONS[id]
          return (
            <Card
              key={id}
              className={`cursor-pointer border-2 transition-all active:scale-[0.98] touch-manipulation min-h-[88px] sm:min-h-0 ${COLORS[id]}`}
              onClick={() => onSelect(id)}
            >
              <CardContent className="flex items-center gap-4 p-4 sm:p-4">
                <div className="rounded-xl bg-white/80 p-3 shrink-0">
                  <Icon className="h-7 w-7 sm:h-6 sm:w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{CATEGORY_LABELS[id]}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 -ml-2 h-auto py-1.5 px-0 min-h-[44px] touch-manipulation"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect(id)
                    }}
                  >
                    Seç →
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
