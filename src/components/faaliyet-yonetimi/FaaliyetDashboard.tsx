"use client"

import { useState, useEffect, useCallback } from "react"
import { CategoryTiles } from "./CategoryTiles"
import { FaaliyetListesi } from "./FaaliyetListesi"
import { StatsBar } from "./StatsBar"
import { Loader2 } from "lucide-react"

interface DashboardStats {
  totalEvents: number
  totalParticipants: number
  verification: {
    IMZA_SURECINDE: number
    ONAY_BEKLIYOR: number
    ONAYLANDI: number
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
  const h: HeadersInit = { "Content-Type": "application/json" }
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`
  return h
}

export function FaaliyetDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/activity-events/stats", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setStats({
          totalEvents: data.totalEvents ?? 0,
          totalParticipants: data.totalParticipants ?? 0,
          verification: {
            IMZA_SURECINDE: data.verification?.IMZA_SURECINDE ?? 0,
            ONAY_BEKLIYOR: data.verification?.ONAY_BEKLIYOR ?? 0,
            ONAYLANDI: data.verification?.ONAYLANDI ?? 0,
          },
        })
      }
    } catch {
      /* ignore */
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 px-6 py-8 text-white shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Faaliyet Yönetimi</h1>
        <p className="mt-1 text-indigo-200 text-sm">
          Öğrenci faaliyetlerini belgeleyin, onaylayın ve sertifikalandırın
        </p>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <StatsBar
          totalEvents={stats?.totalEvents ?? 0}
          totalParticipants={stats?.totalParticipants ?? 0}
          imzaSurecinde={stats?.verification.IMZA_SURECINDE ?? 0}
          onayBekliyor={stats?.verification.ONAY_BEKLIYOR ?? 0}
          onaylandi={stats?.verification.ONAYLANDI ?? 0}
        />
      )}

      {/* Yeni Faaliyet */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Yeni Faaliyet Ekle</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <CategoryTiles />
      </div>

      {/* Faaliyet Listesi */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tüm Faaliyetler</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <FaaliyetListesi />
      </div>
    </div>
  )
}
