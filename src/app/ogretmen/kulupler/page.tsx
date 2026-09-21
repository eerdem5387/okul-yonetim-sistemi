"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatClubGradeLevels } from "@/lib/club-grade-levels"
import { staffAuthHeaders } from "@/lib/permissions/client"

type ClubRow = {
  id: string
  name: string
  description: string | null
  capacity: number
  gradeLevels: number[]
  memberCount: number
  pendingRequestCount: number
}

export default function OgretmenKuluplerPage() {
  const [clubs, setClubs] = useState<ClubRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/clubs/instructor", {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      if (!res.ok) throw new Error("Kulüpler alınamadı")
      const data = await res.json()
      setClubs(Array.isArray(data.clubs) ? data.clubs : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kulüpler alınamadı")
      setClubs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kulüplerim</h1>
        <p className="text-sm text-gray-600 mt-1">
          Size atanmış kulüpler. Öğrenci ekleme/çıkarma talepleri onaya düşer.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-gray-500 gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Yükleniyor...
        </div>
      ) : error ? (
        <p className="text-center text-red-600 py-10">{error}</p>
      ) : clubs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500 text-sm">
            Size atanmış kulüp yok. Yönetim bir kulübe sizi sorumlu öğretmen olarak atadığında burada görünür.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.id} href={`/ogretmen/kulupler/${club.id}`}>
              <Card className="h-full hover:shadow-md transition cursor-pointer">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    {club.name}
                  </CardTitle>
                  <CardDescription>
                    {club.memberCount}/{club.capacity} öğrenci · {formatClubGradeLevels(club.gradeLevels)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {club.pendingRequestCount > 0 && (
                    <p className="text-xs font-medium text-amber-700 bg-amber-50 rounded-lg px-2 py-1 inline-block">
                      {club.pendingRequestCount} bekleyen talep
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
