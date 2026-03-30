"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  GraduationCap,
  MapPin,
  Palette,
  Music,
  Lightbulb,
  Trophy,
  Swords,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import {
  MAIN_TYPE_LABELS,
  MAIN_TYPE_COLORS,
  MAIN_TYPE_ACTIVE_COLORS,
  SUBTYPES_BY_MAIN_TYPE,
  type ActivityMainType,
} from "@/lib/activity-types-config"

const MAIN_TYPE_ICONS: Record<ActivityMainType, React.ElementType> = {
  EGITIM: GraduationCap,
  GEZI: MapPin,
  GORSEL_SANATLAR: Palette,
  MUZIK: Music,
  PROJE: Lightbulb,
  SPOR: Trophy,
  TURNUVA: Swords,
}

const MAIN_TYPES: ActivityMainType[] = [
  "EGITIM",
  "GEZI",
  "GORSEL_SANATLAR",
  "MUZIK",
  "PROJE",
  "SPOR",
  "TURNUVA",
]

export interface CategoryTilesProps {
  /** Örn. /faaliyet-yonetimi/yeni — sonunda / olmamalı */
  basePath?: string
}

export function CategoryTiles({ basePath = "/faaliyet-yonetimi/yeni" }: CategoryTilesProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<ActivityMainType | null>(null)
  const prefix = basePath.replace(/\/$/, "")

  const handleMainClick = (type: ActivityMainType) => {
    const subtypes = SUBTYPES_BY_MAIN_TYPE[type]
    if (!subtypes || subtypes.length === 0) {
      return
    }
    // Tek alt tür varsa (örn: Gezi) — alt tür seçim ekranı atlanır, doğrudan forma yönlendir
    if (subtypes.length === 1) {
      router.push(`${prefix}/${type.toLowerCase()}/${subtypes[0].id}`)
      return
    }
    setExpanded(expanded === type ? null : type)
  }

  const handleSubtypeClick = (mainType: ActivityMainType, subtypeId: string) => {
    router.push(`${prefix}/${mainType.toLowerCase()}/${subtypeId}`)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        {MAIN_TYPES.map((type) => {
          const Icon = MAIN_TYPE_ICONS[type]
          const subtypes = SUBTYPES_BY_MAIN_TYPE[type] ?? []
          const hasSubtypes = subtypes.length > 0
          const isSingleDirect = subtypes.length === 1
          const isActive = expanded === type
          const colorClass = isActive ? MAIN_TYPE_ACTIVE_COLORS[type] : MAIN_TYPE_COLORS[type]

          return (
            <button
              key={type}
              onClick={() => handleMainClick(type)}
              disabled={!hasSubtypes}
              className={`
                relative flex flex-col items-center justify-center gap-2
                rounded-2xl border-2 p-4 text-center transition-all duration-200
                ${colorClass}
                ${hasSubtypes ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "opacity-40 cursor-not-allowed"}
              `}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs font-semibold leading-tight">{MAIN_TYPE_LABELS[type]}</span>
              {!hasSubtypes && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full bg-gray-200 text-gray-500 text-[9px] px-1.5 py-0.5 font-medium">
                  Yakında
                </span>
              )}
              {hasSubtypes && !isSingleDirect && (
                <span className="text-[10px] opacity-70">
                  {isActive ? <ChevronDown className="h-3 w-3 inline" /> : <ChevronRight className="h-3 w-3 inline" />}
                </span>
              )}
              {isSingleDirect && (
                <span className="text-[10px] opacity-70">
                  <ChevronRight className="h-3 w-3 inline" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Alt tür genişleme */}
      {expanded && SUBTYPES_BY_MAIN_TYPE[expanded]?.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {MAIN_TYPE_LABELS[expanded]} — Alt Tür Seçin
          </p>
          <div className="flex flex-wrap gap-2">
            {SUBTYPES_BY_MAIN_TYPE[expanded].map((subtype) => (
              <button
                key={subtype.id}
                onClick={() => handleSubtypeClick(expanded, subtype.id)}
                className="px-4 py-2 rounded-xl border-2 border-indigo-200 bg-white text-indigo-700 text-sm font-medium
                  hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-150 shadow-sm"
              >
                {subtype.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
