"use client"

import { useCallback, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CalendarClock, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { staffAuthHeaders } from "@/lib/permissions/client"
import type { StudentClubAddCheck } from "@/lib/clubs/student-club-add-check"

type Pending = {
  check: StudentClubAddCheck
}

type Options = {
  clubId: string
  /** Alternatif kulübün detay sayfası bağlantısı (verilmezse bağlantı gösterilmez) */
  alternativeHref?: (clubId: string) => string
  /** Verilirse alternatif kulübe doğrudan ekleme butonu gösterilir */
  onAddToAlternative?: (studentId: string, clubId: string) => Promise<boolean>
}

/**
 * Öğrenciyi kulübe eklemeden önce program çakışmasını kontrol eder.
 * Çakışma yoksa işlem doğrudan yapılır; varsa ekleme engellenir, uyarı + alternatif kulüpler gösterilir.
 */
export function useClubAddConflictGuard({ clubId, alternativeHref, onAddToAlternative }: Options) {
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [working, setWorking] = useState(false)

  const guardAdd = useCallback(
    async (studentId: string, proceed: () => Promise<void> | void) => {
      setCheckingId(studentId)
      let check: StudentClubAddCheck | null = null
      try {
        const res = await fetch(
          `/api/clubs/${clubId}/students/check?studentId=${encodeURIComponent(studentId)}`,
          { headers: staffAuthHeaders(), cache: "no-store" }
        )
        if (res.ok) check = (await res.json()) as StudentClubAddCheck
      } catch {
        // Kontrol yapılamazsa eklemeyi engellemeyelim
      } finally {
        setCheckingId(null)
      }
      if (!check || check.conflicts.length === 0) {
        await proceed()
        return
      }
      // Çakışma varsa ekleme engellenir (sunucu da 409 ile reddeder)
      setPending({ check })
    },
    [clubId]
  )

  const close = () => {
    if (!working) setPending(null)
  }

  const run = async (fn: () => Promise<unknown> | unknown) => {
    setWorking(true)
    try {
      await fn()
      setPending(null)
    } finally {
      setWorking(false)
    }
  }

  const check = pending?.check

  const dialog = (
    <Dialog open={!!pending} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl">
        {check && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
                Ders programı çakışması
              </DialogTitle>
              <DialogDescription>
                <strong>{check.studentName}</strong>, <strong>{check.clubName}</strong> kulübünün saatinde
                başka bir programa kayıtlı. Çakışma giderilmeden öğrenci bu kulübe eklenemez.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-2">
              {check.conflicts.map((c, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                >
                  <div className="flex items-center gap-2 font-medium">
                    <CalendarClock className="h-4 w-4 shrink-0" />
                    {c.dayLabel} {c.clubTime}
                  </div>
                  <p className="mt-0.5 pl-6 text-amber-800">
                    {c.with.label} ({c.with.time})
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">Önerilen alternatif kulüpler</h3>
              <p className="text-xs text-gray-500 mb-2">
                Sınıf düzeyine uygun, kontenjanı olan ve öğrencinin programıyla çakışmayan kulüpler.
              </p>
              {check.alternatives.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-gray-500">
                  Çakışmasız uygun kulüp bulunamadı.
                </p>
              ) : (
                <div className="space-y-2">
                  {check.alternatives.map((alt) => (
                    <div
                      key={alt.clubId}
                      className="flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {alt.clubName}
                          {alt.sameSlotAsTarget && (
                            <span className="ml-2 rounded bg-teal-50 px-1.5 py-0.5 text-[11px] font-normal text-teal-700">
                              Aynı saat dilimi
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {alt.schedule.join(", ")} · {alt.memberCount}/{alt.capacity}
                          {alt.teacherName ? ` · ${alt.teacherName}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {onAddToAlternative && (
                          <Button
                            size="sm"
                            disabled={working}
                            onClick={() =>
                              void run(() => onAddToAlternative(check.studentId, alt.clubId))
                            }
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Buraya ekle
                          </Button>
                        )}
                        {alternativeHref && (
                          <Link href={alternativeHref(alt.clubId)}>
                            <Button size="sm" variant="outline">
                              Kulübe git
                              <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" disabled={working} onClick={close}>
                {working && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Kapat
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )

  return { guardAdd, checkingId, dialog }
}
