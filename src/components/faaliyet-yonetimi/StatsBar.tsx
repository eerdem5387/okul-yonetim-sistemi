"use client"

import { BarChart3, Users, CheckCircle, Clock, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsBarProps {
  totalEvents: number
  totalParticipants: number
  imzaSurecinde: number
  onayBekliyor: number
  onaylandi: number
}

export function StatsBar({
  totalEvents,
  totalParticipants,
  imzaSurecinde,
  onayBekliyor,
  onaylandi,
}: StatsBarProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Toplam Faaliyet</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{totalEvents}</p>
            </div>
            <div className="rounded-xl bg-indigo-100 p-3">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Toplam Katılımcı</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{totalParticipants}</p>
            </div>
            <div className="rounded-xl bg-blue-100 p-3">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">İmza Sürecinde</p>
              <p className="mt-1 text-3xl font-bold text-slate-600">{imzaSurecinde}</p>
              <p className="text-xs text-gray-400 mt-0.5">Belge yüklenmedi</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <FileText className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Onay Bekliyor</p>
              <p className="mt-1 text-3xl font-bold text-amber-600">{onayBekliyor}</p>
              <p className="text-xs text-gray-400 mt-0.5">İnceleme bekliyor</p>
            </div>
            <div className="rounded-xl bg-amber-100 p-3">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Onaylandı</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">{onaylandi}</p>
              <p className="text-xs text-gray-400 mt-0.5">Belgelenmiş</p>
            </div>
            <div className="rounded-xl bg-emerald-100 p-3">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
