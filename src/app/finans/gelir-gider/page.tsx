"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FinanceTabs } from "../finance-tabs"
import { staffAuthHeaders } from "@/lib/permissions/client"
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

type Entry = {
  id: string
  side: string
  yearMonth: string
  amount: string | number
  occurredAt: string
  channel: string
  bankName: string | null
  incomeCategory: string | null
  payerFirstName: string | null
  payerLastName: string | null
  expenseTitle: string | null
  invoiceNo: string | null
}

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n)

const INCOME_TR: Record<string, string> = {
  STUDENT: "Öğrenci",
  TRIP: "Gezi",
  FOOD: "Yemek",
  OTHER: "Diğer",
}

const AYLAR_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const

function parseYearMonth(value: string) {
  const [y, m] = value.split("-").map(Number)
  return { year: y || new Date().getFullYear(), month: m || 1 }
}

function formatYearMonth(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`
}

function shiftYearMonth(value: string, delta: number) {
  const { year, month } = parseYearMonth(value)
  const d = new Date(year, month - 1 + delta, 1)
  return formatYearMonth(d.getFullYear(), d.getMonth() + 1)
}

function MonthPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { year, month } = parseYearMonth(value)
  const years = useMemo(() => {
    const now = new Date().getFullYear()
    const start = Math.min(now - 4, year - 1)
    const end = Math.max(now + 1, year)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [year])

  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm ring-1 ring-slate-900/5">
      <button
        type="button"
        aria-label="Önceki ay"
        onClick={() => onChange(shiftYearMonth(value, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 px-2.5 py-1.5">
        <CalendarDays className="h-4 w-4 text-slate-500" />
        <label className="sr-only" htmlFor="finans-ay">
          Ay
        </label>
        <select
          id="finans-ay"
          value={month}
          onChange={(e) => onChange(formatYearMonth(year, Number(e.target.value)))}
          className="appearance-none bg-transparent pr-1 text-sm font-semibold text-slate-900 outline-none cursor-pointer"
        >
          {AYLAR_TR.map((ad, i) => (
            <option key={ad} value={i + 1}>
              {ad}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="finans-yil">
          Yıl
        </label>
        <select
          id="finans-yil"
          value={year}
          onChange={(e) => onChange(formatYearMonth(Number(e.target.value), month))}
          className="appearance-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        aria-label="Sonraki ay"
        onClick={() => onChange(shiftYearMonth(value, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function FinansGelirGiderPage() {
  const defaultMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [month, setMonth] = useState(defaultMonth)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [income, setIncome] = useState<Entry[]>([])
  const [expense, setExpense] = useState<Entry[]>([])
  const [incomeTotal, setIncomeTotal] = useState(0)
  const [expenseTotal, setExpenseTotal] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/finans/gelir-gider?month=${month}`, {
        headers: staffAuthHeaders(),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Yüklenemedi")
      setIncome((json as { income: Entry[] }).income ?? [])
      setExpense((json as { expense: Entry[] }).expense ?? [])
      setIncomeTotal(Number((json as { incomeTotal: number }).incomeTotal ?? 0))
      setExpenseTotal(Number((json as { expenseTotal: number }).expenseTotal ?? 0))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    void load()
  }, [load])

  function title(e: Entry) {
    if (e.side === "INCOME") {
      const cat = e.incomeCategory ? INCOME_TR[e.incomeCategory] ?? e.incomeCategory : "Gelir"
      const name = [e.payerFirstName, e.payerLastName].filter(Boolean).join(" ")
      return name ? `${cat} · ${name}` : cat
    }
    return e.expenseTitle || "Gider"
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gelir / Gider</h1>
          <p className="mt-1 text-sm text-slate-500">Muhasebe kasa defterinden gelen aylık hareketler.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <FinanceTabs />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Gelirler</span>
                  <span className="text-emerald-700">{money(incomeTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {income.map((e) => (
                  <div key={e.id} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{title(e)}</p>
                      <p className="text-xs text-slate-500">
                        {e.channel}
                        {e.bankName ? ` · ${e.bankName}` : ""} ·{" "}
                        {new Date(e.occurredAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <p className="font-semibold">{money(Number(e.amount))}</p>
                  </div>
                ))}
                {income.length === 0 ? <p className="text-sm text-slate-400">Bu ay gelir yok.</p> : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Giderler</span>
                  <span className="text-red-700">{money(expenseTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {expense.map((e) => (
                  <div key={e.id} className="flex justify-between border-b border-slate-100 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{title(e)}</p>
                      <p className="text-xs text-slate-500">
                        {e.channel}
                        {e.invoiceNo ? ` · Fatura: ${e.invoiceNo}` : ""} ·{" "}
                        {new Date(e.occurredAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <p className="font-semibold">{money(Number(e.amount))}</p>
                  </div>
                ))}
                {expense.length === 0 ? <p className="text-sm text-slate-400">Bu ay gider yok.</p> : null}
              </CardContent>
            </Card>
          </div>
          <p className="text-right text-sm font-semibold text-slate-800">
            Net: {money(incomeTotal - expenseTotal)}
          </p>
        </>
      )}
    </div>
  )
}
