"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Calendar, Trophy, Award } from "lucide-react"
import type { IbActivityType } from "@/types/ib-activity"
import { IB_ACTIVITY_TYPE_LABELS } from "@/types/ib-activity"

const TYPE_CONFIG: Record<
  IbActivityType,
  { icon: React.ElementType; color: string; description: string }
> = {
  education: {
    icon: GraduationCap,
    color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100",
    description: "Eğitim türü, müfredat ve sertifika belgeleri",
  },
  event: {
    icon: Calendar,
    color: "bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100",
    description: "Etkinlik türü, süre ve katılım belgesi",
  },
  sport: {
    icon: Trophy,
    color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
    description: "Spor türü, lisans ve sonuç belgeleri",
  },
  competition: {
    icon: Award,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
    description: "Yarışma/Proje tanımı ve sertifikalar",
  },
}

interface ActivityTypeSelectorProps {
  onSelect: (type: IbActivityType) => void
}

export function ActivityTypeSelector({ onSelect }: ActivityTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Faaliyet Ekle</h1>
        <p className="mt-1 text-gray-500">Faaliyet türünü seçin, ardından forma geçin.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(TYPE_CONFIG) as IbActivityType[]).map((type) => {
          const config = TYPE_CONFIG[type]
          const Icon = config.icon
          return (
            <Card
              key={type}
              className={`cursor-pointer border-2 transition-all duration-200 ${config.color}`}
              onClick={() => onSelect(type)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl p-3 bg-white/80">
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg">
                      {IB_ACTIVITY_TYPE_LABELS[type]}
                    </h2>
                    <p className="mt-1 text-sm opacity-90">
                      {config.description}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3 -ml-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect(type)
                      }}
                    >
                      Bu türü seç →
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
