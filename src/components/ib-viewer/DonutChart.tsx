"use client"

import { useMemo } from "react"
import { IB_MAIN_TYPE_LABELS, type IbMainType } from "@/lib/ib-activity-types"

const COLORS: Record<IbMainType, string> = {
  education: "#8b5cf6",
  event: "#0ea5e9",
  sport: "#f59e0b",
  competition: "#10b981",
}

interface DonutChartProps {
  data: Record<IbMainType, number>
  size?: number
  strokeWidth?: number
}

export function DonutChart({
  data,
  size = 200,
  strokeWidth = 24,
}: DonutChartProps) {
  const total = useMemo(
    () =>
      (Object.keys(data) as IbMainType[]).reduce(
        (sum, key) => sum + (data[key] ?? 0),
        0
      ),
    [data]
  )

  const r = 50 - (strokeWidth / size) * 25
  const circumference = 2 * Math.PI * r

  const segments = useMemo(() => {
    if (total === 0) {
      return (Object.keys(data) as IbMainType[]).map((key) => ({
        key,
        value: 0,
        percent: 0,
        strokeDasharray: `0 ${circumference}`,
        strokeDashoffset: 0,
      }))
    }
    let offset = 0
    return (Object.keys(data) as IbMainType[]).map((key) => {
      const value = data[key] ?? 0
      const percent = total ? Math.round((value / total) * 100) : 0
      const segmentLength = total ? (value / total) * circumference : 0
      const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`
      const strokeDashoffset = -offset
      offset += segmentLength
      return {
        key,
        value,
        percent,
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [data, total, circumference])

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 100 100"
        className="overflow-visible"
        style={{ width: size, height: size }}
      >
        {segments.map((seg, i) => (
          <circle
            key={seg.key}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={COLORS[seg.key as IbMainType]}
            strokeWidth={strokeWidth / (size / 100)}
            strokeDasharray={seg.strokeDasharray}
            strokeDashoffset={seg.strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            className="transition-all duration-500"
          />
        ))}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {(Object.keys(COLORS) as IbMainType[]).map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: COLORS[key] }}
            />
            <span className="text-sm text-gray-600">
              {IB_MAIN_TYPE_LABELS[key]}: {data[key] ?? 0} (
              {total
                ? Math.round(((data[key] ?? 0) / total) * 100)
                : 0}
              %)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
