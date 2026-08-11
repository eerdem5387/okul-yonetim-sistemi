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

  return (
    <div
      className={`p-2.5 sm:p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50 transition-all ${className}`}
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
          <Metric
            label="Kayıt Yenilemeyen"
            value={props.breakdown.notRenewed}
            valueClassName="text-amber-700"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Metric label="Mevcudu" value={props.total} valueClassName="text-gray-900" />
          <Metric label={props.countLabel} value={props.count} valueClassName="text-blue-700" />
        </div>
      )}
      <p className="text-[11px] sm:text-xs text-gray-500 tabular-nums mt-2">%{percent}</p>
    </div>
  )
}
