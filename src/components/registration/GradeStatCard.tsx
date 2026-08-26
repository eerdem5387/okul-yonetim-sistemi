"use client"

import { useEffect, useId, useRef, useState } from "react"
import type { NotRenewedStudentBrief } from "@/lib/enrolled-grade-counts"

type SimpleGradeStatProps = {
  gradeLabel: string
  total: number
  count: number
  percent: number
  countLabel: string
  className?: string
  breakdown?: never
}

type RenewalGradeStatProps = {
  gradeLabel: string
  className?: string
  percent: number
  breakdown: {
    mevcut: number
    newRegistration: number
    renewed: number
    notRenewed: number
    notRenewedStudents?: NotRenewedStudentBrief[]
  }
  total?: never
  count?: never
  countLabel?: never
}

type GradeStatCardProps = SimpleGradeStatProps | RenewalGradeStatProps

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: number
  valueClassName: string
}) {
  return (
    <div>
      <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">{label}</p>
      <p className={`text-sm sm:text-base font-bold tabular-nums ${valueClassName}`}>
        {value} <span className="text-[11px] font-medium opacity-80">kişi</span>
      </p>
    </div>
  )
}

/** Sınıf bazlı kayıt özeti: basit (mevcudu + bir sayım) veya yenileme (4 satır). */
export function GradeStatCard(props: GradeStatCardProps) {
  const { gradeLabel, className = "", percent } = props
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const notRenewedStudents =
    props.breakdown?.notRenewedStudents ?? []
  const canOpenNotRenewed =
    Boolean(props.breakdown) && (props.breakdown?.notRenewed ?? 0) > 0

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null
      if (panelRef.current && target && !panelRef.current.contains(target)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("touchstart", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("touchstart", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div
      ref={panelRef}
      className={`relative p-2.5 sm:p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all ${className}`}
    >
      <p className="text-xs font-semibold text-gray-800 mb-2 truncate">{gradeLabel}</p>
      {props.breakdown ? (
        <div className="space-y-1.5">
          <Metric label="Mevcut" value={props.breakdown.mevcut} valueClassName="text-gray-900" />
          <Metric
            label="Yeni Kayıt"
            value={props.breakdown.newRegistration}
            valueClassName="text-emerald-700"
          />
          <Metric
            label="Kayıt Yenileyen"
            value={props.breakdown.renewed}
            valueClassName="text-blue-700"
          />
          <div>
            {canOpenNotRenewed ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => setOpen((v) => !v)}
                className="w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
              >
                <p className="text-[10px] sm:text-[11px] text-amber-800/80 leading-tight underline decoration-dotted underline-offset-2">
                  Kayıt Yenilemeyen
                </p>
                <p className="text-sm sm:text-base font-bold tabular-nums text-amber-700">
                  {props.breakdown.notRenewed}{" "}
                  <span className="text-[11px] font-medium opacity-80">kişi</span>
                </p>
              </button>
            ) : (
              <Metric
                label="Kayıt Yenilemeyen"
                value={props.breakdown.notRenewed}
                valueClassName="text-amber-700"
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Metric label="Mevcudu" value={props.total} valueClassName="text-gray-900" />
          <Metric label={props.countLabel} value={props.count} valueClassName="text-blue-700" />
        </div>
      )}
      <p className="text-[11px] sm:text-xs text-gray-500 tabular-nums mt-2">%{percent}</p>

      {open && props.breakdown && (
        <div
          id={listId}
          role="dialog"
          aria-label={`${gradeLabel} kayıt yenilemeyen öğrenciler`}
          className="absolute left-1/2 top-full z-30 mt-1 w-[min(18rem,calc(100vw-1.5rem))] max-h-56 -translate-x-1/2 overflow-y-auto rounded-lg border border-amber-200 bg-white p-2.5 shadow-lg"
        >
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-amber-900">
              Kayıt yenilemeyen ({notRenewedStudents.length})
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-gray-500 hover:text-gray-800"
            >
              Kapat
            </button>
          </div>
          {notRenewedStudents.length === 0 ? (
            <p className="text-[11px] text-gray-500 px-1 py-2">Liste bulunamadı.</p>
          ) : (
            <ul className="space-y-1">
              {notRenewedStudents.map((s) => (
                <li
                  key={s.id}
                  className="rounded-md bg-amber-50/70 px-2 py-1 text-[11px] leading-snug text-gray-800"
                >
                  <span className="font-medium">
                    {s.firstName} {s.lastName}
                  </span>
                  {s.tcNumber ? (
                    <span className="block text-[10px] text-gray-500 tabular-nums">
                      {s.tcNumber}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
