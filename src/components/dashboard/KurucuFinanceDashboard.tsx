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

type Panel = "collected" | "expenses" | "monthly" | "daily" | null

type IncomeDetail = {
  id: string
  category: string
  title: string
  occurredAt: string
  amount: number
  channel: string | null
  channelLabel: string
}

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
  channel?: string | null
  channelLabel?: string | null
  tag?: "PLANNED" | "CREDITED" | null
}

type Finance = {
  tenantName?: string | null
  expectedIncome: number
  collectedTotal: number
  collectedNew: number
  collectedRenewal: number
  collectedUnclassified: number
  incomeCategories?: Array<{ name: string; amount: number }>
  incomeDetails?: IncomeDetail[]
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

const INCOME_SWATCHES = [
  "bg-indigo-600",
  "bg-sky-500",
  "bg-emerald-600",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-slate-500",
]

function incomeLines(finance: Finance) {
  if (finance.incomeCategories?.length) return finance.incomeCategories
  const lines = [
    { name: "Yeni kayıt", amount: finance.collectedNew },
    { name: "Kayıt yenileme", amount: finance.collectedRenewal },
  ]
  if (finance.collectedUnclassified > 0) {
    lines.push({ name: "Diğer kayıt", amount: finance.collectedUnclassified })
  }
  return lines
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

function moneyExact(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function monthUpper(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  const name = new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long" })
  return `${name.toLocaleUpperCase("tr-TR")}-${y}`
}

function reportDate(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function channelText(row: LedgerRow) {
  if (row.channelLabel) return row.channelLabel
  if (row.channel) return CHANNEL_LABEL[row.channel] ?? row.channel
  return "—"
}

function bookedTotal(rows: LedgerRow[]) {
  return rows.filter((row) => row.tag !== "PLANNED").reduce((sum, row) => sum + row.amount, 0)
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
  const collectedLines = finance ? incomeLines(finance) : []
  const splitTotal = collectedLines.reduce((sum, line) => sum + line.amount, 0)
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
        {finance && finance.collectedUnclassified > 0 && !finance.incomeCategories ? (
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
              hint="Bu yıl kaydı olan öğrenciler"
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

            <button
              type="button"
              disabled={!finance}
              aria-expanded={panel === "collected"}
              onClick={() => open("collected")}
              className={`flex h-full flex-col rounded-2xl border bg-white p-4 text-left shadow-sm shadow-slate-200/60 transition disabled:cursor-default ${
                panel === "collected"
                  ? "border-indigo-300 ring-2 ring-indigo-100"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-slate-500">Tahsil edilen gelir</p>
                <IconWrap active={panel === "collected"}>
                  <ArrowLeftRight className="h-4 w-4" />
                </IconWrap>
              </div>
              {splitTotal > 0 ? (
                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-slate-100">
                  {collectedLines.map((line, index) =>
                    line.amount > 0 ? (
                      <div
                        key={line.name}
                        className={`h-full ${INCOME_SWATCHES[index % INCOME_SWATCHES.length]}`}
                        style={{ width: `${(line.amount / splitTotal) * 100}%` }}
                      />
                    ) : null
                  )}
                </div>
              ) : (
                <div className="mt-3 h-1.5 rounded-full bg-slate-100" />
              )}
              <dl className="mt-3 space-y-2.5">
                {collectedLines.map((line, index) => (
                  <SplitLine
                    key={line.name}
                    swatch={INCOME_SWATCHES[index % INCOME_SWATCHES.length]}
                    label={line.name}
                    value={money(line.amount)}
                  />
                ))}
                {!finance ? (
                  <>
                    <SplitLine swatch="bg-indigo-600" label="Yeni kayıt" value="—" />
                    <SplitLine swatch="bg-sky-500" label="Kayıt yenileme" value="—" />
                  </>
                ) : null}
              </dl>
              <p className={`mt-3 text-xs font-medium ${panel === "collected" ? "text-indigo-700" : "text-slate-400"}`}>
                {panel === "collected" ? "Kapat" : "Detayı aç"}
              </p>
            </button>

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
                    Gelir {money(bookedTotal(finance.rows.filter((row) => row.side === "INCOME")))}
                    <span className="mt-0.5 block">
                      Gider {money(bookedTotal(finance.rows.filter((row) => row.side === "EXPENSE")))}
                    </span>
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
  if (panel === "collected") {
    const details = finance.incomeDetails ?? []
    const groups = incomeLines(finance).map((line) => ({
      ...line,
      rows: details.filter((row) => row.category === line.name),
    }))
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Tahsil edilen gelir</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {finance.academicYear || "Aktif akademik yıl"}
              {details.length ? ` · ${details.length} tahsilat` : ""}
            </p>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        <div className="divide-y divide-slate-100">
          {groups.map((group, index) => (
            <div key={group.name} className="px-4 py-4 sm:px-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <span className={`h-2 w-2 rounded-full ${INCOME_SWATCHES[index % INCOME_SWATCHES.length]}`} />
                  {group.name}
                </p>
                <p className="text-sm font-semibold tabular-nums text-slate-900">{moneyExact(group.amount)}</p>
              </div>
              {group.rows.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-2 py-2">Tarih</th>
                        <th className="px-2 py-2">Açıklama</th>
                        <th className="px-2 py-2">Kanal</th>
                        <th className="px-2 py-2 text-right">Tutar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.id} className="border-b border-slate-50">
                          <td className="whitespace-nowrap px-2 py-2 text-slate-500">{reportDate(row.occurredAt)}</td>
                          <td className="px-2 py-2 text-slate-800">{row.title}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-slate-600">
                            {row.channelLabel || "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums text-slate-900">
                            {moneyExact(row.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : group.amount === 0 ? (
                <p className="text-sm text-slate-400">Bu kalemde tahsilat yok.</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (panel === "monthly") {
    return (
      <div className={loading ? "opacity-70" : ""}>
        <div className="mb-3 flex items-center justify-end gap-2">
          {loading ? (
            <span className="mr-auto inline-flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Güncelleniyor
            </span>
          ) : null}
          <MonthSelect month={month} months={finance.months} onMonth={onMonth} />
          <CloseButton onClose={onClose} />
        </div>
        <MonthlyStatement finance={finance} />
      </div>
    )
  }

  const heading =
    panel === "expenses"
      ? `Giderler · ${monthLabel(finance.expenseMonth)}`
      : `Günlük özet · ${monthLabel(finance.selectedMonth)}`
  const dailyIncome = finance.daily.reduce((sum, row) => sum + row.income, 0)
  const dailyExpense = finance.daily.reduce((sum, row) => sum + row.expense, 0)

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/70">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {panel === "expenses" ? `${finance.expenses.length} kayıt` : "Seçilen ayın gün dökümü"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {panel === "daily" ? (
            <MonthSelect month={month} months={finance.months} onMonth={onMonth} />
          ) : null}
          <CloseButton onClose={onClose} />
        </div>
      </div>

      {panel === "daily" ? (
        <div className="grid grid-cols-1 gap-px border-b border-slate-100 bg-slate-100 sm:grid-cols-3">
          <MiniStat label="Gelir" value={money(dailyIncome)} tone="in" />
          <MiniStat label="Gider" value={money(dailyExpense)} tone="out" />
          <MiniStat
            label="Net"
            value={money(dailyIncome - dailyExpense)}
            tone={dailyIncome - dailyExpense >= 0 ? "in" : "out"}
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

function MonthSelect({
  month,
  months,
  onMonth,
}: {
  month: string
  months: string[]
  onMonth: (value: string) => void
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-600 sm:flex-none">
      <span className="sr-only">Ay</span>
      <select
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-52"
        value={month}
        onChange={(event) => onMonth(event.target.value)}
      >
        {months.map((item) => (
          <option key={item} value={item}>
            {monthLabel(item)}
          </option>
        ))}
      </select>
    </label>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      aria-label="Tabloyu kapat"
    >
      <X className="h-4 w-4" />
    </button>
  )
}

function MonthlyStatement({ finance }: { finance: Finance }) {
  const incomeRows = finance.rows.filter((row) => row.side === "INCOME")
  const expenseRows = finance.rows.filter((row) => row.side === "EXPENSE")
  const incomeBooked = bookedTotal(incomeRows)
  const incomePlanned = incomeRows
    .filter((row) => row.tag === "PLANNED")
    .reduce((sum, row) => sum + row.amount, 0)
  const expenseBooked = bookedTotal(expenseRows)
  const net = incomeBooked - expenseBooked

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b-2 border-slate-800 px-4 py-4 text-center">
        {finance.tenantName ? (
          <p className="text-sm font-semibold tracking-wide text-slate-500">{finance.tenantName}</p>
        ) : null}
        <h2 className="mt-1 text-base font-bold uppercase tracking-wide text-slate-900 sm:text-xl">
          {monthUpper(finance.selectedMonth)} tarihli gelir gider ödeme özet tablosu
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <StatementColumn
          title="Gelirler"
          empty="Bu ay gelir yok."
          totalLabel="Toplam gelir (hesaba geçen)"
          rows={incomeRows}
          total={incomeBooked}
          planned={incomePlanned}
          divider
        />
        <StatementColumn
          title="Giderler"
          empty="Bu ay gider yok."
          totalLabel="Toplam gider"
          rows={expenseRows}
          total={expenseBooked}
        />
      </div>

      <div
        className={`border-t-[3px] border-slate-800 px-4 py-3 text-right text-sm font-semibold ${
          net >= 0 ? "text-emerald-700" : "text-red-700"
        }`}
      >
        Net (hesaba geçen gelir − gider): {moneyExact(net)}
        {incomePlanned > 0 ? (
          <span className="mt-1 block text-xs font-medium text-amber-800">
            + Planlanmış gelir: {moneyExact(incomePlanned)}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function StatementColumn({
  title,
  empty,
  totalLabel,
  rows,
  total,
  planned = 0,
  divider = false,
}: {
  title: string
  empty: string
  totalLabel: string
  rows: LedgerRow[]
  total: number
  planned?: number
  divider?: boolean
}) {
  return (
    <section
      className={`border-b-[3px] border-slate-800 lg:border-b-0 ${
        divider ? "lg:border-r-[3px]" : ""
      }`}
    >
      <div className="border-b-2 border-slate-800 bg-white px-4 py-3">
        <h3 className="text-base font-bold uppercase tracking-wide text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse">
          <thead className="bg-slate-100">
            <tr className="border-b-2 border-slate-400">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                Açıklama
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                Kanal
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                Tutar
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                Tarih
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-300 bg-white align-top">
                <td className="px-4 py-2.5 text-sm font-medium text-slate-800">
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="whitespace-normal break-words">{row.title}</span>
                    {row.tag === "PLANNED" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Planlanmış
                      </span>
                    ) : null}
                    {row.tag === "CREDITED" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Hesaba geçti
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-600">{channelText(row)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm font-medium tabular-nums text-slate-800">
                  {moneyExact(row.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 text-sm text-slate-500">
                  {reportDate(row.occurredAt)}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-sm text-slate-400" colSpan={4}>
                  {empty}
                </td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t-[3px] border-slate-800 bg-slate-100 font-semibold">
              <td className="px-4 py-3 text-sm text-slate-800" colSpan={2}>
                {totalLabel}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-slate-900">
                {moneyExact(total)}
              </td>
              <td />
            </tr>
            {planned > 0 ? (
              <tr className="bg-amber-50/80 text-sm font-medium text-amber-900">
                <td className="px-4 py-3" colSpan={2}>
                  Planlanmış (henüz hesaba geçmedi)
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{moneyExact(planned)}</td>
                <td />
              </tr>
            ) : null}
          </tfoot>
        </table>
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
