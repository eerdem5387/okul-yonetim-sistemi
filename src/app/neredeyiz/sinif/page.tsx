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
  academicYear: { name: string; isActive: boolean }
  _count: { subjects: number; schedules: number }
}

export default function SinifPlanListPage() {
  const [classes, setClasses] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/neredeyiz/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const active = classes.filter((c) => c.academicYear.isActive)
  const list = active.length > 0 ? active : classes

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sınıf yıllık ders planları</h1>
        <p className="text-sm text-gray-600">
          Önce sınıf ve ders programı, sonra bu ekranda müfredat. Tatiller okul takvimindedir.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((c) => (
          <Link key={c.id} href={`/neredeyiz/sinif/${c.id}`}>
            <Card className="hover:border-blue-400 transition-colors">
              <CardContent className="p-4">
                <p className="font-semibold">{c.name}</p>
                <p className="text-xs text-gray-500">{c.academicYear.name}</p>
                <p className="text-xs mt-2">
                  {c._count.subjects} ders kabuğu · {c._count.schedules} program satırı
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {list.length === 0 && <p className="text-sm text-gray-500">Sınıf yok.</p>}
    </div>
  )
}
