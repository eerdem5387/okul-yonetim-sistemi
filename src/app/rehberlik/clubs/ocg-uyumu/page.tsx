"use client"

import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import { ClubOcgInsightsPage } from "@/components/clubs/club-ocg-insights-page"

export default function RehberlikClubsOcgInsightsRoute() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        <ClubOcgInsightsPage basePath="/rehberlik/clubs" />
      </main>
    </div>
  )
}
