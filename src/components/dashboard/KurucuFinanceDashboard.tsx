"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Wallet,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { staffAuthHeaders } from "@/lib/permissions/client"

type SeriesPoint = { month: string; income: number; expense: number; net: number }

type RequestRow = {
  id: string
  title: string
  requesterName: string
  channel: string
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED"
  total: string | number | null
  notes: string | null
  founderApprovedAt: string | null
  rejectReason: string | null
  sourceCreatedAt: string | null
}

type Movement = {
  id: string
  side: string
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

type OzetPayload = {
  currentMonth: string
  current: SeriesPoint
  series: SeriesPoint[]
  pendingRequests: RequestRow[]
  recentRequests: RequestRow[]
  recentMovements: Movement[]
  requestCounts: Record<string, number>
  canApprove: boolean
}

const money = (n: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(
    n
  )

const CHANNEL_TR: Record<string, string> = {
  BANK: "Banka",
  CHECK: "Çek",
  CREDIT_CARD: "Kredi kartı",
  CASH: "Nakit",
  PROMISSORY: "Senet",
  TRANSFER: "Havale",
}

const INCOME_TR: Record<string, string> = {
  STUDENT: "Öğrenci",
  TRIP: "Gezi",
  FOOD: "Yemek",
  OTHER: "Diğer",
}

const STATUS_TR: Record<RequestRow["status"], string> = {
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  REJECTED: "Reddedildi",
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  return new Date(y, m - 1, 1).toLocaleDateString("tr-TR", { month: "short", year: "2-digit" })
}

function movementTitle(e: Movement) {
  if (e.side === "INCOME") {
    const cat = e.incomeCategory ? INCOME_TR[e.incomeCategory] ?? e.incomeCategory : "Gelir"
    const name = [e.payerFirstName, e.payerLastName].filter(Boolean).join(" ")
    return name ? `${cat} · ${name}` : cat
  }
  return e.expenseTitle || "Gider"
}

export function KurucuFinanceDashboard() {
  const [data, setData] = useState<OzetPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [staffName, setStaffName] = useState("")

  useEffect(() => {
    setStaffName(localStorage.getItem("staff_name") || "Kurucu")
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/finans/ozet", {
        headers: staffAuthHeaders(),
        cache: "no-store",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Özet yüklenemedi")
      setData(json as OzetPayload)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const maxBar = useMemo(() => {
    if (!data?.series?.length) return 1
    const peak = Math.max(
      ...data.series.flatMap((s) => [s.income, s.expense]),
      1
    )
    return peak
  }, [data])

  async function syncFromMuhasebe() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "Senkron başarısız")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Senkron hatası")
    } finally {
      setSyncing(false)
    }
  }

  async function decide(id: string, action: "approve" | "reject") {
    const reason =
      action === "reject" ? window.prompt("Red gerekçesi (opsiyonel):") ?? "" : undefined
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch("/api/finans/talepler", {
        method: "POST",
        headers: { ...staffAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((json as { error?: string }).error || "İşlem başarısız")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata")
    } finally {
      setBusyId(null)
    }
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Mali özet yükleniyor…
      </div>
    )
  }

  const current = data?.current ?? { month: "", income: 0, expense: 0, net: 0 }
  const pending = data?.pendingRequests ?? []

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-slate-100 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 p-2 shadow-lg shadow-emerald-900/20">
                <Scale className="h-5 w-5 text-white" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/70">
                Kurucu mali paneli
              </p>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Merhaba, {staffName.split(" ")[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Muhasebe sisteminden gelen para hareketleri, aylık özet ve harcama onayları.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Yenile
            </Button>
            <Button onClick={() => void syncFromMuhasebe()} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Banknote className="mr-2 h-4 w-4" />}
              Muhasebeden çek
            </Button>
            <Link
              href="/finans"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-gray-100 px-6 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-200"
            >
              Finans modülü
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label={`Gelir · ${monthLabel(current.month)}`}
            value={money(current.income)}
            icon={<ArrowUpRight className="h-4 w-4" />}
            tone="income"
          />
          <Kpi
            label={`Gider · ${monthLabel(current.month)}`}
            value={money(current.expense)}
            icon={<ArrowDownRight className="h-4 w-4" />}
            tone="expense"
          />
          <Kpi
            label="Net"
            value={money(current.net)}
            icon={<Wallet className="h-4 w-4" />}
            tone={current.net >= 0 ? "income" : "expense"}
          />
          <Kpi
            label="Onay bekleyen"
            value={String(data?.requestCounts?.PENDING ?? pending.length)}
            icon={<ShieldCheck className="h-4 w-4" />}
            tone="pending"
          />
        </div>

        {/* Chart + pending */}
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="border-0 bg-white/90 shadow-md lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Son 6 ay · gelir / gider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-52 items-end gap-2 sm:gap-3">
                {(data?.series ?? []).map((s) => (
                  <div key={s.month} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-40 w-full items-end justify-center gap-1">
                      <div
                        className="w-2.5 rounded-t-md bg-emerald-500/90 sm:w-3"
                        style={{ height: `${Math.max(4, (s.income / maxBar) * 100)}%` }}
                        title={`Gelir ${money(s.income)}`}
                      />
                      <div
                        className="w-2.5 rounded-t-md bg-rose-400/90 sm:w-3"
                        style={{ height: `${Math.max(4, (s.expense / maxBar) * 100)}%` }}
                        title={`Gider ${money(s.expense)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 sm:text-xs">
                      {monthLabel(s.month)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Gelir
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Gider
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/90 shadow-md lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Harcama onayları</CardTitle>
                <Badge variant="outline">{pending.length} bekliyor</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {pending.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  Onay bekleyen talep yok.
                </p>
              ) : (
                pending.slice(0, 6).map((r) => (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{r.title}</p>
                        <p className="text-xs text-slate-500">
                          {r.requesterName} · {CHANNEL_TR[r.channel] ?? r.channel}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-slate-800">
                        {r.total != null && r.total !== "" ? money(Number(r.total)) : "—"}
                      </p>
                    </div>
                    {r.notes ? (
                      <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.notes}</p>
                    ) : null}
                    {data?.canApprove ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-700 hover:bg-emerald-800"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, "approve")}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Onayla
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, "reject")}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reddet
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              <Link
                href="/finans/talepler"
                className="inline-flex h-9 w-full items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Tüm talepler
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Movements + recent requests */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-0 bg-white/90 shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Son para hareketleri</CardTitle>
                <Link
                  href="/finans/gelir-gider"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-gray-100"
                >
                  Detay
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.recentMovements ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">
                  Henüz muhasebeden hareket gelmemiş. “Muhasebeden çek” ile senkronize edin.
                </p>
              ) : (
                (data?.recentMovements ?? []).map((m) => {
                  const income = m.side === "INCOME"
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {movementTitle(m)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {CHANNEL_TR[m.channel] ?? m.channel}
                          {m.bankName ? ` · ${m.bankName}` : ""}
                          {m.invoiceNo ? ` · ${m.invoiceNo}` : ""} ·{" "}
                          {new Date(m.occurredAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 text-sm font-bold ${
                          income ? "text-emerald-700" : "text-rose-600"
                        }`}
                      >
                        {income ? "+" : "−"}
                        {money(Number(m.amount))}
                      </p>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/90 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Son harcama talepleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.recentRequests ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Talep kaydı yok.</p>
              ) : (
                (data?.recentRequests ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                      <p className="text-xs text-slate-500">{r.requesterName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">
                        {r.total != null && r.total !== "" ? money(Number(r.total)) : "—"}
                      </p>
                      <Badge variant="outline" className="mt-0.5 text-[10px]">
                        {STATUS_TR[r.status]}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: ReactNode
  tone: "income" | "expense" | "pending"
}) {
  const tones = {
    income: "from-emerald-700 to-teal-700",
    expense: "from-rose-600 to-orange-600",
    pending: "from-amber-600 to-yellow-600",
  }
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <CardContent className="p-0">
        <div className={`bg-gradient-to-br ${tones[tone]} p-4 text-white`}>
          <div className="mb-2 flex items-center justify-between opacity-90">
            <span className="text-xs font-medium">{label}</span>
            {icon}
          </div>
          <p className="text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
