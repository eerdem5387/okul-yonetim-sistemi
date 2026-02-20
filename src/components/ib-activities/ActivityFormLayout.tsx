"use client"

import { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { PreviewPanel } from "./PreviewPanel"
import type { IbActivityFormData } from "@/types/ib-activity"

interface ActivityFormLayoutProps {
  onBack: () => void
  formData: IbActivityFormData | null
  participantNames: string[]
  children: ReactNode
}

export function ActivityFormLayout({
  onBack,
  formData,
  participantNames,
  children,
}: ActivityFormLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sol: Form */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Tür seçimine dön
        </Button>
        <div className="space-y-6 pb-8">{children}</div>
      </div>
      {/* Sağ: Önizleme */}
      <aside className="w-[360px] flex-shrink-0 hidden lg:block">
        <PreviewPanel data={formData} participantNames={participantNames} />
      </aside>
    </div>
  )
}
