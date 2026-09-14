"use client"

import { use } from "react"
import { ClubBackupDetailPage } from "@/components/clubs/club-backup-detail-page"

export default function ClubsBackupDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <ClubBackupDetailPage basePath="/clubs" backupId={id} />
}
