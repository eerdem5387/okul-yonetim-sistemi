"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  ArrowLeftRight,
  CalendarDays,
  CalendarRange,
  Loader2,
  Receipt,
  RefreshCw,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react"
import { staffAuthHeaders } from "@/lib/permissions/client"

type Panel = "expenses" | "monthly" | "daily" | null

type ExpenseRow = {
  id: string
  occurredAt: string
  title: string
  amount: number
  channel: string
}

type LedgerRow = {
  id: string
  side: string
  occurredAt: string
  title: string
  amount: number
}

type Finance = {
  expectedIncome: number
  collectedTotal: number
  collectedNew: number
  collectedRenewal: number
  collectedUnclassified: number
  expenseMonth: string
  expenseTotal: number
  expenses: ExpenseRow[]
  selectedMonth: string
  ledgerIncome: number
  ledgerExpense: number
  months: string[]
  rows: LedgerRow[]
  daily: Array<{ date: string; income: number; expense: number }>
}

type Payload = {
  academicYear: { id: string; name: string } | null
  registrations: { total: number; newRegistrations: number; renewals: number }
  finance: Finance | null
  financeAvailable: boolean
}

const CHANNEL_LABEL: Record<string, string> = {
  BANK: "Banka",
  CHECK: "Çek",
  CREDIT_CARD: "Kredi kartı",
  CASH: "Nakit",
  PROMISSORY: "Senet",
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value)
}

function titleCaseTr(value: string) {
  if (!value) return value
  return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1)
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return titleCaseTr(
    new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
  )
}

function dayLabel(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return date.toLocaleDateString("tr-TR")
}

function share(part: number, total: number) {
  if (total <= 0) return null
  return Math.round((part / total) * 100)
}

export function KurucuFinanceDashboard() {
  const [data, setData] = useState<Payload | null>(null)
  const [month, setMonth] = useState("")
  const [panel, setPanel] = useState<Panel>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("Panel")

  const load = useCallback(async (nextMonth?: string) => {
    setLoading(true)
    setError(null)
    try {
      const query = nextMonth ? `?month=${nextMonth}` : ""
      const res = await fetch(`/api/finans/kurucu${query}`, {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Özet yüklenemedi")
      setData(json)
      setMonth(json.finance?.selectedMonth || nextMonth || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Özet yüklenemedi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const department = localStorage.getItem("staff_department")
    setTitle(department === "KURUCU" ? "Kurucu paneli" : "Yönetim paneli")
    void load()
  }, [load])

  function open(next: Exclude<Panel, null>) {
    setPanel((current) => (current === next ? null : next))
  }

  const finance = data?.finance
  const regs = data?.registrations
  const collectionRate = finance ? share(finance.collectedTotal, finance.expectedIncome) : null
  const newShare = regs ? share(regs.newRegistrations, regs.total) : null
  const renewalShare = regs ? share(regs.renewals, regs.total) : null
  const splitTotal = finance
    ? finance.collectedNew + finance.collectedRenewal + finance.collectedUnclassified
    : 0
  const today = titleCaseTr(
    new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
  )

  return (
    <div className="min-h-screen px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Aktif akademik yıl
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.75rem]">
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
              {data?.academicYear?.name ?? "Aktif akademik yıl yok"}
            </span>
            <span className="text-sm text-slate-500">{today}</span>
          </div>
        </header>

        {error ? (
          <Notice tone="red">{error}</Notice>
        ) : null}
        {!data?.financeAvailable && data ? (
          <Notice tone="amber">
            Muhasebe özeti alınamadı. Kayıt sayıları okul kaydından, tutarlar muhasebeden gelir.
          </Notice>
        ) : null}
        {finance && finance.collectedUnclassified > 0 ? (
          <Notice tone="amber">
            {money(finance.collectedUnclassified)} tahsilat yeni kayıt veya yenileme olarak işaretli değil.
            Toplam tahsilata dahil, iki satıra dağıtılmadı.
          </Notice>
        ) : null}

        {loading && !data ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="h-[7.5rem] animate-pulse rounded-2xl border border-white/60 bg-white/50"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              icon={<Users className="h-4 w-4" />}
              label="Toplam kayıt sayısı"
              value={regs ? String(regs.total) : "—"}
              hint="Aktif akademik yıl"
            />
            <Metric
              icon={<UserPlus className="h-4 w-4" />}
              label="Yeni kayıt sayısı"
              value={regs ? String(regs.newRegistrations) : "—"}
              hint={newShare == null ? undefined : `Pay %${newShare}`}
            />
            <Metric
              icon={<RefreshCw className="h-4 w-4" />}
              label="Kayıt yenileme sayısı"
              value={regs ? String(regs.renewals) : "—"}
              hint={renewalShare == null ? undefined : `Pay %${renewalShare}`}
            />

            <Metric
              icon={<Wallet className="h-4 w-4" />}
              label="Toplam gelir"
              value={finance ? money(finance.expectedIncome) : "—"}
              hint="Beklenen yıllık ücret"
            />
            <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-slate-500">Tahsil edilen</p>
                <IconWrap>
                  <Receipt className="h-4 w-4" />
                </IconWrap>
              </div>
              <p className="mt-3 text-[1.65rem] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
                {finance ? money(finance.collectedTotal) : "—"}
              </p>
              <p className="mt-2 text-xs text-slate-500">Tüm kayıt tahsilatı</p>
              {collectionRate != null ? (
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Tahsilat oranı</span>
                    <span className="font-medium tabular-nums text-slate-700">%{collectionRate}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${collectionRate}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-slate-500">Tahsil edilen gelir</p>
                <IconWrap>
                  <ArrowLeftRight className="h-4 w-4" />
                </IconWrap>
              </div>
              {splitTotal > 0 ? (
                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-indigo-600"
                    style={{ width: `${(finance!.collectedNew / splitTotal) * 100}%` }}
                  />
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${(finance!.collectedRenewal / splitTotal) * 100}%` }}
                  />
                  {finance!.collectedUnclassified > 0 ? (
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(finance!.collectedUnclassified / splitTotal) * 100}%` }}
                    />
                  ) : null}
                </div>
              ) : (
                <div className="mt-3 h-1.5 rounded-full bg-slate-100" />
              )}
              <dl className="mt-3 space-y-2.5">
                <SplitLine
                  swatch="bg-indigo-600"
                  label="Yeni kayıt"
                  value={finance ? money(finance.collectedNew) : "—"}
                />
                <SplitLine
                  swatch="bg-sky-500"
                  label="Kayıt yenileme"
                  value={finance ? money(finance.collectedRenewal) : "—"}
                />
              </dl>
            </div>

            <ActionCard
              active={panel === "expenses"}
              disabled={!finance}
              onClick={() => open("expenses")}
              icon={<Receipt className="h-4 w-4" />}
              label="Giderler"
              value={finance ? money(finance.expenseTotal) : "—"}
              hint={finance ? monthLabel(finance.expenseMonth) : "Bu ay"}
              action="Listeyi aç"
            />
            <ActionCard
              active={panel === "monthly"}
              disabled={!finance}
              onClick={() => open("monthly")}
              icon={<CalendarRange className="h-4 w-4" />}
              label="Aylık gelir / gider"
              value={finance ? monthLabel(finance.selectedMonth) : "—"}
              hint={
                finance ? (
                  <span className="block">
                    Gelir {money(finance.ledgerIncome)}
                    <span className="mt-0.5 block">Gider {money(finance.ledgerExpense)}</span>
                  </span>
                ) : (
                  "Ay seçmek için aç"
                )
              }
              action="Aya bak"
              compact
            />
            <ActionCard
              active={panel === "daily"}
              disabled={!finance}
              onClick={() => open("daily")}
              icon={<CalendarDays className="h-4 w-4" />}
              label="Günlük gelir / gider"
              value={finance ? monthLabel(finance.selectedMonth) : "—"}
              hint={finance ? `${finance.daily.length} gün hareket` : "Seçilen ayın günleri"}
              action="Günleri aç"
              compact
            />
          </div>
        )}

        {panel && finance ? (
          <DetailPanel
            panel={panel}
            finance={finance}
            month={month}
            loading={loading}
            onMonth={(value) => void load(value)}
            onClose={() => setPanel(null)}
          />
        ) : null}
      </div>
    </div>
  )
}

function DetailPanel({
  panel,
  finance,
  month,
  loading,
  onMonth,
  onClose,
}: {
  panel: Exclude<Panel, null>
  finance: Finance
  month: string
  loading: boolean
  onMonth: (value: string) => void
  onClose: () => void
}) {
  const heading =
    panel === "expenses"
      ? `Giderler · ${monthLabel(finance.expenseMonth)}`
      : panel === "monthly"
        ? `Aylık hareket · ${monthLabel(finance.selectedMonth)}`
        : `Günlük özet · ${monthLabel(finance.selectedMonth)}`

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {panel === "expenses"
              ? `${finance.expenses.length} kayıt`
              : panel === "monthly"
                ? `${finance.rows.length} kasa hareketi`
                : "Seçilen ayın gün dökümü"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {panel !== "expenses" ? (
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-600 sm:flex-none">
              <span className="sr-only">Ay</span>
              <select
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-52"
                value={month}
                onChange={(event) => onMonth(event.target.value)}
              >
                {finance.months.map((item) => (
                  <option key={item} value={item}>
                    {monthLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            aria-label="Tabloyu kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {panel !== "expenses" ? (
        <div className="grid grid-cols-1 gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-3">
          <MiniStat label="Gelir" value={money(finance.ledgerIncome)} tone="in" />
          <MiniStat label="Gider" value={money(finance.ledgerExpense)} tone="out" />
          <MiniStat
            label="Net"
            value={money(finance.ledgerIncome - finance.ledgerExpense)}
            tone={finance.ledgerIncome - finance.ledgerExpense >= 0 ? "in" : "out"}
          />
        </div>
      ) : null}

      <div className={`px-2 py-2 sm:px-3 sm:py-3 ${loading ? "opacity-60" : ""}`}>
        {loading ? (
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Güncelleniyor
          </div>
        ) : null}

        {panel === "expenses" ? (
          <Table
            headers={["Tarih", "Açıklama", "Kanal", "Tutar"]}
            align={["left", "left", "left", "right"]}
            empty="Bu ay gider yok."
            rows={finance.expenses.map((row) => ({
              key: row.id,
              cells: [
                dayLabel(row.occurredAt),
                row.title,
                CHANNEL_LABEL[row.channel] ?? row.channel,
                money(row.amount),
              ],
            }))}
          />
        ) : null}

        {panel === "monthly" ? (
          <Table
            headers={["Tarih", "Tür", "Açıklama", "Tutar"]}
            align={["left", "left", "left", "right"]}
            empty="Bu ay kasa hareketi yok."
            rows={finance.rows.map((row) => ({
              key: row.id,
              cells: [
                dayLabel(row.occurredAt),
                row.side === "INCOME" ? "Gelir" : "Gider",
                row.title,
                money(row.amount),
              ],
              tone: row.side === "INCOME" ? "in" : "out",
            }))}
          />
        ) : null}

        {panel === "daily" ? (
          <Table
            headers={["Gün", "Gelir", "Gider", "Net"]}
            align={["left", "right", "right", "right"]}
            empty="Bu ay günlük hareket yok."
            rows={finance.daily.map((row) => ({
              key: row.date,
              cells: [
                dayLabel(row.date),
                money(row.income),
                money(row.expense),
                money(row.income - row.expense),
              ],
              tone: row.income - row.expense >= 0 ? "in" : "out",
            }))}
          />
        ) : null}
      </div>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <IconWrap>{icon}</IconWrap>
      </div>
      <p className="mt-3 text-[1.65rem] font-semibold leading-none tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : <p className="mt-2 h-4" />}
    </div>
  )
}

function ActionCard({
  active,
  disabled,
  onClick,
  icon,
  label,
  value,
  hint,
  action,
  compact,
}: {
  active: boolean
  disabled: boolean
  onClick: () => void
  icon: ReactNode
  label: string
  value: string
  hint: ReactNode
  action: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-expanded={active}
      onClick={onClick}
      className={`flex h-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm shadow-slate-200/60 transition disabled:cursor-default ${
        active
          ? "border-indigo-300 ring-2 ring-indigo-100"
          : "border-slate-200/80 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <IconWrap active={active}>{icon}</IconWrap>
      </div>
      <p
        className={`mt-3 font-semibold leading-none tracking-tight text-slate-900 tabular-nums ${
          compact ? "text-xl" : "text-[1.65rem]"
        }`}
      >
        {value}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="min-w-0 text-xs leading-snug text-slate-500">{hint}</p>
        <span className={`shrink-0 text-xs font-medium ${active ? "text-indigo-700" : "text-slate-400"}`}>
          {active ? "Kapat" : action}
        </span>
      </div>
    </button>
  )
}

function SplitLine({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-slate-500">
        <span className={`h-2 w-2 rounded-full ${swatch}`} />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "in" | "out" }) {
  return (
    <div className="bg-white px-4 py-3 sm:px-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "in" ? "text-emerald-700" : "text-rose-700"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function IconWrap({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        active ? "bg-indigo-50 text-indigo-700" : "bg-slate-50 text-slate-500"
      }`}
    >
      {children}
    </span>
  )
}

function Notice({ children, tone }: { children: ReactNode; tone: "amber" | "red" }) {
  const styles =
    tone === "red"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-900"
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${styles}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}

function Table({
  headers,
  rows,
  align,
  empty,
}: {
  headers: string[]
  rows: Array<{ key: string; cells: string[]; tone?: "in" | "out" }>
  align: Array<"left" | "right">
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="px-3 py-8 text-center text-sm text-slate-500">{empty}</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-sm">
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th
                key={header}
                className={`border-b border-slate-100 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${
                  align[index] === "right" ? "text-right" : "text-left"
                }`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50/80">
              {row.cells.map((cell, index) => {
                const isKind = headers[index] === "Tür"
                const isMoney = align[index] === "right"
                return (
                  <td
                    key={`${row.key}-${index}`}
                    className={`border-b border-slate-50 px-3 py-2.5 text-slate-800 ${
                      isMoney ? "text-right font-medium tabular-nums" : ""
                    } ${isMoney && row.tone === "out" ? "text-rose-700" : ""} ${
                      isMoney && row.tone === "in" ? "text-emerald-700" : ""
                    }`}
                  >
                    {isKind ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          cell === "Gelir"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
