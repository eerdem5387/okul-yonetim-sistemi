"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BackupDetail = {
  id: string
  academicYearName: string
  updatedAt: string
  clubs: Array<{
    id: string
    name: string
    capacity: number
    members: Array<{ id: string; firstName: string; lastName: string; grade: string }>
  }>
}

export function ClubBackupDetailPage({
  basePath,
  backupId,
}: {
  basePath: "/clubs" | "/rehberlik/clubs"
  backupId: string
}) {
  const [detail, setDetail] = useState<BackupDetail | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/clubs/backups/${backupId}`)
      const data = await res.json()
      if (cancelled) return
      if (!res.ok) {
        setError(data.error || "Yedek açılamadı")
        setLoading(false)
        return
      }
      setDetail(data)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [backupId])

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`${basePath}/yedek`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Yedekler
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </p>
      ) : error || !detail ? (
        <p className="text-sm text-red-600">{error || "Yedek bulunamadı"}</p>
      ) : (
        <>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">{detail.academicYearName}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {detail.clubs.length} kulüp ·{" "}
              {detail.clubs.reduce((sum, club) => sum + club.members.length, 0)} öğrenci ·{" "}
              {new Date(detail.updatedAt).toLocaleString("tr-TR")}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {detail.clubs.map((club) => (
              <Card key={club.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {club.name}{" "}
                    <span className="font-normal text-sm text-gray-500">
                      ({club.members.length}/{club.capacity})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {club.members.length === 0 ? (
                    <p className="text-sm text-gray-500">Öğrenci yok</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-gray-700">
                      {club.members.map((member) => (
                        <li key={member.id}>
                          {member.firstName} {member.lastName}{" "}
                          <span className="text-gray-400">· {member.grade}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
