"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

type Row = {
  id: string
  name: string
  grade: number
  section: string
  academicYear: { id: string; name: string; isActive: boolean }
  counselor: { firstName: string; lastName: string } | null
  topicCount: number
  _count: { subjects: number; schedules: number }
}
type Year = { id: string; name: string; isActive: boolean }

export default function SinifPlanListPage() {
  const [classes, setClasses] = useState<Row[]>([])
  const [years, setYears] = useState<Year[]>([])
  const [yearId, setYearId] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/neredeyiz/academic-years")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Year[]) => setYears(Array.isArray(d) ? d : []))
      .catch(() => setYears([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/neredeyiz/classes${yearId ? `?academicYearId=${yearId}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        setClasses(d.classes || [])
        if (!yearId && d.academicYearId) setYearId(d.academicYearId)
      })
      .finally(() => setLoading(false))
  }, [yearId])

  const selectedYear = years.find((y) => y.id === yearId)

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Sınıf yıllık ders planları</h1>
          <p className="text-sm text-gray-600">
            Dersler ders programından gelir; burada her dersin ünite ve konu planı yapılır. Tatiller okul takvimindedir.
          </p>
        </div>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">Akademik yıl</span>
          <select
            className="h-10 border rounded-md px-2 text-sm"
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
          >
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
                {y.isActive ? " (aktif)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedYear && !selectedYear.isActive && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Arşiv: {selectedYear.name} planlarını görüntülüyorsunuz.
        </p>
      )}

      {loading ? (
        <div className="p-6 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {classes.map((c) => (
              <Link key={c.id} href={`/neredeyiz/sinif/${c.id}`}>
                <Card className="hover:border-blue-400 transition-colors">
                  <CardContent className="p-4">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {c.counselor ? `Rehber: ${c.counselor.firstName} ${c.counselor.lastName}` : "Rehber atanmamış"}
                    </p>
                    <p className="text-xs mt-2">
                      {c._count.subjects} ders · {c.topicCount} konu · {c._count.schedules} program satırı
                    </p>
                    {c._count.schedules > 0 && c._count.subjects === 0 && (
                      <p className="text-xs mt-1 text-amber-700">Ders programı var ama derslere bağlanmamış.</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          {classes.length === 0 && <p className="text-sm text-gray-500">Bu yılda sınıf yok.</p>}
        </>
      )}
    </div>
  )
}
