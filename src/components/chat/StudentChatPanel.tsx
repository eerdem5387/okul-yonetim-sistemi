"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAuthHeaders } from "./chat-utils"

type Row = {
  id: string
  type: string
  title: string
  className: string | null
  updatedAt: string
  preview: string
}

export function StudentChatPanel({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/chat/students/${studentId}`, { headers: getAuthHeaders(), cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || "Yazışmalar alınamadı")
        if (!cancelled) setRows(json.conversations || [])
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Yazışmalar alınamadı")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [studentId])

  if (loading) return <p className="text-sm text-gray-500">Yükleniyor…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (rows.length === 0) return <p className="text-sm text-gray-500">Bu öğrenciye bağlı yazışma yok.</p>

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium text-gray-900">{row.title}</p>
            <Link href={`/mesajlar?c=${row.id}`} className="text-sm text-blue-700 hover:underline">
              Yazışmayı aç
            </Link>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {row.type === "ANNOUNCEMENT" ? "Duyuru" : row.type === "GROUP" ? "Grup" : "Veli yazışması"}
            {row.className ? ` · ${row.className}` : ""}
            {" · "}
            {new Date(row.updatedAt).toLocaleDateString("tr-TR")}
          </p>
          {row.preview ? <p className="mt-2 line-clamp-2 text-sm text-gray-700">{row.preview}</p> : null}
        </li>
      ))}
    </ul>
  )
}
