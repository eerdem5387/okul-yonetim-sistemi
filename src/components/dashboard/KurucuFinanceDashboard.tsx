"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
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

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value)
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
}

function dayLabel(iso: string) {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso)
  return date.toLocaleDateString("tr-TR")
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

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</h1>
          <p className="text-sm text-slate-600">
            {data?.academicYear?.name ?? "Aktif akademik yıl yok"}
          </p>
        </div>

        {loading && !data ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Yükleniyor…
          </div>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Toplam kayıt sayısı" value={String(regs?.total ?? "—")} />
          <Stat label="Yeni kayıt sayısı" value={String(regs?.newRegistrations ?? "—")} />
          <Stat label="Kayıt yenileme sayısı" value={String(regs?.renewals ?? "—")} />

          <Stat
            label="Toplam gelir"
            hint="Beklenen"
            value={finance ? money(finance.expectedIncome) : "—"}
          />
          <Stat
            label="Tahsil edilen"
            hint="Tüm kayıt tahsilatı"
            value={finance ? money(finance.collectedTotal) : "—"}
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">Tahsil edilen gelir</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Yeni kayıt</span>
                <span className="font-semibold text-slate-900">
                  {finance ? money(finance.collectedNew) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Kayıt yenileme</span>
                <span className="font-semibold text-slate-900">
                  {finance ? money(finance.collectedRenewal) : "—"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => open("expenses")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-400"
          >
            <p className="text-sm font-medium text-slate-700">Giderler</p>
            <p className="mt-1 text-xs text-slate-500">
              {finance ? monthLabel(finance.expenseMonth) : "Bu ay"}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {finance ? money(finance.expenseTotal) : "—"}
            </p>
          </button>

          <button
            type="button"
            onClick={() => open("monthly")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-400"
          >
            <p className="text-sm font-medium text-slate-700">Aylık gelir / gider tablosu</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {finance ? monthLabel(finance.selectedMonth) : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Aya dokununca geçmiş aylar açılır</p>
          </button>

          <button
            type="button"
            onClick={() => open("daily")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-slate-400"
          >
            <p className="text-sm font-medium text-slate-700">Günlük gelir / gider tablosu</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {finance ? monthLabel(finance.selectedMonth) : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Seçilen ayın günleri</p>
          </button>
        </div>

        {!data?.financeAvailable && data ? (
          <p className="text-sm text-amber-700">
            Muhasebe özeti alınamadı. Kayıt sayıları okul kaydından, tutarlar muhasebeden gelir.
          </p>
        ) : null}
        {finance && finance.collectedUnclassified > 0 ? (
          <p className="text-sm text-amber-700">
            {money(finance.collectedUnclassified)} tahsilat yeni kayıt veya yenileme olarak işaretli değil;
            toplam tahsilata dahil, iki satıra dağıtılmadı.
          </p>
        ) : null}

        {panel && finance ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            {panel !== "expenses" ? (
              <label className="mb-3 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:items-center">
                Ay
                <select
                  className="h-10 rounded-md border border-slate-300 bg-white px-2 text-slate-900"
                  value={month}
                  onChange={(event) => void load(event.target.value)}
                >
                  {finance.months.map((item) => (
                    <option key={item} value={item}>
                      {monthLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <h2 className="mb-3 text-base font-semibold text-slate-900">
                Giderler · {monthLabel(finance.expenseMonth)}
              </h2>
            )}

            {panel === "expenses" ? (
              <DataTable
                headers={["Tarih", "Açıklama", "Tutar"]}
                rows={finance.expenses.map((row) => [
                  dayLabel(row.occurredAt),
                  row.title,
                  money(row.amount),
                ])}
                empty="Bu ay gider yok."
              />
            ) : null}

            {panel === "monthly" ? (
              <>
                <p className="mb-2 text-sm text-slate-600">
                  Gelir {money(finance.ledgerIncome)} · Gider {money(finance.ledgerExpense)}
                </p>
                <DataTable
                  headers={["Tarih", "Tür", "Açıklama", "Tutar"]}
                  rows={finance.rows.map((row) => [
                    dayLabel(row.occurredAt),
                    row.side === "INCOME" ? "Gelir" : "Gider",
                    row.title,
                    money(row.amount),
                  ])}
                  empty="Bu ay kasa hareketi yok."
                />
              </>
            ) : null}

            {panel === "daily" ? (
              <DataTable
                headers={["Gün", "Gelir", "Gider"]}
                rows={finance.daily.map((row) => [
                  dayLabel(row.date),
                  money(row.income),
                  money(row.expense),
                ])}
                empty="Bu ay günlük hareket yok."
              />
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function DataTable({
  headers,
  rows,
  empty,
}: {
  headers: string[]
  rows: string[][]
  empty: string
}) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-left text-sm">
        <thead>
          <tr className="border-b text-slate-500">
            {headers.map((header) => (
              <th key={header} className="px-2 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-slate-100">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-2 text-slate-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
