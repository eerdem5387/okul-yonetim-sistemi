"use client"

import { RehberlikSidebar } from "@/components/layout/rehberlik-sidebar"
import { ClubMembershipApprovalsPage } from "@/components/clubs/club-membership-approvals-page"

export default function RehberlikClubsMembershipApprovalsRoute() {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <RehberlikSidebar />
      <main className="flex-1 overflow-y-auto">
        <ClubMembershipApprovalsPage basePath="/rehberlik/clubs" />
      </main>
    </div>
  )
}
