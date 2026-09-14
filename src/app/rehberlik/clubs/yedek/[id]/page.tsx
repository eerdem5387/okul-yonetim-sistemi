"use client"

import { use } from "react"
import { ClubBackupDetailPage } from "@/components/clubs/club-backup-detail-page"

export default function RehberlikClubsBackupDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <ClubBackupDetailPage basePath="/rehberlik/clubs" backupId={id} />
}
