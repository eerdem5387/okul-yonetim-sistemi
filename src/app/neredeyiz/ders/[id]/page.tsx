"use client"

import { useParams } from "next/navigation"
import { SubjectHistory } from "@/components/neredeyiz/weekly/SubjectHistory"

/** Rehberlik / yönetim — sınıf-ders konu geçmişi */
export default function NeredeyizDersGecmisiPage() {
  const { id } = useParams<{ id: string }>()
  return <SubjectHistory subjectId={id} />
}
