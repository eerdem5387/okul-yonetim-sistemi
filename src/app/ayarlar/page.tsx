"use client"

import Link from "next/link"
import { CalendarDays, ChevronRight, School } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useMainNavigation } from "@/components/layout/sidebar"
import { NavOrderSettings } from "@/components/settings/NavOrderSettings"
import { checkNavPermission, useStaffPermissions } from "@/hooks/use-staff-permissions"

/** Personel ayarları: herkes menü düzenini görür; okul ayarları yalnızca yetkiliye. */
export default function AyarlarPage() {
  const { navigation } = useMainNavigation()
  const permState = useStaffPermissions()
  const canSchoolSettings = checkNavPermission(permState, "settings", "view", false)

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">Kişisel tercihleriniz ve okul ayarları.</p>
      </div>

      <NavOrderSettings items={navigation} />

      {canSchoolSettings ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Okul ayarları</h2>
          {[
            {
              href: "/yonetim/ayarlar",
              title: "Eğitim yılları ve dersler",
              hint: "Eğitim-öğretim yılları, dönemler, ders ve branş tanımları",
              icon: School,
            },
            {
              href: "/yonetim/akademik-takvim",
              title: "Akademik takvim",
              hint: "Tatiller ve önemli tarihler",
              icon: CalendarDays,
            },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="block">
              <Card className="transition hover:border-blue-300 hover:shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <link.icon className="h-5 w-5 text-blue-600" aria-hidden />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{link.title}</p>
                    <p className="text-sm text-slate-500">{link.hint}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
