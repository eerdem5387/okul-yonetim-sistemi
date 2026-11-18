"use client"

import { useTeacherNavigation } from "@/components/layout/ogretmen-sidebar"
import { NavOrderSettings } from "@/components/settings/NavOrderSettings"

/** Öğretmen ayarları: menü düzeni. */
export default function OgretmenAyarlarPage() {
  const navigation = useTeacherNavigation()
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
        <p className="mt-1 text-sm text-slate-500">Kişisel tercihleriniz.</p>
      </div>
      <NavOrderSettings items={navigation} />
    </div>
  )
}
