"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eyebrow, PageShell, Segmented, useJson } from "@/components/neredeyiz/weekly/shared"
import { TeacherWeek } from "@/components/neredeyiz/weekly/TeacherWeek"
import { TeacherPlan } from "@/components/neredeyiz/weekly/TeacherPlan"
import { TeacherScheduleChanges } from "@/components/neredeyiz/weekly/TeacherScheduleChanges"

type Tab = "week" | "plan" | "program"

/** Öğretmen — Neredeyiz: Bu hafta · Yıllık planım · Program değişiklikleri */
export default function OgretmenNeredeyizPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("week")
  const [subjectId, setSubjectId] = useState<string | null>(null)
  const changes = useJson<{ unreadCount: number }>("/api/neredeyiz/me/schedule-changes")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (localStorage.getItem("auth_role") !== "teacher") {
      router.push("/login")
      return
    }
    const sp = new URLSearchParams(window.location.search)
    const t = sp.get("tab")
    if (t === "plan" || t === "program" || t === "week") setTab(t)
    if (sp.get("subjectId")) setSubjectId(sp.get("subjectId"))
  }, [router])

  const go = useCallback((next: Tab, sid?: string | null) => {
    setTab(next)
    if (sid !== undefined) setSubjectId(sid)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    if (sid) url.searchParams.set("subjectId", sid)
    window.history.replaceState(window.history.state, "", url.toString())
  }, [])

  const unread = changes.data?.unreadCount ?? 0

  return (
    <PageShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>NEREDEYİZ?</Eyebrow>
          <h1 className="text-[28px] font-bold tracking-tight">
            {tab === "week" ? "Bu hafta" : tab === "plan" ? "Yıllık planım" : "Program değişiklikleri"}
          </h1>
        </div>
        <Segmented<Tab>
          label="Bölüm"
          value={tab}
          onChange={(v) => go(v)}
          options={[
            { value: "week", label: "Bu hafta" },
            { value: "plan", label: "Yıllık planım" },
            { value: "program", label: unread ? `Program (${unread})` : "Program" },
          ]}
        />
      </div>

      {tab === "week" && <TeacherWeek onOpenPlan={(id) => go("plan", id)} />}
      {tab === "plan" && <TeacherPlan subjectId={subjectId} onSubjectChange={(id) => go("plan", id)} />}
      {tab === "program" && <TeacherScheduleChanges onRead={() => void changes.reload()} />}
    </PageShell>
  )
}
