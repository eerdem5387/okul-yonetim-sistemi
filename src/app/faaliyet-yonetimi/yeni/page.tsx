"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CategoryTiles } from "@/components/faaliyet-yonetimi/CategoryTiles"

export default function YeniSertifikaFaaliyetiPage() {
  return (
    <div className="p-6 pb-12 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/faaliyet-yonetimi"
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Faaliyet Yönetimi
        </Link>
        <Link
          href="/faaliyet-ekle"
          className="inline-flex h-9 items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50"
        >
          Klasik IB faaliyet formu
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Yeni faaliyet (sertifika modülü)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ana tür ve alt tür seçerek sertifika tabanlı faaliyet oluşturun.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Tür seçimi</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <CategoryTiles />
      </div>
    </div>
  )
}
