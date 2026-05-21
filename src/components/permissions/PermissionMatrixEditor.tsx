"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import {
  PERMISSION_ACTION_LABELS,
  type PermissionAction,
  type PermissionMatrixModule,
} from "@/lib/permissions/matrix"

type Props = {
  matrix: PermissionMatrixModule[]
  loading?: boolean
  onToggleAction: (modIdx: number, actIdx: number) => void
  onGrantFullModule: (moduleId: string) => void
}

export function PermissionMatrixEditor({
  matrix,
  loading,
  onToggleAction,
  onGrantFullModule,
}: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, PermissionMatrixModule[]>()
    for (const m of matrix) {
      const list = map.get(m.group) ?? []
      list.push(m)
      map.set(m.group, list)
    }
    return Array.from(map.entries())
  }, [matrix])

  if (loading && matrix.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (matrix.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center">İzin matrisi yüklenemedi.</p>
    )
  }

  return (
    <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
      {groups.map(([group, modules]) => (
        <div key={group}>
          <h3 className="text-sm font-semibold text-gray-800 mb-3 sticky top-0 bg-white py-1 z-[1]">
            {group}
          </h3>
          <div className="space-y-4">
            {modules.map((mod) => {
              const globalModIdx = matrix.findIndex((m) => m.module === mod.module)
              return (
                <div
                  key={mod.module}
                  className="border rounded-lg p-3 bg-gray-50/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="font-medium text-gray-900">{mod.label}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={() => onGrantFullModule(mod.module)}
                    >
                      Modülde tam yetki
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mod.actions.map((act, actIdx) => (
                      <button
                        key={act.key}
                        type="button"
                        onClick={() => {
                          if (globalModIdx >= 0) onToggleAction(globalModIdx, actIdx)
                        }}
                        className={`px-2 py-1 rounded text-xs border transition-colors ${
                          act.granted === true
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : act.granted === false
                              ? "bg-red-50 text-red-800 border-red-200"
                              : "bg-white text-gray-600 border-gray-200"
                        }`}
                        title={
                          act.granted === null
                            ? "Tanımlı değil — kapalı"
                            : act.granted
                              ? "Açık"
                              : "Kapalı"
                        }
                      >
                        {PERMISSION_ACTION_LABELS[act.action as PermissionAction] ??
                          act.action}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
