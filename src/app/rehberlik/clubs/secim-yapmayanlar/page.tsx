"use client"

import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import { ClubUnassignedPage } from "@/components/clubs/club-unassigned-page"

export default function RehberlikClubsUnassignedRoute() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        <ClubUnassignedPage basePath="/rehberlik/clubs" />
      </main>
    </div>
  )
}
