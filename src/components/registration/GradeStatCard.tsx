type GradeStatCardProps = {
  gradeLabel: string
  total: number
  count: number
  percent: number
  countLabel: string
  className?: string
}

/** Sınıf bazlı kayıt özeti: mevcudu + sayım metinleriyle. */
export function GradeStatCard({
  gradeLabel,
  total,
  count,
  percent,
  countLabel,
  className = "",
}: GradeStatCardProps) {
  return (
    <div
      className={`p-2.5 sm:p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all ${className}`}
    >
      <p className="text-xs font-semibold text-gray-800 mb-2 truncate">{gradeLabel}</p>
      <div className="space-y-1.5">
        <div>
          <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">Mevcudu</p>
          <p className="text-sm sm:text-base font-bold text-gray-900 tabular-nums">
            {total} <span className="text-[11px] font-medium text-gray-500">kişi</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] sm:text-[11px] text-gray-500 leading-tight">{countLabel}</p>
          <p className="text-sm sm:text-base font-bold text-blue-700 tabular-nums">
            {count} <span className="text-[11px] font-medium text-blue-600/80">kişi</span>
          </p>
        </div>
      </div>
      <p className="text-[11px] sm:text-xs text-gray-500 tabular-nums mt-2">%{percent}</p>
    </div>
  )
}
